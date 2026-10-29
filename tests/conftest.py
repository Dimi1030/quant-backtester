import numpy as np
import pandas as pd
import pytest

from qbt.data import Panel


def make_panel(closes: dict[str, list[float]], opens: dict[str, list[float]] | None = None,
               highs=None, lows=None, start="2020-01-01") -> Panel:
    """Kleines Panel mit exakt vorgegebenen Kursen für nachrechenbare Tests."""
    frames = {}
    for s, c in closes.items():
        c = np.asarray(c, float)
        o = np.asarray(opens[s], float) if opens and s in opens else c.copy()
        h = np.asarray(highs[s], float) if highs and s in highs else np.maximum(o, c)
        l = np.asarray(lows[s], float) if lows and s in lows else np.minimum(o, c)
        idx = pd.bdate_range(start, periods=len(c), name="date")
        frames[s] = pd.DataFrame({"open": o, "high": h, "low": l, "close": c, "volume": 1e6}, index=idx)
    return Panel.from_frames(frames)


@pytest.fixture
def no_costs():
    from qbt.engine import Config, Costs
    return Config(initial_capital=10_000, integer_shares=False, rebalance_threshold=0.0,
                  costs=Costs(commission_fixed=0, slippage_bps=0, borrow_bps=0))
