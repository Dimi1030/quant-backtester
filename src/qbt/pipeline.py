"""Führt einen vollständigen Backtest samt Robustheitstests aus einer Konfiguration aus.
Wird von der Kommandozeile und vom Dashboard gemeinsam genutzt."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd
import yaml

from . import data, engine, metrics, robustness, sizing, strategies


@dataclass
class Spec:
    symbols: list[str]
    strategy: str = "sma_cross"
    params: dict[str, Any] = field(default_factory=dict)
    grid: dict[str, list] | None = None
    sizer: str = "equal"
    sizer_params: dict[str, Any] = field(default_factory=dict)
    config: dict[str, Any] = field(default_factory=dict)
    start: str | None = None
    end: str | None = None
    benchmark: str | None = None
    run_grid: bool = True
    walk_forward: dict[str, Any] | None = field(default_factory=dict)
    monte_carlo: dict[str, Any] | None = field(default_factory=dict)
    pbo: dict[str, Any] | None = field(default_factory=dict)
    cost_sensitivity: bool = True
    report: str | None = None
    title: str | None = None

    @classmethod
    def from_yaml(cls, path: str | Path) -> Spec:
        raw = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
        st = raw.get("strategy", {})
        sz = raw.get("sizing", {})
        rb = raw.get("robustness", {}) or {}
        return cls(
            symbols=list(raw["symbols"]),
            strategy=st.get("name", "sma_cross"), params=st.get("params") or {}, grid=st.get("grid"),
            sizer=sz.get("name", "equal"), sizer_params=sz.get("params") or {},
            config=raw.get("config") or {}, start=_s(raw.get("start")), end=_s(raw.get("end")),
            benchmark=raw.get("benchmark"),
            run_grid=bool(rb.get("grid", True)),
            walk_forward=rb.get("walk_forward", {}), monte_carlo=rb.get("monte_carlo", {}),
            pbo=rb.get("pbo", {}), cost_sensitivity=bool(rb.get("cost_sensitivity", True)),
            report=raw.get("report"), title=raw.get("title"),
        )


def _s(v):
    return None if v is None else str(v)


@dataclass
class Outcome:
    spec: Spec
    panel: data.Panel
    result: engine.Result
    stats: dict
    bench: pd.Series
    grid: robustness.GridResult | None = None
    wf: robustness.WalkForwardResult | None = None
    mc: robustness.MonteCarloResult | None = None
    pbo: robustness.PBOResult | None = None
    costs: pd.DataFrame | None = None


def execute(spec: Spec, panel: data.Panel | None = None, progress=None) -> Outcome:
    say = progress or (lambda msg: None)
    if panel is None:
        say("Lade Kursdaten")
        need = list(dict.fromkeys(spec.symbols + ([spec.benchmark] if spec.benchmark else [])))
        full = data.load(need)
    else:
        full = panel
    trade_panel = full.select(spec.symbols)
    cls = strategies.STRATEGIES[spec.strategy]
    strat = cls(**spec.params)
    sz = sizing.get(spec.sizer, **spec.sizer_params)
    cfg = engine.Config(**spec.config)

    say("Simuliere Strategie")
    res = engine.run(trade_panel, strat, sz, cfg, spec.start, spec.end)
    bench = engine.benchmark_returns(full, spec.benchmark, res.equity.index[0], res.equity.index[-1]) \
        if spec.benchmark else engine.benchmark_returns(trade_panel, None, res.equity.index[0], res.equity.index[-1])

    out = Outcome(spec, trade_panel, res, {}, bench)
    grid_spec = spec.grid or cls.grid
    if spec.run_grid and grid_spec:
        say("Teste Parameter-Raster")
        out.grid = robustness.grid_search(trade_panel, cls, grid_spec, sz, cfg, spec.start, spec.end)
        if spec.pbo is not None and out.grid.n_trials >= 4:
            say("Berechne Probability of Backtest Overfitting")
            out.pbo = robustness.pbo(out.grid.returns.iloc[1:], **(spec.pbo or {}))
    if spec.walk_forward is not None and grid_spec:
        say("Walk-Forward-Analyse")
        try:
            out.wf = robustness.walk_forward(trade_panel, cls, grid_spec, sz, cfg, start=spec.start, end=spec.end,
                                             **(spec.walk_forward or {}))
        except ValueError as exc:
            say(f"Walk-Forward übersprungen: {exc}")
    if spec.monte_carlo is not None:
        say("Monte-Carlo-Simulation")
        out.mc = robustness.monte_carlo(res.returns.iloc[1:], periods=cfg.periods_per_year, **(spec.monte_carlo or {}))
    if spec.cost_sensitivity:
        say("Kostensensitivität")
        out.costs = robustness.cost_sensitivity(trade_panel, strat, sz, cfg, spec.start, spec.end)

    n_trials = out.grid.n_trials if out.grid else 1
    out.stats = metrics.summary(res, bench, n_trials=n_trials,
                                trial_sharpes=out.grid.table["sharpe"].to_numpy() if out.grid else None)
    return out


def write_report(out: Outcome, path: str | Path | None = None, plotlyjs: str = "cdn") -> Path:
    from . import report

    path = path or out.spec.report or f"reports/{out.spec.strategy}_{'_'.join(out.spec.symbols)[:40]}.html"
    doc = report.build(out.result, out.panel, out.stats, out.bench, out.grid, out.wf, out.mc, out.pbo, out.costs,
                       title=out.spec.title, plotlyjs=plotlyjs)
    return report.write(path, doc)
