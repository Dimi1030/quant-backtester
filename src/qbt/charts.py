"""Plotly-Grafiken für Report und Dashboard."""

from __future__ import annotations

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from . import metrics

ACCENT = "#c0641c"
BENCH = "#7a8794"
GAIN = "#1f8a55"
LOSS = "#c8382d"
INK = "#1b2733"
GRID = "rgba(120,135,150,0.18)"
MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez", "Jahr"]


def _layout(fig: go.Figure, title: str | None = None, height: int = 360, pct_y: bool = False) -> go.Figure:
    fig.update_layout(
        title=dict(text=title, x=0, font=dict(size=15)) if title else None,
        height=height, margin=dict(l=10, r=10, t=40 if title else 10, b=10),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="IBM Plex Sans, Segoe UI, sans-serif", size=12),
        legend=dict(orientation="h", y=1.02, x=1, xanchor="right", yanchor="bottom"),
        hovermode="x unified", separators=",.",
    )
    fig.update_xaxes(gridcolor=GRID, zeroline=False)
    fig.update_yaxes(gridcolor=GRID, zeroline=False, tickformat=".0%" if pct_y else None)
    return fig


def equity(res, bench: pd.Series | None = None, log: bool = True, title="Depotwert") -> go.Figure:
    fig = go.Figure()
    if bench is not None:
        b = bench.reindex(res.equity.index).fillna(0.0)
        b.iloc[0] = 0.0
        beq = (1 + b).cumprod() * res.equity.iloc[0]
        fig.add_scatter(x=beq.index, y=beq, name="Benchmark", line=dict(color=BENCH, width=1.3))
    fig.add_scatter(x=res.equity.index, y=res.equity, name="Strategie", line=dict(color=ACCENT, width=2))
    fig.update_yaxes(type="log" if log else "linear", tickformat=",.0f")
    return _layout(fig, title)


def drawdown(res, bench: pd.Series | None = None, title="Drawdown") -> go.Figure:
    fig = go.Figure()
    if bench is not None:
        b = bench.reindex(res.equity.index).fillna(0.0)
        bdd = metrics.drawdown((1 + b).cumprod())
        fig.add_scatter(x=bdd.index, y=bdd, name="Benchmark", line=dict(color=BENCH, width=1))
    dd = metrics.drawdown(res.equity)
    fig.add_scatter(x=dd.index, y=dd, name="Strategie", fill="tozeroy", line=dict(color=LOSS, width=1.2),
                    fillcolor="rgba(200,56,45,0.18)")
    return _layout(fig, title, 240, pct_y=True)


def monthly_heatmap(res, title="Monatsrenditen") -> go.Figure:
    m = metrics.monthly_returns(res.equity)
    z = m.to_numpy(dtype=float)
    lim = np.nanpercentile(np.abs(z[:, :12]), 95) if np.isfinite(z).any() else 0.1
    text = [[("" if np.isnan(v) else f"{v * 100:.1f}".replace(".", ",")) for v in row] for row in z]
    fig = go.Figure(go.Heatmap(
        z=z, x=MONTHS, y=[str(y) for y in m.index], text=text, texttemplate="%{text}",
        colorscale=[[0, LOSS], [0.5, "rgba(240,240,240,0.15)"], [1, GAIN]], zmin=-lim, zmax=lim,
        showscale=False, hovertemplate="%{y} %{x}: %{text} %<extra></extra>", xgap=2, ygap=2,
    ))
    fig.update_yaxes(autorange="reversed", type="category")
    return _layout(fig, title, max(220, 26 * len(m) + 60))


def rolling_sharpe(res, bench: pd.Series | None = None, window=252, title="Rollierende Sharpe Ratio (1 Jahr)"):
    fig = go.Figure()
    if bench is not None:
        rb = metrics.rolling_sharpe(bench.reindex(res.equity.index).fillna(0.0), window)
        fig.add_scatter(x=rb.index, y=rb, name="Benchmark", line=dict(color=BENCH, width=1))
    rs = metrics.rolling_sharpe(res.returns, window)
    fig.add_scatter(x=rs.index, y=rs, name="Strategie", line=dict(color=ACCENT, width=1.6))
    fig.add_hline(y=0, line=dict(color=BENCH, width=1, dash="dot"))
    return _layout(fig, title, 260)


def exposure(res, title="Exposure") -> go.Figure:
    fig = go.Figure()
    w = res.weights
    for s in w.columns:
        fig.add_scatter(x=w.index, y=w[s], name=s, stackgroup="one", line=dict(width=0.5))
    return _layout(fig, title, 260, pct_y=True)


def price_signals(panel, res, symbol: str, overlays: dict[str, pd.Series] | None = None, title=None):
    c = panel.close[symbol].loc[res.equity.index[0]:res.equity.index[-1]]
    fig = go.Figure()
    fig.add_scatter(x=c.index, y=c, name=symbol, line=dict(color=INK, width=1.2))
    for name, s in (overlays or {}).items():
        s = s.loc[c.index[0]:c.index[-1]]
        fig.add_scatter(x=s.index, y=s, name=name, line=dict(width=1, dash="dot"))
    f = res.fills[res.fills["symbol"] == symbol]
    for side, color, sym, lbl in ((1, GAIN, "triangle-up", "Kauf"), (-1, LOSS, "triangle-down", "Verkauf")):
        x = f[np.sign(f["qty"]) == side]
        fig.add_scatter(x=x["date"], y=x["price"], mode="markers", name=lbl,
                        marker=dict(symbol=sym, size=9, color=color, line=dict(width=0.5, color="white")),
                        customdata=x["reason"], hovertemplate="%{customdata}: %{y:.2f}<extra></extra>")
    return _layout(fig, title or f"{symbol}: Kurs und Ausführungen", 380)


def trade_scatter(trades: pd.DataFrame, title="Trades: Rendite gegen maximalen Zwischenverlust (MAE)"):
    t = trades[~trades["open"]] if len(trades) else trades
    fig = go.Figure()
    if len(t):
        fig.add_scatter(x=t["mae"], y=t["return"], mode="markers",
                        marker=dict(color=np.where(t["return"] > 0, GAIN, LOSS), size=7, opacity=0.75),
                        text=t["symbol"] + " " + t["entry_date"].astype(str).str[:10],
                        hovertemplate="%{text}<br>MAE %{x:.1%}<br>Rendite %{y:.1%}<extra></extra>")
    fig.update_xaxes(tickformat=".0%", title="MAE")
    fig.update_layout(hovermode="closest")
    return _layout(fig, title, 320, pct_y=True)


def return_hist(res, title="Verteilung der Tagesrenditen"):
    r = res.returns.iloc[1:]
    r = r[r != 0]
    fig = go.Figure(go.Histogram(x=r, nbinsx=80, marker_color=ACCENT, opacity=0.85))
    v, cv = metrics.var_cvar(r)
    fig.add_vline(x=v, line=dict(color=LOSS, dash="dash"), annotation_text="VaR 95 %")
    fig.update_xaxes(tickformat=".1%")
    fig.update_layout(hovermode="closest", bargap=0.02)
    return _layout(fig, title, 260)


def grid_heatmap(table: pd.DataFrame, x: str, y: str, z: str = "sharpe", title=None):
    piv = table.pivot_table(index=y, columns=x, values=z, aggfunc="mean")
    fig = go.Figure(go.Heatmap(
        z=piv.values, x=[str(v) for v in piv.columns], y=[str(v) for v in piv.index],
        colorscale="RdYlGn", texttemplate="%{z:.2f}",
        hovertemplate=f"{x}=%{{x}}, {y}=%{{y}}: %{{z:.3f}}<extra></extra>",
    ))
    fig.update_xaxes(title=x, type="category")
    fig.update_yaxes(title=y, type="category")
    fig.update_layout(hovermode="closest")
    return _layout(fig, title or f"Parameter-Raster: {z}", 360)


def monte_carlo(mc, start_value: float = 1.0, title="Monte Carlo: Spannweite möglicher Verläufe"):
    b = mc.bands * start_value
    x = np.arange(len(b))
    fig = go.Figure()
    for i in range(min(len(mc.samples), 40)):
        fig.add_scatter(x=x, y=mc.samples[i] * start_value, line=dict(color="rgba(122,135,148,0.15)", width=1),
                        showlegend=False, hoverinfo="skip")
    fig.add_scatter(x=x, y=b["p95"], line=dict(width=0), showlegend=False, hoverinfo="skip")
    fig.add_scatter(x=x, y=b["p05"], fill="tonexty", fillcolor="rgba(192,100,28,0.12)", line=dict(width=0),
                    name="5.–95. Perzentil")
    fig.add_scatter(x=x, y=b["p25"], line=dict(width=0), showlegend=False, hoverinfo="skip")
    fig.add_scatter(x=x, y=b["p75"], fill="tonexty", fillcolor="rgba(192,100,28,0.25)", line=dict(width=0),
                    name="25.–75. Perzentil")
    fig.add_scatter(x=x, y=b["p50"], line=dict(color=ACCENT, width=2), name="Median")
    fig.update_xaxes(title="Handelstage")
    fig.update_yaxes(type="log", tickformat=",.0f")
    return _layout(fig, title, 360)


def walk_forward(wf, title="Walk-Forward: Out-of-Sample-Kurve"):
    fig = go.Figure()
    eq = wf.oos.equity
    fig.add_scatter(x=eq.index, y=eq, name="Out-of-Sample", line=dict(color=ACCENT, width=2))
    for _, f in wf.folds.iterrows():
        fig.add_vline(x=pd.Timestamp(f["test_start"]), line=dict(color=GRID, width=1))
    fig.update_yaxes(type="log", tickformat=",.0f")
    return _layout(fig, title, 320)


def pbo_hist(p, title="PBO: Rang der In-Sample-besten Variante außerhalb der Stichprobe"):
    fig = go.Figure(go.Histogram(x=p.logits, nbinsx=30, marker_color=ACCENT))
    fig.add_vline(x=0, line=dict(color=LOSS, dash="dash"), annotation_text="Median")
    fig.update_xaxes(title="Logit (links von 0: schlechter als Median)")
    fig.update_layout(hovermode="closest")
    return _layout(fig, title, 280)


def combined(res, bench=None) -> go.Figure:
    """Depotwert und Drawdown untereinander mit gemeinsamer Zeitachse."""
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True, row_heights=[0.7, 0.3], vertical_spacing=0.04)
    for tr in equity(res, bench).data:
        fig.add_trace(tr, row=1, col=1)
    for tr in drawdown(res, bench).data:
        tr.showlegend = False
        fig.add_trace(tr, row=2, col=1)
    _layout(fig, None, 520)
    fig.update_yaxes(type="log", tickformat=",.0f", row=1, col=1)
    fig.update_yaxes(tickformat=".0%", row=2, col=1)
    return fig
