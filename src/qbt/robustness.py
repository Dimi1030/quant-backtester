"""Robustheitstests: Parameter-Raster, Walk-Forward-Optimierung, Monte-Carlo-Simulation,
Probability of Backtest Overfitting (CSCV) und Kostensensitivität."""

from __future__ import annotations

import math
from dataclasses import dataclass, replace
from itertools import combinations

import numpy as np
import pandas as pd

from . import engine, metrics
from .data import Panel
from .sizing import EqualWeight
from .strategies import Strategy

OBJECTIVES = {
    "sharpe": lambda res: metrics.sharpe(res.returns.iloc[1:], res.config.periods_per_year),
    "sortino": lambda res: metrics.sortino(res.returns.iloc[1:], res.config.periods_per_year),
    "cagr": lambda res: metrics.cagr(res.equity),
    "calmar": lambda res: (metrics.cagr(res.equity) / -metrics.max_drawdown(res.equity)
                           if metrics.max_drawdown(res.equity) < 0 else float("nan")),
}


def _key(params: dict) -> tuple:
    return tuple(sorted(params.items()))


class _WeightCache:
    """Berechnet Zielgewichte je Parameterkombination nur einmal über die ganze Historie."""

    def __init__(self, panel: Panel, cls: type[Strategy], sizer):
        self.panel, self.cls, self.sizer, self._c = panel, cls, sizer or EqualWeight(), {}

    def __call__(self, params: dict) -> pd.DataFrame:
        k = _key(params)
        if k not in self._c:
            strat = self.cls(**params)
            self._c[k] = self.sizer.weights(strat.signals(self.panel), self.panel)
        return self._c[k]


@dataclass
class GridResult:
    table: pd.DataFrame          # eine Zeile je Kombination mit Kennzahlen
    returns: pd.DataFrame        # Tagesrenditen je Kombination (Spalten = Kombinationsindex)
    params: list[dict]

    @property
    def n_trials(self) -> int:
        return len(self.params)

    def best(self, objective: str = "sharpe") -> dict:
        return self.params[int(self.table[objective].astype(float).idxmax())]


def grid_search(panel: Panel, cls: type[Strategy], grid: dict | None = None, sizer=None,
                config: engine.Config | None = None, start=None, end=None,
                _cache: _WeightCache | None = None) -> GridResult:
    cache = _cache or _WeightCache(panel, cls, sizer)
    space = cls.param_space(grid)
    if not space:
        raise ValueError("Das Parameter-Raster enthält keine gültige Kombination.")
    rows, rets = [], {}
    for j, p in enumerate(space):
        res = engine.simulate(panel, cache({**cls.defaults, **p}), config, start, end)
        r = res.returns.iloc[1:]
        mdd = metrics.max_drawdown(res.equity)
        g = metrics.cagr(res.equity)
        rows.append({**p, "cagr": g, "sharpe": metrics.sharpe(r), "sortino": metrics.sortino(r),
                     "max_drawdown": mdd, "calmar": g / -mdd if mdd < 0 else float("nan"),
                     "trades": len(res.trades), "exposure": float((res.gross_exposure > 1e-6).mean())})
        rets[j] = res.returns
    return GridResult(pd.DataFrame(rows), pd.DataFrame(rets), space)


# ----------------------------------------------------------------------------- Walk-Forward

@dataclass
class WalkForwardResult:
    folds: pd.DataFrame
    oos: engine.Result
    efficiency: float            # OOS-Rendite p. a. / IS-Rendite p. a. der gewählten Parameter
    n_trials: int


def walk_forward(panel: Panel, cls: type[Strategy], grid: dict | None = None, sizer=None,
                 config: engine.Config | None = None, train_years: float = 3, test_years: float = 1,
                 anchored: bool = False, objective: str = "sharpe", start=None, end=None) -> WalkForwardResult:
    """Optimiert die Parameter auf einem Trainingsfenster und handelt sie im folgenden, ungesehenen
    Testfenster. Die Testfenster werden zu einer durchgehenden Out-of-Sample-Kurve verbunden.
    """
    if objective not in OBJECTIVES:
        raise ValueError(f"Unbekanntes Ziel '{objective}'. Möglich: {', '.join(OBJECTIVES)}")
    idx = panel.index
    first = idx[idx.searchsorted(pd.Timestamp(start))] if start else idx[0]
    last = idx[idx.searchsorted(pd.Timestamp(end), side="right") - 1] if end else idx[-1]
    cache = _WeightCache(panel, cls, sizer)
    space = cls.param_space(grid)
    train = pd.DateOffset(days=round(train_years * 365.25))
    test = pd.DateOffset(days=round(test_years * 365.25))

    folds, pieces = [], []
    t0 = first
    while True:
        tr_start = first if anchored else t0
        tr_end = t0 + train
        te_end = min(tr_end + test, last + pd.Timedelta(days=1))
        if tr_end >= last:
            break
        scores = []
        for p in space:
            full = {**cls.defaults, **p}
            res = engine.simulate(panel, cache(full), config, tr_start, tr_end - pd.Timedelta(days=1))
            scores.append(OBJECTIVES[objective](res))
        s = np.array(scores, dtype=float)
        if np.all(np.isnan(s)):
            break
        j = int(np.nanargmax(s))
        best = {**cls.defaults, **space[j]}
        is_res = engine.simulate(panel, cache(best), config, tr_start, tr_end - pd.Timedelta(days=1))
        w = cache(best)
        te_mask = (idx >= tr_end) & (idx < te_end)
        pieces.append(w.loc[te_mask])
        folds.append({
            "train_start": tr_start.date(), "train_end": (tr_end - pd.Timedelta(days=1)).date(),
            "test_start": tr_end.date(), "test_end": (te_end - pd.Timedelta(days=1)).date(),
            "params": space[j], "is_score": s[j], "is_cagr": metrics.cagr(is_res.equity),
        })
        t0 = t0 + test
        if te_end > last:
            break
    if not folds:
        raise ValueError("Zu wenig Historie für Walk-Forward: Trainings- plus Testfenster sind länger als die Daten.")

    # Eine durchgehende Simulation über alle Testfenster: Positionen laufen über Fenstergrenzen weiter,
    # gehandelt wird nur, wenn sich das Zielgewicht durch neue Parameter tatsächlich ändert.
    weights = cache({**cls.defaults, **folds[0]["params"]}).copy()
    for piece in pieces:
        weights.loc[piece.index] = piece.values
    oos = engine.simulate(panel, weights, config, pieces[0].index[0], pieces[-1].index[-1])
    oos.strategy = cls.name

    fdf = pd.DataFrame(folds)
    oos_cagr = []
    for f in folds:
        seg = oos.equity.loc[str(f["test_start"]):str(f["test_end"])]
        oos_cagr.append(metrics.cagr(seg) if len(seg) > 5 else float("nan"))
    fdf["oos_cagr"] = oos_cagr
    is_mean, oos_mean = np.nanmean(fdf["is_cagr"]), np.nanmean(fdf["oos_cagr"])
    eff = oos_mean / is_mean if is_mean and not math.isnan(is_mean) and is_mean > 0 else float("nan")
    return WalkForwardResult(fdf, oos, eff, len(space))


# ----------------------------------------------------------------------------- Monte Carlo

@dataclass
class MonteCarloResult:
    cagr: np.ndarray
    max_drawdown: np.ndarray
    final: np.ndarray
    bands: pd.DataFrame          # Perzentile des Depotwerts über die Zeit
    samples: np.ndarray          # einige Beispielpfade für Grafiken

    def summary(self) -> pd.DataFrame:
        q = [0.05, 0.25, 0.5, 0.75, 0.95]
        return pd.DataFrame({
            "CAGR": np.nanquantile(self.cagr, q),
            "Max. Drawdown": np.nanquantile(self.max_drawdown, q),
            "Endwert (x)": np.nanquantile(self.final, q),
        }, index=[f"{int(x * 100)}. Perzentil" for x in q])

    @property
    def prob_loss(self) -> float:
        return float((self.final < 1).mean())


def monte_carlo(returns: pd.Series, n_sims: int = 2000, block: int = 21, horizon: int | None = None,
                periods: int = 252, seed: int = 42, n_samples: int = 50) -> MonteCarloResult:
    """Block-Bootstrap der Tagesrenditen. Blöcke erhalten kurzfristige Abhängigkeiten wie
    Volatilitätscluster. Zeigt, welche Spannweite an Ergebnissen dieselbe Strategie bei anderer
    Reihenfolge der Marktphasen hätte liefern können."""
    r = returns.dropna().to_numpy()
    if len(r) < block * 2:
        raise ValueError("Zu wenige Renditen für die Monte-Carlo-Simulation.")
    h = horizon or len(r)
    rng = np.random.default_rng(seed)
    nb = math.ceil(h / block)
    starts = rng.integers(0, len(r) - block + 1, size=(n_sims, nb))
    paths = r[(starts[:, :, None] + np.arange(block)).reshape(n_sims, -1)[:, :h]]
    eq = np.cumprod(1 + paths, axis=1)
    peak = np.maximum.accumulate(eq, axis=1)
    mdd = (eq / peak - 1).min(axis=1)
    final = eq[:, -1]
    years = h / periods
    cagr = np.where(final > 0, final ** (1 / years) - 1, -1.0)
    q = np.quantile(eq, [0.05, 0.25, 0.5, 0.75, 0.95], axis=0)
    bands = pd.DataFrame(q.T, columns=["p05", "p25", "p50", "p75", "p95"])
    return MonteCarloResult(cagr, mdd, final, bands, eq[:n_samples])


# ----------------------------------------------------------------------------- PBO (CSCV)

@dataclass
class PBOResult:
    pbo: float                   # Wahrscheinlichkeit, dass die IS-beste Variante OOS unter dem Median liegt
    logits: np.ndarray
    is_sharpe: np.ndarray        # IS-Sharpe der jeweils besten Variante
    oos_sharpe: np.ndarray       # deren OOS-Sharpe
    n_splits: int


def pbo(trial_returns: pd.DataFrame, n_blocks: int = 10, periods: int = 252) -> PBOResult:
    """Probability of Backtest Overfitting mit Combinatorially Symmetric Cross-Validation
    (Bailey, Borwein, López de Prado, Zhu, 2015).

    Die Historie wird in `n_blocks` gleich lange Blöcke geteilt. Für jede Aufteilung in eine
    Hälfte In-Sample und eine Hälfte Out-of-Sample wird die IS-beste Parameterkombination bestimmt
    und ihr Rang OOS gemessen. PBO ist der Anteil der Aufteilungen, in denen sie OOS schlechter
    als der Median abschneidet. Werte über 0,5 sprechen klar für Overfitting.
    """
    M = trial_returns.dropna(how="all").fillna(0.0).to_numpy()
    T, n = M.shape
    if n < 2:
        raise ValueError("PBO braucht mindestens zwei Parameterkombinationen.")
    if n_blocks % 2:
        n_blocks += 1
    size = T // n_blocks
    M = M[: size * n_blocks].reshape(n_blocks, size, n)
    s1, s2 = M.sum(axis=1), (M**2).sum(axis=1)
    logits, is_sr, oos_sr = [], [], []
    blocks = range(n_blocks)
    for comb in combinations(blocks, n_blocks // 2):
        ins = np.zeros(n_blocks, bool)
        ins[list(comb)] = True

        def sr(mask):
            cnt = mask.sum() * size
            mu = s1[mask].sum(axis=0) / cnt
            var = s2[mask].sum(axis=0) / cnt - mu**2
            return np.where(var > 0, mu / np.sqrt(np.maximum(var, 1e-18)) * math.sqrt(periods), 0.0)

        a, b = sr(ins), sr(~ins)
        best = int(np.argmax(a))
        rank = (b < b[best]).sum() + 0.5 * ((b == b[best]).sum() - 1) + 1
        w = rank / (n + 1)
        logits.append(math.log(w / (1 - w)))
        is_sr.append(a[best])
        oos_sr.append(b[best])
    lg = np.array(logits)
    return PBOResult(float((lg <= 0).mean()), lg, np.array(is_sr), np.array(oos_sr), len(lg))


# ----------------------------------------------------------------------------- Kosten

def cost_sensitivity(panel: Panel, strategy: Strategy, sizer=None, config: engine.Config | None = None,
                     start=None, end=None, multipliers=(0, 1, 2, 4)) -> pd.DataFrame:
    """Wie stark hängt das Ergebnis von den Handelskosten ab? Skaliert Slippage und Kommission."""
    cfg = config or engine.Config()
    weights = (sizer or EqualWeight()).weights(strategy.signals(panel), panel)
    rows = []
    for m in multipliers:
        c = replace(cfg.costs, slippage_bps=cfg.costs.slippage_bps * m, commission_bps=cfg.costs.commission_bps * m,
                    commission_fixed=cfg.costs.commission_fixed * m, commission_min=cfg.costs.commission_min * m)
        res = engine.simulate(panel, weights, replace(cfg, costs=c), start, end)
        r = res.returns.iloc[1:]
        rows.append({"Kostenfaktor": f"{m}×", "CAGR": metrics.cagr(res.equity), "Sharpe": metrics.sharpe(r),
                     "Max. Drawdown": metrics.max_drawdown(res.equity),
                     "Kosten gesamt": float(res.costs[["commission", "slippage"]].sum().sum())})
    return pd.DataFrame(rows)
