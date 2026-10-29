import numpy as np
import pandas as pd
import pytest

from qbt import data, pipeline, robustness, strategies
from qbt.engine import Config


@pytest.fixture(scope="module")
def panel():
    return data.synthetic(2, days=1600, seed=4)


def test_grid_search_covers_valid_space(panel):
    g = robustness.grid_search(panel, strategies.SMACrossover, {"fast": [10, 50], "slow": [20, 40, 100]})
    assert g.n_trials == 4  # nur fast < slow
    assert set(g.table.columns) >= {"fast", "slow", "sharpe", "cagr"}
    assert g.returns.shape[1] == 4


def test_walk_forward_windows_are_sequential(panel):
    wf = robustness.walk_forward(panel, strategies.TrendFilter, {"n": [20, 50], "band": [0.0]},
                                 train_years=2, test_years=1)
    f = wf.folds
    assert len(f) >= 3
    for a, b in zip(f.itertuples(), f.iloc[1:].itertuples(), strict=False):
        assert pd.Timestamp(b.test_start) > pd.Timestamp(a.test_end)
        assert pd.Timestamp(a.train_end) < pd.Timestamp(a.test_start)
    assert wf.oos.equity.index[1] >= pd.Timestamp(f.iloc[0]["test_start"])


def test_pbo_of_pure_noise_is_near_half():
    rng = np.random.default_rng(0)
    noise = pd.DataFrame(rng.normal(0, 0.01, (2000, 30)))
    res = robustness.pbo(noise, n_blocks=10)
    assert 0.3 < res.pbo < 0.7
    assert res.n_splits == 252


def test_pbo_of_genuine_edge_is_low():
    rng = np.random.default_rng(1)
    m = pd.DataFrame(rng.normal(0, 0.01, (2000, 20)))
    m[0] += 0.003  # eine Variante hat einen echten, stabilen Vorteil
    assert robustness.pbo(m).pbo < 0.1


def test_monte_carlo_shapes_and_bounds():
    rng = np.random.default_rng(3)
    r = pd.Series(rng.normal(0.0004, 0.01, 1000))
    mc = robustness.monte_carlo(r, n_sims=300, block=10)
    assert mc.cagr.shape == (300,)
    assert (mc.max_drawdown <= 0).all()
    assert list(mc.summary().columns) == ["CAGR", "Max. Drawdown", "Endwert (x)"]
    assert 0 <= mc.prob_loss <= 1


def test_cost_sensitivity_is_monotonic(panel):
    cs = robustness.cost_sensitivity(panel, strategies.get("sma_cross", fast=10, slow=30), config=Config())
    assert cs["CAGR"].is_monotonic_decreasing


def test_pipeline_end_to_end_with_report(panel, tmp_path):
    spec = pipeline.Spec(symbols=panel.symbols, strategy="trend", grid={"n": [20, 50, 100], "band": [0.0, 0.02]},
                         walk_forward={"train_years": 2, "test_years": 1}, monte_carlo={"n_sims": 100},
                         pbo={"n_blocks": 6})
    out = pipeline.execute(spec, panel=panel)
    assert out.grid.n_trials == 6 and out.wf is not None and out.pbo is not None
    assert not np.isnan(out.stats["dsr"])
    path = pipeline.write_report(out, tmp_path / "r.html")
    html = path.read_text(encoding="utf-8")
    assert "<title>" in html and "Walk-Forward" in html
