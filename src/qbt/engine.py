"""Ereignisgesteuerte Portfolio-Simulation auf Tagesbasis.

Ablauf pro Handelstag t:
  1. Finanzierung über Nacht: Zinsen auf Cash (oder Sollzinsen), Leihgebühr für Short-Positionen.
  2. Ausführung der Zielgewichte, die am Schluss von t-1 berechnet wurden, zum Eröffnungskurs von t
     (oder wahlweise zum Schlusskurs von t). So kann ein Signal nie den Kurs nutzen, aus dem es entstand.
  3. Stop-Loss, Trailing-Stop und Take-Profit innerhalb des Tages anhand von Hoch und Tief.
     Öffnet der Kurs bereits jenseits des Stops (Gap), wird zum Eröffnungskurs gefüllt.
  4. Bewertung aller Positionen zum Schlusskurs.

Kosten: Kommission (prozentual mit Mindestgebühr plus Fixbetrag) und Slippage in Basispunkten,
die bei Käufen den Preis erhöht und bei Verkäufen senkt (enthält den halben Spread).
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

import numpy as np
import pandas as pd

from .data import Panel
from .sizing import EqualWeight
from .strategies import Strategy


@dataclass
class Costs:
    commission_bps: float = 0.0     # prozentuale Gebühr in Basispunkten des Ordervolumens
    commission_min: float = 0.0     # Mindestgebühr der prozentualen Komponente
    commission_fixed: float = 1.0   # Fixbetrag je Order
    slippage_bps: float = 5.0       # Ausführung schlechter als der Referenzkurs (inkl. halber Spread)
    borrow_bps: float = 50.0        # Leihgebühr p. a. auf den Short-Marktwert
    cash_rate: float = 0.0          # Zins p. a. auf Cash; negatives Cash zahlt denselben Satz

    def commission(self, notional: float) -> float:
        return max(self.commission_min, abs(notional) * self.commission_bps / 1e4) + self.commission_fixed


@dataclass
class Config:
    initial_capital: float = 100_000.0
    execution: str = "open"             # "open": nächste Eröffnung, "close": nächster Schluss
    costs: Costs = field(default_factory=Costs)
    integer_shares: bool = True
    rebalance_threshold: float = 0.02   # Umschichten erst ab dieser Abweichung vom Zielgewicht
    stop_loss: float | None = None      # z. B. 0.08 = 8 % unter Einstand
    trailing_stop: float | None = None  # z. B. 0.15 = 15 % unter dem Hoch seit Einstieg
    take_profit: float | None = None    # z. B. 0.25 = 25 % über Einstand
    periods_per_year: int = 252

    def __post_init__(self):
        if self.execution not in ("open", "close"):
            raise ValueError("execution muss 'open' oder 'close' sein")
        if isinstance(self.costs, dict):
            self.costs = Costs(**self.costs)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Result:
    equity: pd.Series
    cash: pd.Series
    positions: pd.DataFrame       # Stückzahl je Symbol
    weights: pd.DataFrame         # Marktwert / Depotwert
    targets: pd.DataFrame         # Zielgewichte der Strategie (Signal am Schluss)
    trades: pd.DataFrame          # abgeschlossene und offene Round-Trips
    fills: pd.DataFrame           # jede einzelne Ausführung
    costs: pd.DataFrame           # Kommission, Slippage, Finanzierung pro Tag
    turnover: pd.Series           # gehandeltes Volumen / Depotwert pro Tag
    config: Config
    strategy: str = ""
    params: dict = field(default_factory=dict)

    @property
    def returns(self) -> pd.Series:
        return self.equity.pct_change().fillna(0.0)

    @property
    def gross_exposure(self) -> pd.Series:
        return self.weights.abs().sum(axis=1)

    @property
    def net_exposure(self) -> pd.Series:
        return self.weights.sum(axis=1)


class _Trade:
    __slots__ = ("sym", "side", "entry_date", "entry_px", "qty", "max_qty", "realized", "costs",
                 "exit_qty", "exit_value", "mae", "mfe", "peak", "trough", "entry_bar", "exit_date",
                 "exit_reason")

    def __init__(self, sym, side, date, px, qty, bar):
        self.sym, self.side, self.entry_date, self.entry_px = sym, side, date, px
        self.qty = self.max_qty = qty
        self.realized = self.costs = self.exit_qty = self.exit_value = 0.0
        self.mae = self.mfe = 0.0
        self.peak = self.trough = px
        self.entry_bar = bar
        self.exit_date = None
        self.exit_reason = ""


def run(
    panel: Panel,
    strategy: Strategy,
    sizer=None,
    config: Config | None = None,
    start=None,
    end=None,
) -> Result:
    """Berechnet Signale über die gesamte Historie (für die Aufwärmphase der Indikatoren) und
    simuliert den Handel im Zeitraum [start, end]."""
    sizer = sizer or EqualWeight()
    signals = strategy.signals(panel)
    weights = sizer.weights(signals, panel)
    res = simulate(panel, weights, config, start, end)
    res.strategy = strategy.name
    res.params = dict(strategy.params)
    return res


def simulate(panel: Panel, target_weights: pd.DataFrame, config: Config | None = None,
             start=None, end=None) -> Result:
    cfg = config or Config()
    c = cfg.costs
    idx = panel.index
    syms = panel.symbols
    tw = target_weights.reindex(index=idx, columns=syms).ffill().fillna(0.0)

    s = 0 if start is None else int(idx.searchsorted(pd.Timestamp(start)))
    e = len(idx) - 1 if end is None else int(idx.searchsorted(pd.Timestamp(end), side="right")) - 1
    if e - s < 2:
        raise ValueError("Zeitraum zu kurz für einen Backtest.")

    O, H, L, C = (getattr(panel, f).to_numpy(float) for f in ("open", "high", "low", "close"))
    CF = panel.close.ffill().to_numpy(float)
    W = tw.to_numpy(float)
    n = len(syms)
    slip = c.slippage_bps / 1e4
    dt = 1.0 / cfg.periods_per_year
    stops_on = any(x for x in (cfg.stop_loss, cfg.trailing_stop, cfg.take_profit))

    pos = np.zeros(n)
    cash = float(cfg.initial_capital)
    open_tr: list[_Trade | None] = [None] * n
    closed: list[_Trade] = []
    fills: list[tuple] = []
    blocked = np.zeros(n)  # Vorzeichen der Position, die per Stop geschlossen wurde; 0 = frei

    # Die Kurve beginnt am Schluss des Vortags mit dem Startkapital (Entscheidungszeitpunkt).
    s0 = max(s - 1, 0)
    T = e - s0 + 1
    eq_h, cash_h = np.zeros(T), np.zeros(T)
    pos_h = np.zeros((T, n))
    comm_h, slip_h, fin_h, turn_h = np.zeros(T), np.zeros(T), np.zeros(T), np.zeros(T)

    def fill(i: int, qty: float, ref_px: float, k: int, t: int, reason: str) -> None:
        nonlocal cash
        if qty == 0:
            return
        side = 1.0 if qty > 0 else -1.0
        px = ref_px * (1 + side * slip)
        notional = qty * px
        comm = c.commission(notional)
        cash -= notional + comm
        comm_h[k] += comm
        slip_h[k] += abs(qty) * ref_px * slip
        turn_h[k] += abs(notional)
        fills.append((idx[t], syms[i], qty, px, comm, reason))

        cur = pos[i]
        tr = open_tr[i]
        remaining = qty
        if cur != 0 and np.sign(cur) != side:
            close_q = min(abs(qty), abs(cur))
            share = close_q / abs(qty)
            tr.realized += close_q * (px - tr.entry_px) * tr.side
            tr.exit_qty += close_q
            tr.exit_value += close_q * px
            tr.costs += comm * share
            tr.qty -= close_q
            remaining = qty - side * close_q
            if tr.qty <= 1e-12:
                tr.exit_date, tr.exit_reason = idx[t], reason
                closed.append(tr)
                open_tr[i] = None
            comm = comm * (1 - share)
        if abs(remaining) > 1e-12:
            tr = open_tr[i]
            if tr is None:
                open_tr[i] = _Trade(syms[i], side, idx[t], px, abs(remaining), t)
                open_tr[i].costs += comm
            else:
                tot = tr.qty + abs(remaining)
                tr.entry_px = (tr.entry_px * tr.qty + px * abs(remaining)) / tot
                tr.qty = tot
                tr.max_qty = max(tr.max_qty, tot)
                tr.costs += comm
        pos[i] += qty
        if abs(pos[i]) < 1e-9:
            pos[i] = 0.0

    for k, t in enumerate(range(s0, e + 1)):
        active = t >= s
        # 1) Finanzierung über Nacht
        if k > 0:
            interest = cash * c.cash_rate * dt
            short_val = float(np.sum(np.where(pos < 0, pos * CF[t - 1], 0.0)))
            borrow = -short_val * c.borrow_bps / 1e4 * dt
            cash += interest - borrow
            fin_h[k] = borrow - interest
            if borrow:
                for i in np.flatnonzero(pos < 0):
                    open_tr[i].costs += -pos[i] * CF[t - 1] * c.borrow_bps / 1e4 * dt

        # 2) Ausführung der Zielgewichte vom Vortag
        if t > 0 and active:
            P = O[t] if cfg.execution == "open" else C[t]
            P = np.where(np.isfinite(P), P, C[t])
            tradable = np.isfinite(P) & (P > 0)
            val_px = np.where(tradable, P, CF[t - 1])
            equity_x = cash + float(np.nansum(pos * val_px))
            tgt = W[t - 1].copy()
            for i in range(n):
                if blocked[i] and np.sign(tgt[i]) != blocked[i]:
                    blocked[i] = 0
                if blocked[i]:
                    tgt[i] = 0.0
            orders = []
            for i in np.flatnonzero(tradable):
                cur_w = pos[i] * P[i] / equity_x if equity_x > 0 else 0.0
                flip = np.sign(tgt[i]) != np.sign(pos[i])
                if not flip and abs(tgt[i] - cur_w) <= cfg.rebalance_threshold:
                    continue
                want = tgt[i] * max(equity_x, 0.0) / P[i]
                if cfg.integer_shares:
                    want = np.trunc(want)
                d = want - pos[i]
                if d != 0:
                    orders.append((i, d))
            # Verkäufe zuerst, damit Käufe aus dem freigewordenen Cash bezahlt werden
            orders.sort(key=lambda o: abs(pos[o[0]] + o[1]) > abs(pos[o[0]]))
            levered = float(np.abs(tgt).sum()) > 1.0 + 1e-9
            for i, d in orders:
                if d > 0 and not levered and pos[i] >= 0:
                    unit = P[i] * (1 + slip) * (1 + c.commission_bps / 1e4)
                    afford = (cash - c.commission_fixed - c.commission_min) / unit
                    if cfg.integer_shares:
                        afford = np.floor(afford)
                    d = min(d, max(afford, 0.0))
                fill(i, d, P[i], k, t, "Signal")

        # 3) Stops innerhalb des Tages
        if stops_on and active:
            for i in np.flatnonzero(pos):
                tr = open_tr[i]
                if tr is None or not (np.isfinite(L[t, i]) and np.isfinite(H[t, i])):
                    continue
                if cfg.execution == "close" and tr.entry_bar == t:
                    continue
                o = O[t, i] if np.isfinite(O[t, i]) else C[t, i]
                fresh = tr.entry_bar == t and cfg.execution == "open"
                lvl, why = _stop_level(tr, cfg)
                tp = None if not cfg.take_profit else tr.entry_px * (1 + tr.side * cfg.take_profit)
                px, reason = None, ""
                if tr.side > 0:
                    if lvl is not None and L[t, i] <= lvl:
                        px, reason = (lvl if fresh else min(o, lvl)), why
                    elif tp is not None and H[t, i] >= tp:
                        px, reason = (tp if fresh else max(o, tp)), "Take-Profit"
                else:
                    if lvl is not None and H[t, i] >= lvl:
                        px, reason = (lvl if fresh else max(o, lvl)), why
                    elif tp is not None and L[t, i] <= tp:
                        px, reason = (tp if fresh else min(o, tp)), "Take-Profit"
                if px is not None:
                    blocked[i] = tr.side
                    fill(i, -pos[i], px, k, t, reason)

        # MAE / MFE und Hoch-/Tiefstände offener Trades
        for i in np.flatnonzero(pos):
            tr = open_tr[i]
            if tr is None or not np.isfinite(H[t, i]):
                continue
            hi, lo = H[t, i], L[t, i]
            tr.peak, tr.trough = max(tr.peak, hi), min(tr.trough, lo)
            if tr.side > 0:
                tr.mfe, tr.mae = max(tr.mfe, hi / tr.entry_px - 1), min(tr.mae, lo / tr.entry_px - 1)
            else:
                tr.mfe, tr.mae = max(tr.mfe, 1 - lo / tr.entry_px), min(tr.mae, 1 - hi / tr.entry_px)

        # 4) Bewertung zum Schluss
        mv = np.where(pos != 0, pos * CF[t], 0.0)
        eq = cash + float(np.nansum(mv))
        eq_h[k], cash_h[k], pos_h[k] = eq, cash, pos
        turn_h[k] = turn_h[k] / eq if eq > 0 else 0.0

    dates = idx[s0:e + 1]
    equity = pd.Series(eq_h, index=dates, name="equity")
    positions = pd.DataFrame(pos_h, index=dates, columns=syms)
    weights = (positions * panel.close.ffill().iloc[s0:e + 1]).div(equity, axis=0).fillna(0.0)

    last_px = CF[e]
    rows = [_trade_row(tr, idx, panel) for tr in closed]
    for i, tr in enumerate(open_tr):
        if tr is not None:
            rows.append(_trade_row(tr, idx, panel, open_px=last_px[i], open_date=idx[e]))
    trades = pd.DataFrame(rows, columns=_TRADE_COLS)
    if len(trades):
        trades = trades.sort_values("entry_date", kind="stable").reset_index(drop=True)

    return Result(
        equity=equity,
        cash=pd.Series(cash_h, index=dates, name="cash"),
        positions=positions,
        weights=weights,
        targets=tw.iloc[s0:e + 1],
        trades=trades,
        fills=pd.DataFrame(fills, columns=["date", "symbol", "qty", "price", "commission", "reason"]),
        costs=pd.DataFrame({"commission": comm_h, "slippage": slip_h, "financing": fin_h}, index=dates),
        turnover=pd.Series(turn_h, index=dates, name="turnover"),
        config=cfg,
    )


def _stop_level(tr: _Trade, cfg: Config) -> tuple[float | None, str]:
    levels = []
    if cfg.stop_loss:
        levels.append((tr.entry_px * (1 - tr.side * cfg.stop_loss), "Stop-Loss"))
    if cfg.trailing_stop:
        ref = tr.peak if tr.side > 0 else tr.trough
        levels.append((ref * (1 - tr.side * cfg.trailing_stop), "Trailing-Stop"))
    if not levels:
        return None, ""
    # Long: der höchste (engste) Stop greift zuerst; Short: der niedrigste.
    return (max if tr.side > 0 else min)(levels, key=lambda x: x[0])


_TRADE_COLS = ["symbol", "side", "entry_date", "exit_date", "entry_price", "exit_price", "qty",
               "pnl", "costs", "net_pnl", "return", "bars", "mae", "mfe", "exit_reason", "open"]


def _trade_row(tr: _Trade, idx, panel, open_px=None, open_date=None) -> dict:
    is_open = open_px is not None
    realized, exit_q, exit_val = tr.realized, tr.exit_qty, tr.exit_value
    if is_open:
        realized += tr.qty * (open_px - tr.entry_px) * tr.side
        exit_q += tr.qty
        exit_val += tr.qty * open_px
    exit_px = exit_val / exit_q if exit_q else np.nan
    exit_date = open_date if is_open else tr.exit_date
    basis = tr.max_qty * tr.entry_px
    net = realized - tr.costs
    return {
        "symbol": tr.sym, "side": "long" if tr.side > 0 else "short",
        "entry_date": tr.entry_date, "exit_date": exit_date,
        "entry_price": tr.entry_px, "exit_price": exit_px, "qty": tr.max_qty,
        "pnl": realized, "costs": tr.costs, "net_pnl": net, "return": net / basis if basis else np.nan,
        "bars": int(idx.get_loc(exit_date) - tr.entry_bar),
        "mae": tr.mae, "mfe": tr.mfe,
        "exit_reason": "offen" if is_open else tr.exit_reason, "open": is_open,
    }


def benchmark_returns(panel: Panel, symbol: str | None = None, start=None, end=None) -> pd.Series:
    """Tagesrenditen der Vergleichsbasis: ein Symbol oder ein täglich gleichgewichtetes Portfolio."""
    r = panel.close.ffill().pct_change()
    r = r[symbol] if symbol else r.mean(axis=1)
    return r.loc[start:end].fillna(0.0).rename("benchmark")
