import pandas as pd

from qbt import data, strategies
from qbt.strategies import hold_state, month_end_mask


def test_hold_state_long_only():
    idx = pd.RangeIndex(6)
    enter = pd.DataFrame({"A": [False, True, False, False, False, True]}, index=idx)
    exit_ = pd.DataFrame({"A": [False, False, False, True, False, False]}, index=idx)
    assert hold_state(enter, exit_)["A"].tolist() == [0, 1, 1, 0, 0, 1]


def test_hold_state_long_short():
    idx = pd.RangeIndex(5)
    el = pd.DataFrame({"A": [True, False, False, False, False]}, index=idx)
    xl = pd.DataFrame({"A": [False, True, False, False, False]}, index=idx)
    es = pd.DataFrame({"A": [False, False, True, False, False]}, index=idx)
    xs = pd.DataFrame({"A": [False, False, False, False, True]}, index=idx)
    assert hold_state(el, xl, es, xs)["A"].tolist() == [1, 0, -1, -1, 0]


def test_monthly_strategies_only_change_at_month_end():
    p = data.synthetic(5, days=800, seed=8)
    me = month_end_mask(p.index)
    for name in ("tsmom", "xsmom"):
        s = strategies.get(name, lookback=63, skip=0).signals(p)
        changes = s.diff().abs().sum(axis=1) > 0
        assert not (changes & ~me).iloc[1:].any(), name


def test_xsmom_holds_at_most_top_n():
    p = data.synthetic(6, days=800, seed=8, drift=0.1)
    s = strategies.get("xsmom", top=2, lookback=126, skip=0).signals(p)
    assert (s.sum(axis=1) <= 2).all()


def test_param_space_filters_invalid():
    space = strategies.SMACrossover.param_space({"fast": [10, 100], "slow": [50, 200]})
    assert {"fast": 100, "slow": 50} not in space
    assert len(space) == 3
