"""Kommandozeile: `qbt run`, `qbt download`, `qbt strategies`."""

from __future__ import annotations

import argparse
import logging
import sys

from . import data, metrics, pipeline, strategies


def _parse_kv(items: list[str]) -> dict:
    out = {}
    for it in items or []:
        k, _, v = it.partition("=")
        for cast in (int, float):
            try:
                v = cast(v)
                break
            except ValueError:
                continue
        if v in ("true", "false"):
            v = v == "true"
        out[k] = v
    return out


def cmd_run(a) -> int:
    if a.config:
        spec = pipeline.Spec.from_yaml(a.config)
    else:
        if not a.symbols:
            print("Bitte --config oder --symbols angeben.", file=sys.stderr)
            return 2
        spec = pipeline.Spec(symbols=a.symbols)
    if a.symbols:
        spec.symbols = a.symbols
    if a.strategy:
        spec.strategy, spec.params, spec.grid = a.strategy, {}, None
    spec.params.update(_parse_kv(a.param))
    spec.start = a.start or spec.start
    spec.end = a.end or spec.end
    spec.benchmark = a.benchmark or spec.benchmark
    if a.fast:
        spec.run_grid, spec.walk_forward, spec.pbo, spec.monte_carlo, spec.cost_sensitivity = \
            False, None, None, None, False
    out = pipeline.execute(spec, progress=lambda m: print(f"… {m}", file=sys.stderr))
    keys = ["start", "end", "final", "total_return", "cagr", "volatility", "sharpe", "sortino", "max_drawdown",
            "calmar", "psr", "dsr", "benchmark_cagr", "benchmark_sharpe", "alpha", "beta", "trades", "win_rate",
            "profit_factor", "exposure", "cost_drag"]
    print(metrics.table(out.stats, [k for k in keys if k in out.stats]).to_string(index=False))
    if out.wf is not None:
        print(f"\nWalk-Forward-Effizienz: {metrics.fmt('sharpe', out.wf.efficiency)}  "
              f"OOS-CAGR: {metrics.fmt('cagr', metrics.cagr(out.wf.oos.equity))}")
    if out.pbo is not None:
        print(f"Probability of Backtest Overfitting: {out.pbo.pbo:.0%}")
    if not a.no_report:
        p = pipeline.write_report(out, a.report, "inline" if a.offline else "cdn")
        print(f"\nBericht: {p}")
    return 0


def cmd_download(a) -> int:
    p = data.load(a.symbols, refresh=True)
    for s in p.symbols:
        c = p.close[s].dropna()
        print(f"{s:10s} {len(c):6d} Tage  {c.index[0].date()} bis {c.index[-1].date()}  {p.currency.get(s, '')}")
    for issue in data.validate(p):
        print("Hinweis:", issue)
    return 0


def cmd_strategies(a) -> int:
    for name, cls in strategies.STRATEGIES.items():
        print(f"{name:12s} {cls.label}")
        print(f"{'':12s} {cls.description}")
        if cls.defaults:
            print(f"{'':12s} Parameter: {cls.defaults}")
        print()
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="qbt", description="Backtesting für Aktien und ETFs")
    ap.add_argument("-v", "--verbose", action="store_true")
    sub = ap.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("run", help="Backtest mit Robustheitstests und HTML-Bericht")
    r.add_argument("config", nargs="?", help="YAML-Konfiguration (siehe configs/)")
    r.add_argument("--symbols", nargs="+")
    r.add_argument("--strategy", choices=list(strategies.STRATEGIES))
    r.add_argument("--param", nargs="*", help="Parameter als name=wert, z. B. fast=20 slow=100")
    r.add_argument("--start")
    r.add_argument("--end")
    r.add_argument("--benchmark")
    r.add_argument("--report", help="Pfad des HTML-Berichts")
    r.add_argument("--no-report", action="store_true")
    r.add_argument("--offline", action="store_true", help="Plotly in den Bericht einbetten")
    r.add_argument("--fast", action="store_true", help="Nur Backtest, ohne Robustheitstests")
    r.set_defaults(func=cmd_run)

    d = sub.add_parser("download", help="Kurse von Yahoo Finance laden und prüfen")
    d.add_argument("symbols", nargs="+")
    d.set_defaults(func=cmd_download)

    s = sub.add_parser("strategies", help="Verfügbare Strategien anzeigen")
    s.set_defaults(func=cmd_strategies)

    a = ap.parse_args(argv)
    logging.basicConfig(level=logging.INFO if a.verbose else logging.WARNING, format="%(levelname)s %(message)s")
    return a.func(a)


if __name__ == "__main__":
    sys.exit(main())
