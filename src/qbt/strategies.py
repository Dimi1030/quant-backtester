"""Handelsstrategien.

Eine Strategie liefert pro Tag und Symbol ein Signal zwischen -1 (short) und +1 (long), berechnet
ausschließlich mit Daten bis zum Schlusskurs dieses Tages. Wie groß die Position wird, entscheidet
der Sizer (siehe `sizing.py`); wann und zu welchem Preis gehandelt wird, entscheidet die Engine.
"""

from __future__ import annotations

from itertools import product
from typing import Any, ClassVar

import numpy as np
import pandas as pd

from . import indicators as ind
from .data import Panel


def hold_state(enter: pd.DataFrame, exit_: pd.DataFrame,
               enter_short: pd.DataFrame | None = None, exit_short: pd.DataFrame | None = None) -> pd.DataFrame:
    """Wandelt Einstiegs- und Ausstiegsereignisse in einen gehaltenen Zustand (1, 0, -1) um."""
    ev = pd.DataFrame(np.nan, index=enter.index, columns=enter.columns)
    ev = ev.mask(exit_.fillna(False).astype(bool), 0.0)
    if exit_short is not None:
        ev = ev.mask(exit_short.fillna(False).astype(bool) & ev.isna(), 0.0)
    ev = ev.mask(enter.fillna(False).astype(bool), 1.0)
    if enter_short is not None:
        ev = ev.mask(enter_short.fillna(False).astype(bool), -1.0)
    # Ein Long-Ausstieg darf keinen Short schließen und umgekehrt: Zustand schrittweise fortschreiben.
    if enter_short is None:
        return ev.ffill().fillna(0.0)
    out = np.zeros(ev.shape)
    vals = ev.to_numpy()
    xl = exit_.fillna(False).to_numpy(bool)
    xs = exit_short.fillna(False).to_numpy(bool) if exit_short is not None else np.zeros_like(xl)
    el = enter.fillna(False).to_numpy(bool)
    es = enter_short.fillna(False).to_numpy(bool)
    state = np.zeros(ev.shape[1])
    for t in range(len(vals)):
        state = np.where((state > 0) & xl[t], 0.0, state)
        state = np.where((state < 0) & xs[t], 0.0, state)
        state = np.where(el[t], 1.0, state)
        state = np.where(es[t], -1.0, state)
        out[t] = state
    return pd.DataFrame(out, index=ev.index, columns=ev.columns)


def month_end_mask(index: pd.DatetimeIndex) -> pd.Series:
    """True am letzten Handelstag jedes Monats.

    Für den letzten vorhandenen Tag entscheidet der Kalender (nächster Werktag in neuem Monat?),
    sonst wäre das Ende der Datenreihe fälschlich immer ein Monatsende.
    """
    m = pd.Series(index.to_period("M"), index=index)
    out = m != m.shift(-1)
    if len(index):
        out.iloc[-1] = (index[-1] + pd.offsets.BDay(1)).month != index[-1].month
    return out


class Strategy:
    """Basisklasse. Unterklassen setzen `defaults`, `grid` und implementieren `signals`."""

    name: ClassVar[str] = "base"
    label: ClassVar[str] = "Basis"
    description: ClassVar[str] = ""
    defaults: ClassVar[dict[str, Any]] = {}
    grid: ClassVar[dict[str, list]] = {}

    def __init__(self, **params: Any) -> None:
        unknown = set(params) - set(self.defaults)
        if unknown:
            raise ValueError(f"{self.name}: unbekannte Parameter {sorted(unknown)}")
        self.params = {**self.defaults, **params}
        if not self.valid(self.params):
            raise ValueError(f"{self.name}: ungültige Parameterkombination {self.params}")

    @staticmethod
    def valid(p: dict[str, Any]) -> bool:
        return True

    def signals(self, panel: Panel) -> pd.DataFrame:
        raise NotImplementedError

    def warmup(self) -> int:
        """Anzahl Handelstage, die die Strategie braucht, bevor ihr erstes Signal gültig ist."""
        return 0

    @classmethod
    def param_space(cls, grid: dict[str, list] | None = None) -> list[dict[str, Any]]:
        g = grid or cls.grid
        keys = list(g)
        combos = [dict(zip(keys, v, strict=True)) for v in product(*(g[k] for k in keys))]
        return [c for c in combos if cls.valid({**cls.defaults, **c})]

    def __repr__(self) -> str:
        ps = ", ".join(f"{k}={v}" for k, v in self.params.items())
        return f"{type(self).__name__}({ps})"


class BuyAndHold(Strategy):
    name = "buy_hold"
    label = "Kaufen und Halten"
    description = "Hält alle Werte dauerhaft. Dient als Vergleichsbasis."

    def signals(self, panel: Panel) -> pd.DataFrame:
        return panel.close.notna().astype(float).where(panel.close.ffill().notna(), 0.0)


class SMACrossover(Strategy):
    name = "sma_cross"
    label = "Kreuzung gleitender Durchschnitte"
    description = "Long, solange der schnelle über dem langsamen Durchschnitt liegt; optional short darunter."
    defaults = {"fast": 50, "slow": 200, "kind": "sma", "allow_short": False}
    grid = {"fast": [10, 20, 50, 100], "slow": [50, 100, 150, 200, 250]}

    @staticmethod
    def valid(p):
        return p["fast"] < p["slow"]

    def warmup(self):
        return self.params["slow"]

    def signals(self, panel):
        f = ind.ema if self.params["kind"] == "ema" else ind.sma
        c = panel.close.ffill()
        a, b = f(c, self.params["fast"]), f(c, self.params["slow"])
        lo = -1.0 if self.params["allow_short"] else 0.0
        return pd.DataFrame(np.where(a > b, 1.0, lo), index=c.index, columns=c.columns).where(b.notna(), 0.0)


class TrendFilter(Strategy):
    name = "trend"
    label = "Trendfilter"
    description = "Long über dem gleitenden Durchschnitt, Cash darunter. Ein Puffer verhindert Hin-und-her-Handel."
    defaults = {"n": 200, "band": 0.01}
    grid = {"n": [50, 100, 150, 200, 250], "band": [0.0, 0.01, 0.02, 0.03]}

    def warmup(self):
        return self.params["n"]

    def signals(self, panel):
        c = panel.close.ffill()
        m = ind.sma(c, self.params["n"])
        b = self.params["band"]
        return hold_state(c > m * (1 + b), c < m * (1 - b))


class DonchianBreakout(Strategy):
    name = "donchian"
    label = "Donchian-Ausbruch (Turtle)"
    description = "Kauft beim Ausbruch über das n-Tage-Hoch, verkauft beim Bruch des kürzeren m-Tage-Tiefs."
    defaults = {"entry": 55, "exit": 20, "allow_short": False}
    grid = {"entry": [20, 40, 55, 100], "exit": [10, 20, 40]}

    @staticmethod
    def valid(p):
        return p["exit"] < p["entry"]

    def warmup(self):
        return self.params["entry"]

    def signals(self, panel):
        c, h, l = panel.close.ffill(), panel.high.ffill(), panel.low.ffill()
        up, _ = ind.donchian(h, l, self.params["entry"])
        _, dn_x = ind.donchian(h, l, self.params["exit"])
        if not self.params["allow_short"]:
            return hold_state(c > up, c < dn_x)
        _, dn = ind.donchian(h, l, self.params["entry"])
        up_x, _ = ind.donchian(h, l, self.params["exit"])
        return hold_state(c > up, c < dn_x, c < dn, c > up_x)


class RSIReversion(Strategy):
    name = "rsi"
    label = "RSI-Rückkehr (Connors)"
    description = ("Kauft kurzfristig überverkaufte Werte im Aufwärtstrend und verkauft nach der Erholung. "
                   "Trendfilter 0 schaltet den Filter ab.")
    defaults = {"n": 2, "lo": 10, "hi": 70, "trend": 200}
    grid = {"n": [2, 3, 5, 14], "lo": [5, 10, 20, 30], "hi": [60, 70, 80]}

    @staticmethod
    def valid(p):
        return p["lo"] < p["hi"]

    def warmup(self):
        return max(self.params["trend"], self.params["n"] * 5)

    def signals(self, panel):
        c = panel.close.ffill()
        r = ind.rsi(c, self.params["n"])
        enter = r < self.params["lo"]
        if self.params["trend"]:
            enter &= c > ind.sma(c, self.params["trend"])
        return hold_state(enter, r > self.params["hi"])


class BollingerReversion(Strategy):
    name = "bollinger"
    label = "Bollinger-Rückkehr"
    description = "Kauft unter dem unteren Band, verkauft an der Mittellinie."
    defaults = {"n": 20, "k": 2.0}
    grid = {"n": [10, 20, 30, 50], "k": [1.5, 2.0, 2.5, 3.0]}

    def warmup(self):
        return self.params["n"]

    def signals(self, panel):
        c = panel.close.ffill()
        lo, mid, _ = ind.bollinger(c, self.params["n"], self.params["k"])
        return hold_state(c < lo, c >= mid)


class TimeSeriesMomentum(Strategy):
    name = "tsmom"
    label = "Zeitreihen-Momentum"
    description = ("Prüft am Monatsende die Rendite der letzten Monate (ohne den letzten Monat). "
                   "Positiv: long, sonst Cash oder short (Moskowitz, Ooi, Pedersen 2012).")
    defaults = {"lookback": 252, "skip": 21, "allow_short": False}
    grid = {"lookback": [63, 126, 189, 252, 378], "skip": [0, 21]}

    @staticmethod
    def valid(p):
        return p["skip"] < p["lookback"]

    def warmup(self):
        return self.params["lookback"]

    def signals(self, panel):
        c = panel.close.ffill()
        mom = ind.momentum(c, self.params["lookback"], self.params["skip"])
        lo = -1.0 if self.params["allow_short"] else 0.0
        sig = pd.DataFrame(np.where(mom > 0, 1.0, lo), index=c.index, columns=c.columns).where(mom.notna())
        return sig.where(month_end_mask(c.index), axis=0).ffill().fillna(0.0)


class CrossSectionalMomentum(Strategy):
    name = "xsmom"
    label = "Relative Stärke (Rotation)"
    description = ("Hält am Monatsende die `top` Werte mit dem stärksten Momentum. Mit Absolutfilter nur, "
                   "wenn deren Momentum positiv ist (Dual Momentum nach Antonacci).")
    defaults = {"lookback": 252, "skip": 21, "top": 3, "abs_filter": True}
    grid = {"lookback": [63, 126, 252], "skip": [0, 21], "top": [1, 2, 3, 5]}

    @staticmethod
    def valid(p):
        return p["skip"] < p["lookback"] and p["top"] >= 1

    def warmup(self):
        return self.params["lookback"]

    def signals(self, panel):
        c = panel.close.ffill()
        mom = ind.momentum(c, self.params["lookback"], self.params["skip"])
        rank = mom.rank(axis=1, ascending=False, method="first")
        sel = (rank <= self.params["top"]) & mom.notna()
        if self.params["abs_filter"]:
            sel &= mom > 0
        sig = sel.astype(float).where(mom.notna().any(axis=1), axis=0)
        return sig.where(month_end_mask(c.index), axis=0).ffill().fillna(0.0)


STRATEGIES: dict[str, type[Strategy]] = {
    s.name: s
    for s in (SMACrossover, TrendFilter, DonchianBreakout, RSIReversion, BollingerReversion,
              TimeSeriesMomentum, CrossSectionalMomentum, BuyAndHold)
}


def get(name: str, **params: Any) -> Strategy:
    if name not in STRATEGIES:
        raise KeyError(f"Unbekannte Strategie '{name}'. Verfügbar: {', '.join(STRATEGIES)}")
    return STRATEGIES[name](**params)
