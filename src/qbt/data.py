"""Marktdaten: Download von Yahoo Finance, lokaler Cache, CSV-Import und Datenprüfung.

Alle Preise werden auf Dividenden und Splits bereinigt (OHLC mit dem Faktor Adj Close / Close),
damit Renditen und Indikatoren über Ausschüttungen hinweg konsistent sind.
"""

from __future__ import annotations

import json
import logging
import os
import ssl
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

OHLCV = ["open", "high", "low", "close", "volume"]
YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
DEFAULT_CACHE = Path(os.environ.get("QBT_CACHE", "data_cache"))


@dataclass
class Panel:
    """Kursdaten mehrerer Werte auf einem gemeinsamen Handelskalender.

    Jedes Feld ist ein DataFrame mit Datum als Index und Symbolen als Spalten. Tage, an denen ein
    Wert nicht gehandelt wurde, sind NaN; die Engine handelt an solchen Tagen nicht.
    """

    open: pd.DataFrame
    high: pd.DataFrame
    low: pd.DataFrame
    close: pd.DataFrame
    volume: pd.DataFrame
    currency: dict[str, str] = field(default_factory=dict)

    @property
    def symbols(self) -> list[str]:
        return list(self.close.columns)

    @property
    def index(self) -> pd.DatetimeIndex:
        return self.close.index

    def slice(self, start=None, end=None) -> Panel:
        sl = slice(start, end)
        return Panel(
            *(getattr(self, f).loc[sl] for f in OHLCV), currency=dict(self.currency)
        )

    def select(self, symbols: list[str]) -> Panel:
        return Panel(*(getattr(self, f)[symbols] for f in OHLCV), currency=dict(self.currency))

    @classmethod
    def from_frames(cls, frames: dict[str, pd.DataFrame], currency: dict[str, str] | None = None) -> Panel:
        """Baut ein Panel aus einzelnen OHLCV-DataFrames (Spalten: open, high, low, close, volume)."""
        if not frames:
            raise ValueError("Keine Kursdaten übergeben.")
        idx = sorted(set().union(*(f.index for f in frames.values())))
        idx = pd.DatetimeIndex(idx, name="date")
        cols = {}
        for fld in OHLCV:
            cols[fld] = pd.DataFrame(
                {s: f[fld].reindex(idx) if fld in f else np.nan for s, f in frames.items()}, index=idx
            )
        return cls(**cols, currency=currency or {})


# ----------------------------------------------------------------------------- download

def _http_get_json(url: str, retries: int = 4) -> dict:
    ctx = ssl.create_default_context()
    bundle = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
    if bundle and Path(bundle).exists():
        ctx.load_verify_locations(bundle)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (qbt)"})
    delay = 1.0
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
                return json.load(r)
        except Exception as exc:  # noqa: BLE001 - network errors vary by platform
            if attempt == retries - 1:
                raise RuntimeError(f"Download fehlgeschlagen: {url}: {exc}") from exc
            time.sleep(delay)
            delay *= 2
    raise AssertionError("unreachable")


def download_yahoo(symbol: str, start: str = "1990-01-01", end: str | None = None) -> tuple[pd.DataFrame, str]:
    """Lädt Tageskurse (OHLCV, bereinigt) von Yahoo Finance. Gibt (DataFrame, Währung) zurück."""
    p1 = int(pd.Timestamp(start, tz="UTC").timestamp())
    p2 = int((pd.Timestamp(end, tz="UTC") if end else pd.Timestamp.now(tz="UTC")).timestamp()) + 86400
    q = urllib.parse.urlencode({"period1": p1, "period2": p2, "interval": "1d", "events": "div,splits"})
    js = _http_get_json(YAHOO_URL.format(symbol=urllib.parse.quote(symbol)) + "?" + q)
    res = (js.get("chart") or {}).get("result")
    if not res:
        err = (js.get("chart") or {}).get("error")
        raise RuntimeError(f"Yahoo lieferte keine Daten für {symbol}: {err}")
    r = res[0]
    meta = r.get("meta", {})
    q0 = r["indicators"]["quote"][0]
    adj = r["indicators"].get("adjclose", [{}])[0].get("adjclose")
    offset = meta.get("gmtoffset", 0)
    idx = pd.to_datetime(np.asarray(r["timestamp"]) + offset, unit="s").normalize()
    df = pd.DataFrame({k: q0.get(k) for k in OHLCV}, index=idx, dtype=float)
    if adj is not None:
        factor = pd.Series(adj, index=idx, dtype=float) / df["close"]
        for k in ("open", "high", "low", "close"):
            df[k] = df[k] * factor
    df = df.dropna(subset=["close"])
    df = df[~df.index.duplicated(keep="last")].sort_index()
    df.index.name = "date"
    return df, meta.get("currency", "")


def load(
    symbols: list[str] | str,
    start: str | None = None,
    end: str | None = None,
    cache_dir: Path | str = DEFAULT_CACHE,
    refresh: bool = False,
    max_age_hours: float = 12,
) -> Panel:
    """Lädt mehrere Symbole (aus dem Cache oder von Yahoo) und gibt ein geprüftes Panel zurück."""
    if isinstance(symbols, str):
        symbols = [symbols]
    cache = Path(cache_dir)
    cache.mkdir(parents=True, exist_ok=True)
    frames, cur = {}, {}
    for sym in symbols:
        f = cache / f"{sym.replace('^', '_')}.csv"
        meta_f = f.with_suffix(".json")
        fresh = f.exists() and (time.time() - f.stat().st_mtime) < max_age_hours * 3600
        if fresh and not refresh:
            df = pd.read_csv(f, index_col="date", parse_dates=True)
            cur[sym] = json.loads(meta_f.read_text()).get("currency", "") if meta_f.exists() else ""
        else:
            log.info("Lade %s von Yahoo Finance", sym)
            df, cur[sym] = download_yahoo(sym)
            df.to_csv(f)
            meta_f.write_text(json.dumps({"currency": cur[sym], "source": "yahoo"}))
        frames[sym] = df
    panel = Panel.from_frames(frames, cur).slice(start, end)
    for issue in validate(panel):
        log.warning(issue)
    return panel


def read_csv(path: str | Path, symbol: str | None = None) -> pd.DataFrame:
    """Liest eine CSV-Datei mit Tageskursen (Yahoo-, Stooq- oder Broker-Export).

    Erkannt werden Spalten wie Date/Datum, Open/Eröffnung, High/Hoch, Low/Tief, Close/Schluss,
    Adj Close und Volume/Volumen. Fehlen Open/High/Low, werden sie mit dem Schlusskurs gefüllt.
    """
    path = Path(path)
    raw = pd.read_csv(path, sep=None, engine="python", decimal=",") if _looks_german(path) else \
        pd.read_csv(path, sep=None, engine="python")
    cols = {c: c.strip().lower() for c in raw.columns}
    raw = raw.rename(columns=cols)

    def pick(*names):
        for n in names:
            for c in raw.columns:
                if c == n or c.startswith(n):
                    return c
        return None

    dcol = pick("date", "datum", "time")
    ccol = pick("close", "schluss", "schlusskurs", "kurs", "price", "last")
    acol = pick("adj close", "adj_close", "adjclose")
    if dcol is None or ccol is None:
        raise ValueError(f"{path.name}: Spalten für Datum und Schlusskurs nicht gefunden: {list(raw.columns)}")
    idx = pd.to_datetime(raw[dcol], dayfirst=_looks_german(path), errors="coerce")
    df = pd.DataFrame(index=idx)
    df["close"] = pd.to_numeric(raw[ccol].values, errors="coerce")
    for fld, names in {"open": ("open", "eröffnung", "erster"), "high": ("high", "hoch"),
                       "low": ("low", "tief"), "volume": ("volume", "volumen", "stück")}.items():
        c = pick(*names)
        df[fld] = pd.to_numeric(raw[c].values, errors="coerce") if c else np.nan
    if acol is not None:
        factor = pd.to_numeric(raw[acol].values, errors="coerce") / df["close"].values
        for k in ("open", "high", "low", "close"):
            df[k] = df[k] * factor
    for k in ("open", "high", "low"):
        df[k] = df[k].fillna(df["close"])
    df = df[df.index.notna()].dropna(subset=["close"]).sort_index()
    df = df[~df.index.duplicated(keep="last")]
    df.index.name = "date"
    return df[OHLCV]


def _looks_german(path: Path) -> bool:
    head = path.read_text(encoding="utf-8", errors="ignore")[:2000]
    return head.count(";") > head.count(",") / 2 and ";" in head


def validate(panel: Panel, max_daily_move: float = 0.5) -> list[str]:
    """Prüft Kursdaten auf typische Fehler und gibt eine Liste von Hinweisen zurück."""
    issues = []
    for s in panel.symbols:
        c, h, l, o = panel.close[s], panel.high[s], panel.low[s], panel.open[s]
        valid = c.dropna()
        if valid.empty:
            issues.append(f"{s}: keine Kurse im Zeitraum")
            continue
        if (valid <= 0).any():
            issues.append(f"{s}: {int((valid <= 0).sum())} Kurse sind null oder negativ")
        bad_hl = ((h < l) | (c > h * 1.0001) | (c < l * 0.9999) | (o > h * 1.0001) | (o < l * 0.9999)).sum()
        if bad_hl:
            issues.append(f"{s}: {int(bad_hl)} Tage mit inkonsistentem Hoch/Tief")
        r = valid.pct_change().abs()
        jumps = r[r > max_daily_move]
        if len(jumps):
            issues.append(f"{s}: {len(jumps)} Tagesbewegungen über {max_daily_move:.0%}, "
                          f"z. B. am {jumps.index[0].date()} (Split nicht bereinigt?)")
        gaps = valid.index.to_series().diff().dt.days
        if (gaps > 10).any():
            issues.append(f"{s}: Datenlücke von {int(gaps.max())} Tagen vor {gaps.idxmax().date()}")
    return issues


def synthetic(
    symbols: list[str] | int = 3,
    days: int = 1500,
    seed: int = 7,
    drift: float = 0.07,
    vol: float = 0.2,
    start: str = "2015-01-02",
) -> Panel:
    """Erzeugt reproduzierbare Zufallskurse (geometrische Brownsche Bewegung) für Tests und Demos."""
    rng = np.random.default_rng(seed)
    if isinstance(symbols, int):
        symbols = [f"SYN{i}" for i in range(symbols)]
    idx = pd.bdate_range(start, periods=days, name="date")
    frames = {}
    for s in symbols:
        r = rng.normal(drift / 252 - 0.5 * (vol**2) / 252, vol / np.sqrt(252), days)
        close = 100 * np.exp(np.cumsum(r))
        gap = rng.normal(0, vol / np.sqrt(252) / 3, days)
        open_ = np.r_[100, close[:-1]] * np.exp(gap)
        hi = np.maximum(open_, close) * np.exp(np.abs(rng.normal(0, vol / np.sqrt(252) / 2, days)))
        lo = np.minimum(open_, close) * np.exp(-np.abs(rng.normal(0, vol / np.sqrt(252) / 2, days)))
        frames[s] = pd.DataFrame(
            {"open": open_, "high": hi, "low": lo, "close": close, "volume": rng.integers(1e5, 1e6, days)},
            index=idx,
        )
    return Panel.from_frames(frames, {s: "USD" for s in symbols})
