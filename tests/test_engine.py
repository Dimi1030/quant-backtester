import numpy as np
import pandas as pd
import pytest
from conftest import make_panel

from qbt import data, engine, strategies
from qbt.engine import Config, Costs


def weights(panel, values):
    return pd.DataFrame({s: values for s in panel.symbols}, index=panel.index, dtype=float)


def test_buy_and_hold_enters_at_next_open(no_costs):
    p = make_panel({"A": [100, 101, 102, 104, 103]}, opens={"A": [100, 100.5, 101.5, 103, 104]})
    res = engine.simulate(p, weights(p, [1, 1, 1, 1, 1]), no_costs)
    # Signal am Schluss von Tag 0, Kauf zur Eröffnung von Tag 1
    assert res.fills.iloc[0]["date"] == p.index[1]
    assert res.fills.iloc[0]["price"] == pytest.approx(100.5)
    assert res.equity.iloc[-1] == pytest.approx(10_000 * 103 / 100.5)


def test_no_lookahead_signal_change_trades_next_day(no_costs):
    p = make_panel({"A": [10, 11, 12, 13, 14, 15]}, opens={"A": [10, 10.5, 11.5, 12.5, 13.5, 14.5]})
    w = weights(p, [0, 0, 1, 1, 0, 0])
    res = engine.simulate(p, w, no_costs)
    assert list(res.fills["date"]) == [p.index[3], p.index[5]]
    assert list(res.fills["price"]) == [12.5, 14.5]


def test_execution_at_close_option():
    p = make_panel({"A": [10, 11, 12, 13]}, opens={"A": [9, 10, 11, 12]})
    cfg = Config(initial_capital=1000, execution="close", integer_shares=False,
                 costs=Costs(commission_fixed=0, slippage_bps=0))
    res = engine.simulate(p, weights(p, [1, 1, 1, 1]), cfg)
    assert res.fills.iloc[0]["price"] == 11


def test_costs_are_charged():
    p = make_panel({"A": [100.0] * 5})
    cfg = Config(initial_capital=10_000, integer_shares=False, rebalance_threshold=0.0,
                 costs=Costs(commission_bps=10, commission_fixed=2, slippage_bps=20, borrow_bps=0))
    res = engine.simulate(p, weights(p, [1, 1, 1, 0, 0]), cfg)
    buy, sell = res.fills.iloc[0], res.fills.iloc[1]
    assert buy["price"] == pytest.approx(100.2)
    assert sell["price"] == pytest.approx(99.8)
    assert buy["commission"] == pytest.approx(buy["qty"] * 100.2 * 0.001 + 2)
    assert res.equity.iloc[-1] < 10_000
    tr = res.trades.iloc[0]
    # P&L des Trades plus Kosten ergeben die Veränderung des Depotwerts
    assert tr["net_pnl"] == pytest.approx(res.equity.iloc[-1] - 10_000, rel=1e-9)


def test_integer_shares_and_cash_never_negative():
    p = make_panel({"A": [333.0] * 6})
    cfg = Config(initial_capital=10_000, costs=Costs(commission_fixed=5, slippage_bps=10))
    res = engine.simulate(p, weights(p, [1] * 6), cfg)
    assert res.fills.iloc[0]["qty"] == int(res.fills.iloc[0]["qty"])
    assert (res.cash >= -1e-9).all()


def test_stop_loss_fills_at_stop_level_intraday(no_costs):
    p = make_panel({"A": [100, 100, 100, 97, 95]}, opens={"A": [100, 100, 100, 99, 96]},
                   lows={"A": [100, 100, 99, 94, 94]}, highs={"A": [100, 100, 101, 99, 96]})
    no_costs.stop_loss = 0.05
    res = engine.simulate(p, weights(p, [1] * 5), no_costs)
    stop = res.fills[res.fills["reason"] == "Stop-Loss"].iloc[0]
    assert stop["date"] == p.index[3]
    assert stop["price"] == pytest.approx(95.0)


def test_stop_loss_gap_fills_at_open(no_costs):
    p = make_panel({"A": [100, 100, 100, 85, 85]}, opens={"A": [100, 100, 100, 88, 85]},
                   lows={"A": [100, 100, 99, 84, 84]})
    no_costs.stop_loss = 0.05
    res = engine.simulate(p, weights(p, [1] * 5), no_costs)
    stop = res.fills[res.fills["reason"] == "Stop-Loss"].iloc[0]
    assert stop["price"] == pytest.approx(88.0)


def test_no_reentry_after_stop_until_signal_resets(no_costs):
    p = make_panel({"A": [100, 100, 90, 100, 100, 100, 100]}, lows={"A": [100, 100, 89, 100, 100, 100, 100]})
    no_costs.stop_loss = 0.05
    res = engine.simulate(p, weights(p, [1, 1, 1, 1, 0, 1, 1]), no_costs)
    buys = res.fills[res.fills["qty"] > 0]
    assert len(buys) == 2
    assert buys.iloc[1]["date"] == p.index[6]


def test_short_position_profits_when_price_falls(no_costs):
    p = make_panel({"A": [100, 100, 90, 80]})
    no_costs.rebalance_threshold = 1.0  # Position halten, nicht auf -100 % nachjustieren
    res = engine.simulate(p, weights(p, [-1, -1, -1, -1]), no_costs)
    assert res.equity.iloc[-1] == pytest.approx(10_000 * 1.2)
    assert res.trades.iloc[0]["side"] == "short"


def test_borrow_fee_reduces_short_pnl():
    p = make_panel({"A": [100.0] * 30})
    cfg = Config(initial_capital=10_000, integer_shares=False,
                 costs=Costs(commission_fixed=0, slippage_bps=0, borrow_bps=252 * 100))  # 1 %/Tag
    res = engine.simulate(p, weights(p, [-1] * 30), cfg)
    assert res.equity.iloc[-1] < 10_000 * 0.8


def test_rebalance_threshold_limits_trading():
    p = data.synthetic(2, days=300, seed=1)
    w = pd.DataFrame(0.5, index=p.index, columns=p.symbols)
    loose = engine.simulate(p, w, Config(rebalance_threshold=0.2))
    tight = engine.simulate(p, w, Config(rebalance_threshold=0.0))
    assert len(loose.fills) < len(tight.fills)


def test_trade_ledger_reconciles_with_equity(no_costs):
    p = data.synthetic(3, days=800, seed=3)
    res = engine.run(p, strategies.get("sma_cross", fast=10, slow=40), config=no_costs)
    assert res.trades["net_pnl"].sum() == pytest.approx(res.equity.iloc[-1] - res.equity.iloc[0], rel=1e-6)


def test_start_date_uses_history_for_warmup():
    p = data.synthetic(1, days=600, seed=5)
    start = p.index[300]
    res = engine.run(p, strategies.get("trend", n=200), start=start)
    assert res.equity.index[1] == start
    assert res.equity.iloc[0] == 100_000


def test_strategy_signals_do_not_use_future_data():
    """Signale bis Tag t dürfen sich nicht ändern, wenn spätere Kurse hinzukommen."""
    p = data.synthetic(4, days=700, seed=11)
    cut = p.slice(None, p.index[500])
    for name, cls in strategies.STRATEGIES.items():
        s = cls()
        full = s.signals(p).loc[: p.index[500]]
        part = s.signals(cut)
        pd.testing.assert_frame_equal(full, part, check_names=False, obj=name)


def test_invalid_params_rejected():
    with pytest.raises(ValueError):
        strategies.get("sma_cross", fast=200, slow=50)
    with pytest.raises(ValueError):
        strategies.get("sma_cross", foo=1)


def test_all_strategies_run_end_to_end():
    p = data.synthetic(4, days=900, seed=2)
    for name in strategies.STRATEGIES:
        res = engine.run(p, strategies.get(name))
        assert np.isfinite(res.equity).all(), name
        assert (res.equity > 0).all(), name


def test_symbols_with_shorter_history_do_not_break_accounting():
    """Ein Wert ohne Kurse am Anfang (NaN) darf Cash und Depotwert nicht verfälschen."""
    p = data.synthetic(["A", "B"], days=400, seed=6)
    for f in ("open", "high", "low", "close"):
        getattr(p, f).iloc[:150, 1] = np.nan
    res = engine.run(p, strategies.get("xsmom", lookback=63, skip=0, top=1), config=Config())
    assert np.isfinite(res.equity).all()
    assert np.isfinite(res.cash).all()
    assert res.fills["qty"].notna().all()
