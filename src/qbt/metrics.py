"""Kennzahlen für Rendite, Risiko, Benchmark-Vergleich, Trades und statistische Signifikanz."""

from __future__ import annotations

import math
from statistics import NormalDist

import numpy as np
import pandas as pd

N = NormalDist()
EULER_GAMMA = 0.5772156649015329


# ----------------------------------------------------------------------------- Rendite und Risiko

def cagr(equity: pd.Series) -> float:
    years = (equity.index[-1] - equity.index[0]).days / 365.25
    if years <= 0 or equity.iloc[0] <= 0 or equity.iloc[-1] <= 0:
        return float("nan")
    return (equity.iloc[-1] / equity.iloc[0]) ** (1 / years) - 1


def drawdown(equity: pd.Series) -> pd.Series:
    return equity / equity.cummax() - 1


def max_drawdown(equity: pd.Series) -> float:
    return float(drawdown(equity).min())


def drawdown_periods(equity: pd.Series, top: int = 5) -> pd.DataFrame:
    """Die tiefsten Drawdowns mit Beginn, Tiefpunkt, Erholung und Dauer in Kalendertagen."""
    dd = drawdown(equity)
    rows, in_dd, start, prev_t = [], False, None, equity.index[0]
    for t, v in dd.items():
        if v < 0 and not in_dd:
            in_dd, start = True, prev_t
        elif v == 0 and in_dd:
            seg = dd.loc[start:t]
            rows.append((start, seg.idxmin(), t, seg.min()))
            in_dd = False
        prev_t = t
    if in_dd:
        seg = dd.loc[start:]
        rows.append((start, seg.idxmin(), pd.NaT, seg.min()))
    df = pd.DataFrame(rows, columns=["start", "trough", "recovery", "depth"])
    if df.empty:
        return df
    end = df["recovery"].fillna(equity.index[-1])
    df["days"] = (end - df["start"]).dt.days
    df["days_to_trough"] = (df["trough"] - df["start"]).dt.days
    return df.sort_values("depth").head(top).reset_index(drop=True)


def sharpe(r: pd.Series, periods: int = 252, rf: float = 0.0) -> float:
    x = r - rf / periods
    sd = x.std(ddof=1)
    return float(x.mean() / sd * math.sqrt(periods)) if sd > 0 else float("nan")


def sortino(r: pd.Series, periods: int = 252, rf: float = 0.0) -> float:
    x = r - rf / periods
    dd = math.sqrt(float((np.minimum(x, 0) ** 2).mean()))
    return float(x.mean() / dd * math.sqrt(periods)) if dd > 0 else float("nan")


def ulcer_index(equity: pd.Series) -> float:
    return float(math.sqrt((drawdown(equity) ** 2).mean()))


def var_cvar(r: pd.Series, level: float = 0.95) -> tuple[float, float]:
    """Historischer Value at Risk und Expected Shortfall (als negative Tagesrenditen)."""
    x = r.dropna()
    if x.empty:
        return float("nan"), float("nan")
    q = float(np.quantile(x, 1 - level))
    return q, float(x[x <= q].mean())


def rolling_sharpe(r: pd.Series, window: int = 252, periods: int = 252) -> pd.Series:
    m = r.rolling(window).mean()
    s = r.rolling(window).std()
    return m / s * math.sqrt(periods)


def monthly_returns(equity: pd.Series) -> pd.DataFrame:
    """Matrix Jahr x Monat plus Jahresrendite."""
    me = equity.resample("ME").last()
    first = equity.iloc[:1]
    m = pd.concat([first, me]).pct_change().dropna()
    m = m[~m.index.duplicated(keep="last")]
    tab = pd.DataFrame({"year": m.index.year, "month": m.index.month, "r": m.values})
    pivot = tab.pivot(index="year", columns="month", values="r").reindex(columns=range(1, 13))
    ye = equity.resample("YE").last()
    yr = pd.concat([first, ye]).pct_change().dropna()
    pivot["Jahr"] = yr.groupby(yr.index.year).last()
    return pivot


# ----------------------------------------------------------------------------- Benchmark

def relative(r: pd.Series, b: pd.Series, periods: int = 252) -> dict:
    """Alpha, Beta, Korrelation, Tracking Error, Information Ratio, Up-/Down-Capture."""
    df = pd.concat([r, b], axis=1, join="inner").dropna()
    if len(df) < 20 or df.iloc[:, 1].var() == 0:
        return {k: float("nan") for k in ("alpha", "beta", "correlation", "tracking_error",
                                          "information_ratio", "up_capture", "down_capture")}
    x, y = df.iloc[:, 1].to_numpy(), df.iloc[:, 0].to_numpy()
    beta = float(np.cov(y, x, ddof=1)[0, 1] / np.var(x, ddof=1))
    alpha = float((y.mean() - beta * x.mean()) * periods)
    active = y - x
    te = float(active.std(ddof=1) * math.sqrt(periods))
    up, dn = x > 0, x < 0
    return {
        "alpha": alpha,
        "beta": beta,
        "correlation": float(np.corrcoef(y, x)[0, 1]),
        "tracking_error": te,
        "information_ratio": float(active.mean() * periods / te) if te > 0 else float("nan"),
        "up_capture": float(y[up].mean() / x[up].mean()) if up.any() else float("nan"),
        "down_capture": float(y[dn].mean() / x[dn].mean()) if dn.any() else float("nan"),
    }


# ----------------------------------------------------------------------------- Signifikanz

def probabilistic_sharpe(r: pd.Series, sr_benchmark: float = 0.0, periods: int = 252) -> float:
    """Wahrscheinlichkeit, dass die wahre Sharpe Ratio über `sr_benchmark` (annualisiert) liegt.

    Berücksichtigt Stichprobenlänge, Schiefe und Wölbung der Renditen
    (Bailey & López de Prado, 2012, "The Sharpe Ratio Efficient Frontier").
    """
    x = r.dropna()
    n = len(x)
    if n < 30 or x.std(ddof=1) == 0:
        return float("nan")
    sr = x.mean() / x.std(ddof=1)
    srb = sr_benchmark / math.sqrt(periods)
    g3 = float(x.skew())
    g4 = float(x.kurt()) + 3.0
    denom = 1 - g3 * sr + (g4 - 1) / 4 * sr**2
    if denom <= 0:
        return float("nan")
    return N.cdf((sr - srb) * math.sqrt(n - 1) / math.sqrt(denom))


def expected_max_sharpe(n_trials: int, var_sr: float) -> float:
    """Erwartete maximale Sharpe Ratio (pro Periode) unter n unabhängigen Versuchen ohne echten Edge."""
    if n_trials < 2 or var_sr <= 0:
        return 0.0
    return math.sqrt(var_sr) * (
        (1 - EULER_GAMMA) * N.inv_cdf(1 - 1 / n_trials) + EULER_GAMMA * N.inv_cdf(1 - 1 / (n_trials * math.e))
    )


def deflated_sharpe(r: pd.Series, n_trials: int, trial_sharpes: list[float] | np.ndarray | None = None,
                    periods: int = 252) -> float:
    """Deflated Sharpe Ratio (Bailey & López de Prado, 2014).

    Korrigiert die Sharpe Ratio für die Anzahl getesteter Parameterkombinationen: Wer 100 Varianten
    probiert, findet auch ohne echten Vorteil eine gute. `trial_sharpes` sind die annualisierten
    Sharpe Ratios aller Versuche; ohne sie wird deren Streuung aus der Stichprobenlänge geschätzt.
    """
    x = r.dropna()
    if trial_sharpes is not None and len(trial_sharpes) > 1:
        var_sr = float(np.nanvar(np.asarray(trial_sharpes) / math.sqrt(periods), ddof=1))
    else:
        var_sr = 1.0 / max(len(x) - 1, 1)
    sr0 = expected_max_sharpe(n_trials, var_sr) * math.sqrt(periods)
    return probabilistic_sharpe(x, sr0, periods)


def min_track_record_length(r: pd.Series, sr_benchmark: float = 0.0, confidence: float = 0.95,
                            periods: int = 252) -> float:
    """Benötigte Anzahl Beobachtungen, damit die Sharpe Ratio mit `confidence` über dem Ziel liegt."""
    x = r.dropna()
    if len(x) < 30 or x.std(ddof=1) == 0:
        return float("nan")
    sr = x.mean() / x.std(ddof=1)
    srb = sr_benchmark / math.sqrt(periods)
    if sr <= srb:
        return float("inf")
    g3, g4 = float(x.skew()), float(x.kurt()) + 3.0
    return 1 + (1 - g3 * sr + (g4 - 1) / 4 * sr**2) * (N.inv_cdf(confidence) / (sr - srb)) ** 2


# ----------------------------------------------------------------------------- Trades

def trade_stats(trades: pd.DataFrame) -> dict:
    if trades is None or trades.empty:
        return {"trades": 0}
    t = trades[~trades["open"]] if "open" in trades else trades
    out = {"trades": int(len(trades)), "closed_trades": int(len(t))}
    if t.empty:
        return out
    r = t["return"]
    wins, losses = t[t["net_pnl"] > 0], t[t["net_pnl"] <= 0]
    gw, gl = wins["net_pnl"].sum(), -losses["net_pnl"].sum()
    streak, worst = 0, 0
    for v in t["net_pnl"]:
        streak = streak + 1 if v <= 0 else 0
        worst = max(worst, streak)
    out.update({
        "win_rate": len(wins) / len(t),
        "avg_return": float(r.mean()),
        "avg_win": float(wins["return"].mean()) if len(wins) else float("nan"),
        "avg_loss": float(losses["return"].mean()) if len(losses) else float("nan"),
        "payoff_ratio": float(wins["return"].mean() / -losses["return"].mean())
        if len(wins) and len(losses) and losses["return"].mean() < 0 else float("nan"),
        "profit_factor": float(gw / gl) if gl > 0 else float("inf") if gw > 0 else float("nan"),
        "expectancy": float(t["net_pnl"].mean()),
        "best_trade": float(r.max()),
        "worst_trade": float(r.min()),
        "avg_bars": float(t["bars"].mean()),
        "max_consecutive_losses": int(worst),
        "avg_mae": float(t["mae"].mean()),
        "avg_mfe": float(t["mfe"].mean()),
        "total_costs": float(trades["costs"].sum()),
    })
    return out


# ----------------------------------------------------------------------------- Zusammenfassung

def summary(result, benchmark: pd.Series | None = None, n_trials: int = 1,
            trial_sharpes=None) -> dict:
    """Alle Kennzahlen eines Backtests als flaches Dictionary."""
    eq = result.equity
    r = result.returns.iloc[1:]
    p = result.config.periods_per_year
    years = (eq.index[-1] - eq.index[0]).days / 365.25
    var95, cvar95 = var_cvar(r)
    mdd = max_drawdown(eq)
    g = cagr(eq)
    ddp = drawdown_periods(eq, top=1)
    out = {
        "start": eq.index[0].date(), "end": eq.index[-1].date(), "years": years,
        "initial": float(eq.iloc[0]), "final": float(eq.iloc[-1]),
        "total_return": float(eq.iloc[-1] / eq.iloc[0] - 1),
        "cagr": g,
        "volatility": float(r.std(ddof=1) * math.sqrt(p)),
        "sharpe": sharpe(r, p),
        "sortino": sortino(r, p),
        "max_drawdown": mdd,
        "calmar": g / -mdd if mdd < 0 else float("nan"),
        "longest_drawdown_days": int(drawdown_periods(eq, top=1000)["days"].max()) if len(ddp) else 0,
        "ulcer_index": ulcer_index(eq),
        "var_95": var95, "cvar_95": cvar95,
        "skew": float(r.skew()), "kurtosis": float(r.kurt()),
        "best_day": float(r.max()), "worst_day": float(r.min()),
        "positive_days": float((r > 0).mean()),
        "exposure": float((result.gross_exposure > 1e-6).mean()),
        "avg_gross": float(result.gross_exposure.mean()),
        "turnover": float(result.turnover.sum() / years) if years > 0 else float("nan"),
        "cost_drag": float((result.costs.sum(axis=1) / eq).sum() / years) if years > 0 else float("nan"),
        "psr": probabilistic_sharpe(r, 0.0, p),
        "dsr": deflated_sharpe(r, n_trials, trial_sharpes, p) if n_trials > 1 else float("nan"),
        "min_trl_years": min_track_record_length(r, 0.0, 0.95, p) / p,
    }
    if benchmark is not None:
        b = benchmark.reindex(r.index).fillna(0.0)
        beq = (1 + b).cumprod() * eq.iloc[0]
        out["benchmark_cagr"] = cagr(pd.concat([eq.iloc[:1], beq]))
        out["benchmark_max_drawdown"] = max_drawdown(pd.concat([eq.iloc[:1], beq]))
        out["benchmark_sharpe"] = sharpe(b, p)
        out.update(relative(r, b, p))
    out.update(trade_stats(result.trades))
    return out


LABELS = {
    "start": "Beginn", "end": "Ende", "years": "Jahre", "initial": "Startkapital", "final": "Endkapital",
    "total_return": "Gesamtrendite", "cagr": "Rendite p. a. (CAGR)", "volatility": "Volatilität p. a.",
    "sharpe": "Sharpe Ratio", "sortino": "Sortino Ratio", "max_drawdown": "Maximaler Drawdown",
    "calmar": "Calmar Ratio", "longest_drawdown_days": "Längster Drawdown (Tage)",
    "ulcer_index": "Ulcer Index", "var_95": "VaR 95 % (1 Tag)", "cvar_95": "CVaR 95 % (1 Tag)",
    "skew": "Schiefe", "kurtosis": "Exzess-Wölbung", "best_day": "Bester Tag", "worst_day": "Schlechtester Tag",
    "positive_days": "Positive Tage", "exposure": "Zeit im Markt", "avg_gross": "Ø Bruttoexposure",
    "turnover": "Umschlag p. a.", "cost_drag": "Kostenbelastung p. a.",
    "psr": "Probabilistic Sharpe (SR > 0)", "dsr": "Deflated Sharpe", "min_trl_years": "Min. Track Record (Jahre)",
    "benchmark_cagr": "Benchmark CAGR", "benchmark_max_drawdown": "Benchmark Max. Drawdown",
    "benchmark_sharpe": "Benchmark Sharpe", "alpha": "Alpha p. a.", "beta": "Beta", "correlation": "Korrelation",
    "tracking_error": "Tracking Error", "information_ratio": "Information Ratio",
    "up_capture": "Up-Capture", "down_capture": "Down-Capture",
    "trades": "Trades", "closed_trades": "Abgeschlossene Trades", "win_rate": "Trefferquote",
    "avg_return": "Ø Rendite je Trade", "avg_win": "Ø Gewinner", "avg_loss": "Ø Verlierer",
    "payoff_ratio": "Payoff Ratio", "profit_factor": "Profit-Faktor", "expectancy": "Erwartungswert je Trade",
    "best_trade": "Bester Trade", "worst_trade": "Schlechtester Trade", "avg_bars": "Ø Haltedauer (Tage)",
    "max_consecutive_losses": "Max. Verlustserie", "avg_mae": "Ø MAE", "avg_mfe": "Ø MFE",
    "total_costs": "Kosten gesamt",
}

PERCENT = {"total_return", "cagr", "volatility", "max_drawdown", "ulcer_index", "var_95", "cvar_95",
           "best_day", "worst_day", "positive_days", "exposure", "avg_gross", "turnover", "cost_drag", "psr",
           "dsr", "benchmark_cagr", "benchmark_max_drawdown", "alpha", "tracking_error", "win_rate",
           "avg_return", "avg_win", "avg_loss", "best_trade", "worst_trade", "avg_mae", "avg_mfe"}
MONEY = {"initial", "final", "expectancy", "total_costs"}


def fmt(key: str, v) -> str:
    """Formatiert einen Kennzahlwert in deutscher Schreibweise."""
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return "–"
    if isinstance(v, float) and math.isinf(v):
        return "∞"
    if key in PERCENT:
        return f"{v * 100:,.2f} %".replace(",", "X").replace(".", ",").replace("X", ".")
    if key in MONEY:
        return f"{v:,.0f}".replace(",", ".")
    if isinstance(v, float):
        return f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return str(v)


def table(stats: dict, keys: list[str] | None = None) -> pd.DataFrame:
    keys = keys or [k for k in LABELS if k in stats]
    return pd.DataFrame({"Kennzahl": [LABELS.get(k, k) for k in keys], "Wert": [fmt(k, stats.get(k)) for k in keys]})
