"""Web-Dashboard für qbt. Start: `streamlit run app/dashboard.py`"""

from __future__ import annotations

import math

import pandas as pd
import streamlit as st

from qbt import charts, data, engine, metrics, pipeline, report, robustness, sizing, strategies

st.set_page_config(page_title="qbt Backtesting", page_icon="📈", layout="wide")

UNIVERSE = {
    "SPY": "S&P 500", "QQQ": "Nasdaq-100", "EUNL.DE": "MSCI World (Xetra)", "EXS1.DE": "DAX (Xetra)",
    "IWM": "Russell 2000", "EEM": "Schwellenländer", "TLT": "US-Anleihen 20+ J.", "IEF": "US-Anleihen 7-10 J.",
    "GLD": "Gold", "AAPL": "Apple", "MSFT": "Microsoft", "NVDA": "Nvidia", "AMZN": "Amazon", "TSLA": "Tesla",
    "SAP.DE": "SAP", "SIE.DE": "Siemens", "ALV.DE": "Allianz",
}


@st.cache_data(ttl=6 * 3600, show_spinner="Lade Kursdaten von Yahoo Finance …")
def load_panel(symbols: tuple[str, ...]) -> data.Panel:
    return data.load(list(symbols))


def param_inputs(cls: type[strategies.Strategy]) -> dict:
    out = {}
    cols = st.sidebar.columns(2)
    for j, (k, v) in enumerate(cls.defaults.items()):
        col = cols[j % 2]
        key = f"{cls.name}.{k}"
        if isinstance(v, bool):
            out[k] = col.checkbox(k, v, key=key)
        elif k == "kind":
            out[k] = col.selectbox(k, ["sma", "ema"], index=["sma", "ema"].index(v), key=key)
        elif isinstance(v, int):
            out[k] = int(col.number_input(k, value=v, min_value=0, step=1, key=key))
        else:
            out[k] = float(col.number_input(k, value=float(v), step=0.01, format="%.2f", key=key))
    return out


def pct(v, d=1):
    return "–" if v is None or (isinstance(v, float) and math.isnan(v)) else f"{v * 100:.{d}f} %".replace(".", ",")


def num(v, d=2):
    return "–" if v is None or (isinstance(v, float) and math.isnan(v)) else f"{v:.{d}f}".replace(".", ",")


# ----------------------------------------------------------------------------- Seitenleiste
sb = st.sidebar
sb.header("Universum")
picked = sb.multiselect("Werte", list(UNIVERSE), default=["SPY"], format_func=lambda s: f"{s} · {UNIVERSE[s]}")
extra = sb.text_input("Weitere Yahoo-Symbole (kommagetrennt)", placeholder="z. B. VOW3.DE, BTC-USD")
symbols = list(dict.fromkeys(picked + [s.strip().upper() for s in extra.split(",") if s.strip()]))
bench_sym = sb.selectbox("Benchmark", ["Gleichgewichtet (Universum)"] + list(dict.fromkeys(symbols + ["SPY"])))
c1, c2 = sb.columns(2)
start = c1.date_input("Von", pd.Timestamp("2010-01-01"), min_value=pd.Timestamp("1990-01-01"))
end = c2.date_input("Bis", pd.Timestamp.today())

sb.header("Strategie")
sname = sb.selectbox("Regel", list(strategies.STRATEGIES), format_func=lambda n: strategies.STRATEGIES[n].label)
cls = strategies.STRATEGIES[sname]
sb.caption(cls.description)
params = param_inputs(cls)

sb.header("Positionsgröße")
sz_name = sb.radio("Methode", ["equal", "vol_target"], horizontal=True,
                   format_func=lambda s: "Gleichgewichtet" if s == "equal" else "Volatilitätsziel")
slot = sb.radio("Kapital je Wert", ["universe", "active"], horizontal=True,
                format_func=lambda s: "fester Anteil 1/N" if s == "universe" else "auf aktive Signale verteilt")
sz_params = {"slot": slot}
if sz_name == "vol_target":
    a, b = sb.columns(2)
    sz_params["target"] = a.number_input("Zielvola p. a.", 0.02, 0.5, 0.15, 0.01)
    sz_params["lookback"] = int(b.number_input("Fenster (Tage)", 10, 252, 60, 5))
    sz_params["max_weight"] = a.number_input("Max. Gewicht", 0.05, 2.0, 1.0, 0.05)
    sz_params["max_gross"] = b.number_input("Max. Brutto", 0.1, 3.0, 1.0, 0.1)

sb.header("Ausführung & Kosten")
a, b = sb.columns(2)
capital = a.number_input("Startkapital", 1000, 100_000_000, 100_000, 1000)
execution = b.selectbox("Ausführung", ["open", "close"],
                        format_func=lambda s: "nächste Eröffnung" if s == "open" else "nächster Schluss")
comm_bps = a.number_input("Gebühr (bp)", 0.0, 100.0, 0.0, 0.5)
comm_fix = b.number_input("Fixgebühr", 0.0, 50.0, 1.0, 0.5)
slip = a.number_input("Slippage (bp)", 0.0, 100.0, 5.0, 0.5)
thr = b.number_input("Rebalancing-Schwelle", 0.0, 0.5, 0.02, 0.01)
sl = a.number_input("Stop-Loss %", 0.0, 90.0, 0.0, 0.5)
ts = b.number_input("Trailing-Stop %", 0.0, 90.0, 0.0, 0.5)
tp = a.number_input("Take-Profit %", 0.0, 500.0, 0.0, 1.0)
integer = b.checkbox("Ganze Stücke", True)

run_key = repr((symbols, str(start), str(end), sname, params, sz_name, sz_params))

if not symbols:
    st.info("Wähle links mindestens einen Wert aus.")
    st.stop()

cfg = engine.Config(
    initial_capital=float(capital), execution=execution, integer_shares=integer, rebalance_threshold=thr,
    stop_loss=sl / 100 or None, trailing_stop=ts / 100 or None, take_profit=tp / 100 or None,
    costs=engine.Costs(commission_bps=comm_bps, commission_fixed=comm_fix, slippage_bps=slip),
)

# ----------------------------------------------------------------------------- Berechnung
need = tuple(dict.fromkeys(symbols + ([bench_sym] if bench_sym in UNIVERSE or bench_sym in symbols else [])))
try:
    full = load_panel(need)
except Exception as exc:  # noqa: BLE001
    st.error(f"Kursdaten konnten nicht geladen werden: {exc}")
    st.stop()
panel = full.select(symbols)
for issue in data.validate(panel.slice(str(start), str(end))):
    st.warning(issue)

try:
    strat = cls(**params)
except ValueError as exc:
    st.error(str(exc))
    st.stop()
sizer = sizing.get(sz_name, **sz_params)
try:
    res = engine.run(panel, strat, sizer, cfg, str(start), str(end))
except ValueError as exc:
    st.error(str(exc))
    st.stop()
i0, i1 = res.equity.index[0], res.equity.index[-1]
bench = engine.benchmark_returns(full if bench_sym in full.symbols else panel,
                                 bench_sym if bench_sym in full.symbols else None, i0, i1)
stats = metrics.summary(res, bench)

# ----------------------------------------------------------------------------- Kopf
st.title(f"{cls.label}")
st.caption(f"{', '.join(symbols)} · {stats['start']} bis {stats['end']} · {stats['years']:.1f} Jahre · "
           f"Benchmark: {bench_sym}")

k = st.columns(6)
k[0].metric("CAGR", pct(stats["cagr"]), f"{(stats['cagr'] - stats['benchmark_cagr']) * 100:+.1f} Pp. ggü. Benchmark")
k[1].metric("Sharpe", num(stats["sharpe"]), f"{stats['sharpe'] - stats['benchmark_sharpe']:+.2f}")
k[2].metric("Max. Drawdown", pct(stats["max_drawdown"]),
            f"{(stats['max_drawdown'] - stats['benchmark_max_drawdown']) * 100:+.1f} Pp.")
k[3].metric("Volatilität", pct(stats["volatility"]))
k[4].metric("Trades", stats.get("trades", 0), f"Trefferquote {pct(stats.get('win_rate'), 0)}", delta_color="off")
k[5].metric("Endkapital", f"{stats['final']:,.0f}".replace(",", "."), pct(stats["total_return"]))

tabs = st.tabs(["Übersicht", "Trades", "Risiko", "Robustheit", "Bericht"])

with tabs[0]:
    for lvl, msg in report.assess(stats):
        (st.success if lvl == "ok" else st.warning if lvl == "warn" else st.error)(msg)
    log = st.toggle("Log-Skala", True)
    fig = charts.combined(res, bench)
    fig.update_yaxes(type="log" if log else "linear", row=1, col=1)
    st.plotly_chart(fig, width="stretch")
    c1, c2 = st.columns(2)
    keys1 = ["total_return", "cagr", "volatility", "sharpe", "sortino", "calmar", "max_drawdown",
             "longest_drawdown_days", "ulcer_index", "var_95", "cvar_95", "psr", "min_trl_years"]
    keys2 = ["benchmark_cagr", "benchmark_sharpe", "alpha", "beta", "correlation", "tracking_error",
             "information_ratio", "up_capture", "down_capture", "exposure", "avg_gross", "turnover", "cost_drag"]
    c1.dataframe(metrics.table(stats, keys1), hide_index=True, width="stretch")
    c2.dataframe(metrics.table(stats, keys2), hide_index=True, width="stretch")
    st.plotly_chart(charts.monthly_heatmap(res), width="stretch")

with tabs[1]:
    sym = st.selectbox("Wert", symbols) if len(symbols) > 1 else symbols[0]
    st.plotly_chart(charts.price_signals(panel, res, sym), width="stretch")
    c1, c2 = st.columns([2, 1])
    c2.dataframe(metrics.table(stats, [x for x in metrics.LABELS if x in stats and x in
                                       ("trades", "win_rate", "avg_return", "avg_win", "avg_loss", "payoff_ratio",
                                        "profit_factor", "expectancy", "best_trade", "worst_trade", "avg_bars",
                                        "max_consecutive_losses", "avg_mae", "avg_mfe", "total_costs")]),
                 hide_index=True, width="stretch")
    c1.plotly_chart(charts.trade_scatter(res.trades), width="stretch")
    if len(res.trades):
        st.dataframe(res.trades.iloc[::-1], hide_index=True, width="stretch",
                     column_config={"return": st.column_config.NumberColumn("Rendite", format="%.2f%%"),
                                    "mae": st.column_config.NumberColumn("MAE", format="%.3f"),
                                    "mfe": st.column_config.NumberColumn("MFE", format="%.3f")})
        st.download_button("Trades als CSV", res.trades.to_csv(index=False).encode(), "trades.csv", "text/csv")
        st.download_button("Ausführungen als CSV", res.fills.to_csv(index=False).encode(), "fills.csv", "text/csv")

with tabs[2]:
    c1, c2 = st.columns(2)
    c1.plotly_chart(charts.rolling_sharpe(res, bench), width="stretch")
    c2.plotly_chart(charts.return_hist(res), width="stretch")
    if len(symbols) > 1:
        st.plotly_chart(charts.exposure(res), width="stretch")
    ddp = metrics.drawdown_periods(res.equity)
    st.subheader("Die tiefsten Drawdowns")
    st.dataframe(ddp, hide_index=True, width="stretch")

with tabs[3]:
    st.markdown("Diese Tests prüfen, ob das Ergebnis Zufall oder Überanpassung sein könnte. "
                "Sie testen das ganze Parameter-Raster und dauern deshalb etwas länger.")
    c1, c2, c3 = st.columns(3)
    train = c1.number_input("Walk-Forward: Trainingsjahre", 1.0, 10.0, 3.0, 0.5)
    test = c2.number_input("Walk-Forward: Testjahre", 0.25, 5.0, 1.0, 0.25)
    objective = c3.selectbox("Optimierungsziel", list(robustness.OBJECTIVES))
    if st.button("Robustheitstests starten", type="primary"):
        spec = pipeline.Spec(symbols=symbols, strategy=sname, params=params, sizer=sz_name, sizer_params=sz_params,
                             start=str(start), end=str(end),
                             walk_forward={"train_years": train, "test_years": test, "objective": objective})
        spec.config = {}
        status = st.status("Robustheitstests laufen …", expanded=True)
        out = pipeline.Outcome(spec, panel, res, stats, bench)
        out.grid = robustness.grid_search(panel, cls, cls.grid, sizer, cfg, str(start), str(end))
        status.write(f"Parameter-Raster: {out.grid.n_trials} Kombinationen")
        out.pbo = robustness.pbo(out.grid.returns.iloc[1:]) if out.grid.n_trials >= 4 else None
        try:
            out.wf = robustness.walk_forward(panel, cls, cls.grid, sizer, cfg, train, test, objective=objective,
                                             start=str(start), end=str(end))
            status.write(f"Walk-Forward: {len(out.wf.folds)} Fenster")
        except ValueError as exc:
            status.write(str(exc))
        out.mc = robustness.monte_carlo(res.returns.iloc[1:])
        out.costs = robustness.cost_sensitivity(panel, strat, sizer, cfg, str(start), str(end))
        out.stats = metrics.summary(res, bench, n_trials=out.grid.n_trials,
                                    trial_sharpes=out.grid.table["sharpe"].to_numpy())
        status.update(label="Fertig", state="complete", expanded=False)
        st.session_state["robust"] = (run_key, out)
    saved = st.session_state.get("robust")
    out = saved[1] if saved and saved[0] == run_key else None
    if out is None:
        st.caption("Noch keine Ergebnisse für die aktuellen Einstellungen.")
    else:
        for lvl, msg in report.assess(out.stats, out.wf, out.pbo, out.costs):
            (st.success if lvl == "ok" else st.warning if lvl == "warn" else st.error)(msg)
        keys = list(out.grid.params[0]) if out.grid.params else []
        if len(keys) >= 2:
            a, b, z = st.columns(3)
            x_ax = a.selectbox("x-Achse", keys, 0)
            y_ax = b.selectbox("y-Achse", keys, 1)
            z_ax = z.selectbox("Kennzahl", ["sharpe", "cagr", "max_drawdown", "calmar", "sortino"])
            st.plotly_chart(charts.grid_heatmap(out.grid.table, x_ax, y_ax, z_ax), width="stretch")
        st.dataframe(out.grid.table.sort_values("sharpe", ascending=False), hide_index=True, width="stretch")
        if out.wf is not None:
            st.plotly_chart(charts.walk_forward(out.wf), width="stretch")
            st.dataframe(out.wf.folds, hide_index=True, width="stretch")
        c1, c2 = st.columns(2)
        if out.pbo is not None:
            c1.plotly_chart(charts.pbo_hist(out.pbo), width="stretch")
        c2.plotly_chart(charts.monte_carlo(out.mc, cfg.initial_capital), width="stretch")
        c2.dataframe(out.mc.summary(), width="stretch")
        st.subheader("Kostensensitivität")
        st.dataframe(out.costs, hide_index=True, width="stretch")

with tabs[4]:
    st.markdown("Der Bericht enthält alle Kennzahlen und Grafiken als eine HTML-Datei. "
                "Wurden die Robustheitstests ausgeführt, sind sie enthalten.")
    saved = st.session_state.get("robust")
    use = saved[1] if saved and saved[0] == run_key else None
    doc = report.build(res, panel, use.stats if use else stats, bench,
                       use.grid if use else None, use.wf if use else None, use.mc if use else None,
                       use.pbo if use else None, use.costs if use else None,
                       title=f"{cls.label}: {', '.join(symbols)}")
    st.download_button("HTML-Bericht herunterladen", doc.encode("utf-8"), f"backtest_{sname}.html", "text/html",
                       type="primary")
