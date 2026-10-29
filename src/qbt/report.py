"""HTML-Tearsheet: ein eigenständiger Bericht mit allen Kennzahlen, Grafiken und Robustheitstests."""

from __future__ import annotations

import html
import math
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

import pandas as pd
import plotly.io as pio

from . import charts, metrics


def assess(stats: dict, wf=None, pbo=None, costs: pd.DataFrame | None = None) -> list[tuple[str, str]]:
    """Bewertet einen Backtest wie ein skeptischer Risikomanager. Gibt (Stufe, Text) zurück,
    Stufe ist 'ok', 'warn' oder 'bad'."""
    out = []
    n = stats.get("closed_trades", 0) or 0
    if n < 30:
        out.append(("warn", f"Nur {n} abgeschlossene Trades. Unter etwa 30 Trades sind Trefferquote und "
                            "Profit-Faktor statistisch kaum belastbar."))
    psr = stats.get("psr")
    if psr is not None and not math.isnan(psr):
        lvl = "ok" if psr >= 0.95 else "warn" if psr >= 0.8 else "bad"
        out.append((lvl, f"Probabilistic Sharpe Ratio {psr:.0%}: So sicher ist, dass die wahre Sharpe "
                         "Ratio über null liegt (Konfidenzziel 95 %)."))
    dsr = stats.get("dsr")
    if dsr is not None and not math.isnan(dsr):
        lvl = "ok" if dsr >= 0.95 else "warn" if dsr >= 0.5 else "bad"
        out.append((lvl, f"Deflated Sharpe Ratio {dsr:.0%}: Die Sharpe Ratio nach Abzug des Glücks, das "
                         "beim Testen vieler Parameterkombinationen entsteht."))
    if "benchmark_cagr" in stats and not math.isnan(stats.get("benchmark_cagr", float("nan"))):
        d = stats["cagr"] - stats["benchmark_cagr"]
        sd = stats["sharpe"] - stats.get("benchmark_sharpe", float("nan"))
        if d < 0 and not sd > 0:
            out.append(("bad", f"Schlechter als die Benchmark: {d * 100:+.1f} Prozentpunkte Rendite p. a. "
                               "bei nicht besserem Chance-Risiko-Verhältnis."))
        elif d < 0:
            out.append(("warn", f"Weniger Rendite als die Benchmark ({d * 100:+.1f} Pp. p. a.), "
                                "aber bessere Sharpe Ratio. Mit Hebel vergleichbar machen "
                                "oder als Risikoreduktion werten."))
        else:
            out.append(("ok", f"Mehr Rendite als die Benchmark: {d * 100:+.1f} Prozentpunkte p. a."))
    if wf is not None and not math.isnan(wf.efficiency):
        lvl = "ok" if wf.efficiency >= 0.5 else "warn" if wf.efficiency >= 0.2 else "bad"
        out.append((lvl, f"Walk-Forward-Effizienz {wf.efficiency:.2f}: Anteil der In-Sample-Rendite, der in "
                         "ungesehenen Daten übrig bleibt (ab etwa 0,5 gilt als robust)."))
    if pbo is not None:
        lvl = "ok" if pbo.pbo < 0.25 else "warn" if pbo.pbo < 0.5 else "bad"
        out.append((lvl, f"Probability of Backtest Overfitting {pbo.pbo:.0%}: So oft schneidet die "
                         "In-Sample-beste Parameterwahl außerhalb der Stichprobe schlechter als der Median ab."))
    if costs is not None and len(costs) >= 3:
        base, dbl = costs.iloc[1]["CAGR"], costs.iloc[2]["CAGR"]
        if base > 0 and (base - dbl) / base > 0.25:
            out.append(("warn", "Kostensensibel: Doppelte Handelskosten kosten mehr als ein Viertel der Rendite."))
    if stats.get("exposure", 1) < 0.3:
        out.append(("warn", f"Nur {stats['exposure']:.0%} der Zeit investiert. "
                            "Wenige Marktphasen tragen das Ergebnis."))
    return out


_CSS = """
:root{--bg:#f3f5f7;--surface:#fff;--ink:#1b2733;--muted:#5d6b78;--line:#dbe1e7;--accent:#c0641c;
--ok:#1f8a55;--warn:#a86a00;--bad:#c8382d}
@media (prefers-color-scheme:dark){:root{--bg:#10161d;--surface:#17202a;--ink:#e5eaef;--muted:#95a3b1;
--line:#28333f;--accent:#ee9a4c;--ok:#4cc38a;--warn:#e0a63a;--bad:#f0716a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);
font:14px/1.5 "IBM Plex Sans","Segoe UI",system-ui,sans-serif;padding:24px max(16px,3vw)}
.wrap{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
h1{font-size:26px;margin:0}h2{font-size:17px;margin:0 0 10px}.muted{color:var(--muted)}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:16px 18px;min-width:0}
.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}
@media(max-width:900px){.grid2{grid-template-columns:minmax(0,1fr)}}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{padding:5px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
th:first-child,td:first-child{text-align:left}th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;
color:var(--muted)}td{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12.5px}
td:first-child{font-family:inherit}.scroll{overflow-x:auto}
ul.verdict{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px}
ul.verdict li{padding-left:14px;border-left:3px solid var(--line)}
li.ok{border-color:var(--ok)!important}li.warn{border-color:var(--warn)!important}li.bad{border-color:var(--bad)!important}
.meta{display:flex;flex-wrap:wrap;gap:4px 18px;font-size:12.5px;color:var(--muted)}
"""

KPI_ORDER = ["final", "total_return", "cagr", "volatility", "sharpe", "sortino", "max_drawdown", "calmar",
             "longest_drawdown_days", "ulcer_index", "var_95", "cvar_95", "skew", "kurtosis", "exposure",
             "avg_gross", "turnover", "cost_drag", "psr", "dsr", "min_trl_years"]
REL_ORDER = ["benchmark_cagr", "benchmark_sharpe", "benchmark_max_drawdown", "alpha", "beta", "correlation",
             "tracking_error", "information_ratio", "up_capture", "down_capture"]
TRADE_ORDER = ["trades", "win_rate", "avg_return", "avg_win", "avg_loss", "payoff_ratio", "profit_factor",
               "expectancy", "best_trade", "worst_trade", "avg_bars", "max_consecutive_losses", "avg_mae",
               "avg_mfe", "total_costs"]


GRID_COLS = {"cagr": "CAGR", "sharpe": "Sharpe", "sortino": "Sortino", "max_drawdown": "Max. Drawdown",
             "calmar": "Calmar", "trades": "Trades", "exposure": "Zeit im Markt"}
WF_COLS = {"train_start": "Training ab", "train_end": "Training bis", "test_start": "Test ab", "test_end": "Test bis",
           "params": "Gewählte Parameter", "is_score": "Zielwert Training", "is_cagr": "CAGR Training",
           "oos_cagr": "CAGR Test"}


def _kv(stats: dict, keys: list[str]) -> str:
    rows = "".join(f"<tr><td>{html.escape(metrics.LABELS.get(k, k))}</td><td>{metrics.fmt(k, stats.get(k))}</td></tr>"
                   for k in keys if k in stats)
    return f"<table>{rows}</table>"


def _df(df: pd.DataFrame, pct_cols=(), num_cols=(), index=False) -> str:
    d = df.copy()
    for c in d.columns:
        if c in pct_cols:
            d[c] = d[c].map(lambda v: metrics.fmt("cagr", v))
        elif c in num_cols:
            d[c] = d[c].map(lambda v: metrics.fmt("sharpe", v))
    return d.to_html(index=index, border=0, escape=True, na_rep="–")


def _fig(fig, first: list[bool], plotlyjs: str) -> str:
    inc = plotlyjs if first[0] else False
    first[0] = False
    return pio.to_html(fig, full_html=False, include_plotlyjs=inc, config={"displaylogo": False})


def build(result, panel, stats: dict, bench: pd.Series | None = None, grid=None, wf=None, mc=None,
          pbo=None, costs: pd.DataFrame | None = None, title: str | None = None,
          plotlyjs: str = "cdn") -> str:
    """Erzeugt den Bericht als vollständiges HTML-Dokument.

    `plotlyjs="inline"` bettet Plotly ein (offline lesbar, etwa 4 MB), sonst wird es vom CDN geladen.
    """
    first = [True]
    pj = True if plotlyjs == "inline" else "cdn"
    params = ", ".join(f"{k}={v}" for k, v in result.params.items()) or "–"
    cfg = result.config
    c = cfg.costs
    title = title or f"Backtest {result.strategy}"
    syms = ", ".join(panel.symbols)
    verdict = "".join(f'<li class="{lvl}">{html.escape(msg)}</li>' for lvl, msg in assess(stats, wf, pbo, costs))
    parts = [
        "<div class='wrap'>",
        f"<header><h1>{html.escape(title)}</h1><div class='meta'>"
        f"<span>Strategie: <b>{html.escape(result.strategy)}</b> ({html.escape(params)})</span>"
        f"<span>Werte: {html.escape(syms)}</span>"
        f"<span>Zeitraum: {stats['start']} bis {stats['end']} ({stats['years']:.1f} Jahre)</span>"
        f"<span>Ausführung: nächste {'Eröffnung' if cfg.execution == 'open' else 'Schlusskurs'}</span>"
        f"<span>Kosten: {c.commission_bps:g} bp + {c.commission_fixed:g} fix, Slippage {c.slippage_bps:g} bp</span>"
        f"<span>Erstellt: {datetime.now():%d.%m.%Y %H:%M}</span></div></header>",
        f"<section class='panel'><h2>Einschätzung</h2><ul class='verdict'>{verdict}</ul></section>",
        f"<section class='panel'>{_fig(charts.combined(result, bench), first, pj)}</section>",
        "<div class='grid2'>",
        f"<section class='panel'><h2>Rendite und Risiko</h2>{_kv(stats, KPI_ORDER)}</section>",
        "<div style='display:flex;flex-direction:column;gap:18px'>",
        f"<section class='panel'><h2>Gegenüber der Benchmark</h2>{_kv(stats, REL_ORDER)}</section>"
        if "beta" in stats else "",
        f"<section class='panel'><h2>Trades</h2>{_kv(stats, TRADE_ORDER)}</section></div></div>",
        f"<section class='panel'>{_fig(charts.monthly_heatmap(result), first, pj)}</section>",
        "<div class='grid2'>",
        f"<section class='panel'>{_fig(charts.rolling_sharpe(result, bench), first, pj)}</section>",
        f"<section class='panel'>{_fig(charts.return_hist(result), first, pj)}</section></div>",
    ]
    if len(panel.symbols) > 1:
        parts.append(f"<section class='panel'>{_fig(charts.exposure(result), first, pj)}</section>")
    ddp = metrics.drawdown_periods(result.equity)
    if len(ddp):
        ddp = ddp.assign(start=ddp["start"].dt.date, trough=ddp["trough"].dt.date,
                         recovery=ddp["recovery"].dt.date.astype(object).where(ddp["recovery"].notna(), "offen"))
        ddp.columns = ["Beginn", "Tiefpunkt", "Erholt", "Tiefe", "Dauer (Tage)", "Bis Tiefpunkt (Tage)"]
        parts.append(f"<section class='panel'><h2>Die tiefsten Drawdowns</h2><div class='scroll'>"
                     f"{_df(ddp, pct_cols=['Tiefe'])}</div></section>")
    if len(result.trades):
        parts.append(f"<section class='panel'>{_fig(charts.trade_scatter(result.trades), first, pj)}</section>")
        t = result.trades.tail(100).iloc[::-1].copy()
        t["entry_date"] = t["entry_date"].dt.date
        t["exit_date"] = t["exit_date"].dt.date
        t = t[["symbol", "side", "entry_date", "exit_date", "entry_price", "exit_price", "qty", "net_pnl",
               "return", "bars", "mae", "mfe", "exit_reason"]]
        t["qty"] = t["qty"].map(lambda v: f"{v:,.0f}".replace(",", ".") if v == int(v) else f"{v:,.4f}")
        t.columns = ["Symbol", "Seite", "Einstieg", "Ausstieg", "Kurs ein", "Kurs aus", "Stück", "Netto-P&L",
                     "Rendite", "Tage", "MAE", "MFE", "Grund"]
        parts.append(f"<section class='panel'><h2>Trades (letzte 100)</h2><div class='scroll' style='max-height:420px'>"
                     f"{_df(t, pct_cols=['Rendite', 'MAE', 'MFE'], num_cols=['Kurs ein', 'Kurs aus', 'Netto-P&L'])}"
                     f"</div></section>")
    if grid is not None:
        keys = [k for k in grid.params[0]] if grid.params else []
        if len(keys) >= 2:
            parts.append(f"<section class='panel'>{_fig(charts.grid_heatmap(grid.table, keys[0], keys[1]), first, pj)}"
                         f"<p class='muted'>Ein robuster Ansatz zeigt eine breite grüne Fläche, keine einzelne Spitze. "
                         f"{grid.n_trials} Kombinationen getestet.</p></section>")
        top = grid.table.sort_values("sharpe", ascending=False).head(10).rename(columns=GRID_COLS)
        parts.append(f"<section class='panel'><h2>Beste Parameter (nach Sharpe)</h2><div class='scroll'>"
                     f"{_df(top, ['CAGR', 'Max. Drawdown', 'Zeit im Markt'], ['Sharpe', 'Sortino', 'Calmar'])}"
                     f"</div></section>")
    if wf is not None:
        f = wf.folds.copy()
        f["params"] = f["params"].map(lambda p: ", ".join(f"{k}={v}" for k, v in p.items()))
        f = f.rename(columns=WF_COLS)
        parts.append(f"<section class='panel'>{_fig(charts.walk_forward(wf), first, pj)}<div class='scroll'>"
                     f"{_df(f, pct_cols=['CAGR Training', 'CAGR Test'], num_cols=['Zielwert Training'])}</div>"
                     f"<p class='muted'>Walk-Forward-Effizienz: {metrics.fmt('sharpe', wf.efficiency)}</p></section>")
    if pbo is not None:
        parts.append(f"<section class='panel'>{_fig(charts.pbo_hist(pbo), first, pj)}"
                     f"<p class='muted'>PBO = {pbo.pbo:.0%} aus {pbo.n_splits} Aufteilungen.</p></section>")
    if mc is not None:
        s = mc.summary()
        parts.append(f"<section class='panel'>{_fig(charts.monte_carlo(mc, cfg.initial_capital), first, pj)}"
                     f"<div class='scroll'>{_df(s.reset_index(), ['CAGR', 'Max. Drawdown'], ['Endwert (x)'])}"
                     f"</div><p class='muted'>Wahrscheinlichkeit eines Verlusts über den gesamten Zeitraum: "
                     f"{mc.prob_loss:.1%}</p></section>")
    if costs is not None:
        parts.append(f"<section class='panel'><h2>Kostensensitivität</h2><div class='scroll'>"
                     f"{_df(costs, pct_cols=['CAGR', 'Max. Drawdown'], num_cols=['Sharpe', 'Kosten gesamt'])}"
                     f"</div></section>")
    parts.append(
        "<p class='muted'>Konfiguration: " + html.escape(str(asdict(cfg))) + "</p>"
        "<p class='muted'>Ein Backtest beschreibt die Vergangenheit. Nicht abgebildet: Steuern, "
        "Survivorship Bias der Werteauswahl, Marktauswirkungen großer Orders, Währungseffekte. "
        "Keine Anlageberatung.</p></div>")
    return (f"<!doctype html><html lang='de'><head><meta charset='utf-8'>"
            f"<meta name='viewport' content='width=device-width,initial-scale=1'>"
            f"<title>{html.escape(title)}</title><style>{_CSS}</style></head><body>"
            + "\n".join(parts) + "</body></html>")


def write(path: str | Path, document: str) -> Path:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(document, encoding="utf-8")
    return p
