import math

import numpy as np
import pandas as pd
import pytest

from qbt import metrics


def series(values, start="2020-01-01", freq="D"):
    return pd.Series(values, index=pd.date_range(start, periods=len(values), freq=freq), dtype=float)


def test_cagr_doubling_in_two_years():
    eq = pd.Series([100.0, 200.0], index=pd.to_datetime(["2020-01-01", "2022-01-01"]))
    assert metrics.cagr(eq) == pytest.approx(math.sqrt(2) - 1, rel=1e-3)


def test_max_drawdown_and_periods():
    eq = series([100, 120, 90, 100, 130, 117])
    assert metrics.max_drawdown(eq) == pytest.approx(-0.25)
    dp = metrics.drawdown_periods(eq)
    assert dp.iloc[0]["depth"] == pytest.approx(-0.25)
    assert dp.iloc[0]["start"] == eq.index[1]
    assert dp.iloc[0]["recovery"] == eq.index[4]
    assert pd.isna(dp.iloc[1]["recovery"])


def test_sharpe_of_known_series():
    r = pd.Series([0.01, -0.01] * 50)
    assert metrics.sharpe(r) == pytest.approx(0.0, abs=1e-12)
    r2 = pd.Series([0.002, 0.0] * 50)
    assert metrics.sharpe(r2) == pytest.approx(0.001 / r2.std() * math.sqrt(252))


def test_psr_increases_with_track_record():
    rng = np.random.default_rng(0)
    short = pd.Series(rng.normal(0.0005, 0.01, 250))
    long = pd.Series(rng.normal(0.0005, 0.01, 2500))
    assert metrics.probabilistic_sharpe(long) > metrics.probabilistic_sharpe(short)


def test_deflated_sharpe_penalises_many_trials():
    rng = np.random.default_rng(1)
    r = pd.Series(rng.normal(0.0006, 0.01, 1500))
    trials = rng.normal(0.5, 0.4, 200)
    assert metrics.deflated_sharpe(r, 200, trials) < metrics.deflated_sharpe(r, 2, trials[:2]) <= 1
    assert metrics.deflated_sharpe(r, 200, trials) < metrics.probabilistic_sharpe(r)


def test_relative_beta_of_scaled_benchmark():
    rng = np.random.default_rng(2)
    b = pd.Series(rng.normal(0, 0.01, 500))
    r = 0.5 * b + 0.0001
    rel = metrics.relative(r, b)
    assert rel["beta"] == pytest.approx(0.5)
    assert rel["alpha"] == pytest.approx(0.0001 * 252, rel=1e-6)
    assert rel["correlation"] == pytest.approx(1.0)


def test_monthly_returns_compound_to_year():
    idx = pd.bdate_range("2021-01-01", "2021-12-31")
    eq = pd.Series(np.linspace(100, 120, len(idx)), index=idx)
    m = metrics.monthly_returns(eq)
    assert (1 + m.loc[2021, list(range(1, 13))]).prod() - 1 == pytest.approx(m.loc[2021, "Jahr"])


def test_trade_stats():
    t = pd.DataFrame({"net_pnl": [100, -50, 200, -50], "return": [0.1, -0.05, 0.2, -0.05], "bars": [5] * 4,
                      "mae": [-0.01] * 4, "mfe": [0.2] * 4, "costs": [1] * 4, "open": [False] * 4})
    s = metrics.trade_stats(t)
    assert s["win_rate"] == 0.5
    assert s["profit_factor"] == pytest.approx(3.0)
    assert s["payoff_ratio"] == pytest.approx(3.0)
    assert s["max_consecutive_losses"] == 1


def test_fmt_german():
    assert metrics.fmt("cagr", 0.12345) == "12,35 %"
    assert metrics.fmt("final", 1234567.8) == "1.234.568"
    assert metrics.fmt("sharpe", float("nan")) == "–"
