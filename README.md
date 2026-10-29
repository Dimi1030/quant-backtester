# qbt: Backtesting für Aktien und ETFs

`qbt` testet Handelsstrategien an historischen Tageskursen und prüft anschließend, ob das Ergebnis
belastbar ist oder nur durch Zufall und Überanpassung entstanden ist. Es simuliert ein ganzes
Portfolio mit realistischen Ausführungszeitpunkten, Gebühren, Slippage, Stops und
Finanzierungskosten und erzeugt einen vollständigen HTML-Bericht.

```
qbt run configs/dual_momentum.yaml
```

| Bereich | Was `qbt` macht |
| --- | --- |
| **Daten** | Yahoo Finance mit lokalem Cache, um Dividenden und Splits bereinigte OHLC-Kurse, CSV-Import (Yahoo, Stooq, deutsche Broker-Exporte), Datenprüfung auf Split-Sprünge, Lücken und inkonsistente Hoch-/Tiefkurse |
| **Simulation** | Portfolio aus beliebig vielen Werten, Signal am Schluss → Ausführung zur nächsten Eröffnung (kein Look-Ahead), Long und Short, ganze Stücke, Rebalancing-Schwelle |
| **Kosten** | Prozentuale Gebühr mit Mindestbetrag, Fixgebühr, Slippage in Basispunkten, Leihgebühr für Shorts, Guthaben- und Sollzins |
| **Risiko** | Stop-Loss, Trailing-Stop, Take-Profit innerhalb des Tages mit Gap-Behandlung; Positionsgrößen gleichgewichtet oder per Volatilitätsziel |
| **Kennzahlen** | CAGR, Volatilität, Sharpe, Sortino, Calmar, Ulcer Index, VaR/CVaR, Drawdown-Phasen, Alpha/Beta, Information Ratio, Up-/Down-Capture, Trade-Statistik mit MAE/MFE |
| **Statistik** | Probabilistic Sharpe Ratio, Deflated Sharpe Ratio, Minimum Track Record Length |
| **Robustheit** | Parameter-Raster, Walk-Forward-Optimierung, Probability of Backtest Overfitting (CSCV), Block-Bootstrap Monte Carlo, Kostensensitivität |
| **Ausgabe** | HTML-Tearsheet, Web-Dashboard (Streamlit), Kommandozeile, Python-API |

## Installation

Python 3.10 oder neuer.

```bash
git clone <repo-url> quant-backtester && cd quant-backtester
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -e ".[dashboard,dev]"
```

## Schnellstart

```bash
# Verfügbare Strategien
qbt strategies

# Backtest mit allen Robustheitstests und HTML-Bericht unter reports/
qbt run configs/sma_spy.yaml

# Ohne Konfigurationsdatei, nur Backtest
qbt run --symbols SPY QQQ --strategy trend --param n=150 band=0.02 --start 2010-01-01 --fast

# Kurse laden und prüfen
qbt download SPY EUNL.DE SAP.DE

# Web-Dashboard
streamlit run app/dashboard.py
```

Kurse werden in `data_cache/` zwischengespeichert (12 Stunden gültig). Mit `QBT_CACHE=/pfad` lässt sich
das Verzeichnis ändern.

### Python-API

```python
from qbt import data, engine, metrics, robustness, sizing, strategies

panel = data.load(["SPY", "TLT", "GLD"])
strat = strategies.get("tsmom", lookback=252, skip=21)
res = engine.run(panel, strat, sizing.VolatilityTarget(target=0.10),
                 engine.Config(costs=engine.Costs(slippage_bps=5, commission_fixed=1)),
                 start="2010-01-01")

stats = metrics.summary(res, engine.benchmark_returns(panel, "SPY", start="2010-01-01"))
print(metrics.table(stats))

wf = robustness.walk_forward(panel, strategies.TimeSeriesMomentum, train_years=4, test_years=1)
print(wf.folds, wf.efficiency)
```

## Strategien

| Name | Idee | Parameter |
| --- | --- | --- |
| `sma_cross` | Schneller über langsamem Durchschnitt → long (optional short) | `fast`, `slow`, `kind` (sma/ema), `allow_short` |
| `trend` | Kurs über gleitendem Durchschnitt → long, mit Puffer gegen Fehlsignale | `n`, `band` |
| `donchian` | Turtle-Ausbruch: Kauf über n-Tage-Hoch, Verkauf unter m-Tage-Tief | `entry`, `exit`, `allow_short` |
| `rsi` | Connors-RSI(2): überverkauft im Aufwärtstrend kaufen | `n`, `lo`, `hi`, `trend` |
| `bollinger` | Unter unterem Band kaufen, an der Mittellinie verkaufen | `n`, `k` |
| `tsmom` | Zeitreihen-Momentum, monatlich (Moskowitz, Ooi, Pedersen 2012) | `lookback`, `skip`, `allow_short` |
| `xsmom` | Relative Stärke / Dual Momentum: die stärksten `top` Werte halten | `lookback`, `skip`, `top`, `abs_filter` |
| `buy_hold` | Vergleichsbasis | – |

Eine eigene Strategie ist eine Klasse mit einer Methode `signals`, die pro Tag und Wert einen Wert zwischen
-1 und 1 zurückgibt und dabei nur Daten bis zum jeweiligen Schlusskurs verwendet:

```python
from qbt import indicators as ind
from qbt.strategies import STRATEGIES, Strategy, hold_state

class LowVolBreakout(Strategy):
    name = "lowvol_breakout"
    label = "Ausbruch bei niedriger Volatilität"
    defaults = {"n": 20, "vol_max": 0.25}
    grid = {"n": [10, 20, 50], "vol_max": [0.15, 0.25, 0.4]}

    def signals(self, panel):
        c = panel.close.ffill()
        hi, lo = ind.donchian(panel.high.ffill(), panel.low.ffill(), self.params["n"])
        calm = ind.realized_vol(c, 20) < self.params["vol_max"]
        return hold_state((c > hi) & calm, c < lo)

STRATEGIES[LowVolBreakout.name] = LowVolBreakout
```

`tests/test_engine.py::test_strategy_signals_do_not_use_future_data` prüft automatisch alle registrierten
Strategien auf Look-Ahead: Die Signale bis zu einem Stichtag müssen identisch sein, egal ob spätere Kurse
vorhanden sind.

## Methodik

**Zeitpunkte.** Indikatoren und Signale werden am Schlusskurs von Tag *t* berechnet. Ausgeführt wird zur
Eröffnung von *t+1* (oder optional zum Schluss von *t+1*). Indikatoren nutzen die gesamte verfügbare Historie
vor dem Startdatum als Aufwärmphase.

**Ausführung.** Zielgewichte werden in Stückzahlen umgerechnet (ganze Stücke als Standard). Gehandelt wird nur,
wenn sich die Richtung ändert oder das Gewicht um mehr als `rebalance_threshold` vom Ziel abweicht. Verkäufe
werden vor Käufen ausgeführt; ohne Hebel wird nie mehr gekauft, als Cash vorhanden ist.

**Stops.** Stop-Loss, Trailing-Stop und Take-Profit werden mit Tageshoch und -tief geprüft. Öffnet der Kurs
bereits jenseits des Stops, wird zum (schlechteren) Eröffnungskurs gefüllt. Liegen Stop und Take-Profit am
selben Tag in Reichweite, wird konservativ der Stop angenommen. Nach einem Stop wird erst wieder eingestiegen,
wenn das Signal zwischenzeitlich neutral war.

**Kosten.** Slippage verschlechtert jeden Ausführungskurs um `slippage_bps` (Käufe teurer, Verkäufe billiger)
und deckt den halben Spread ab. Kommission = max(`commission_min`, Volumen × `commission_bps`) + `commission_fixed`.
Shorts zahlen `borrow_bps` p. a. auf ihren Marktwert.

**Positionsgröße.** `equal` verteilt das Kapital gleichmäßig, entweder mit festem Anteil je Wert (`slot: universe`,
ungenutzte Anteile bleiben Cash) oder auf die aktiven Signale (`slot: active`). `vol_target` skaliert jede Position
mit Zielvolatilität / gemessener Volatilität und begrenzt Einzel- und Bruttogewichte.

## Robustheitstests verstehen

Ein gut aussehender Backtest ist der Normalfall, nicht die Ausnahme: Wer genug Varianten probiert, findet
immer eine. Diese Tests messen, wie viel davon übrig bleibt.

- **Parameter-Raster.** Eine robuste Strategie funktioniert in einer breiten Zone benachbarter Parameter.
  Eine einzelne grüne Zelle in rotem Umfeld ist ein Warnsignal.
- **Walk-Forward.** Parameter werden auf einem Trainingsfenster gewählt und im folgenden, ungesehenen Fenster
  gehandelt. Die verbundenen Testfenster ergeben eine echte Out-of-Sample-Kurve. Die *Walk-Forward-Effizienz*
  (Rendite außerhalb / innerhalb der Stichprobe) sollte über etwa 0,5 liegen.
- **Deflated Sharpe Ratio** (Bailey & López de Prado 2014). Die Wahrscheinlichkeit, dass die Sharpe Ratio
  echt ist, nachdem berücksichtigt wurde, wie viele Varianten getestet wurden und wie schief und
  fat-tailed die Renditen sind. Ziel: ≥ 95 %.
- **Probability of Backtest Overfitting** (Bailey, Borwein, López de Prado, Zhu 2015). Teilt die Historie in
  Blöcke und prüft über alle Kombinationen, wie oft die im Training beste Variante im Test unter dem Median
  landet. Über 50 % heißt: Die Optimierung wählt eher Zufallstreffer als echte Vorteile.
- **Monte Carlo.** Block-Bootstrap der Tagesrenditen zeigt die Bandbreite von Rendite und Drawdown, die
  dieselbe Strategie bei anderer Abfolge der Marktphasen hätte liefern können.
- **Kostensensitivität.** Rechnet mit 0-, 1-, 2- und 4-fachen Kosten. Strategien mit hohem Umschlag brechen
  hier oft ein.

Der Bericht fasst alles in einer **Einschätzung** mit Ampelfarben zusammen.

## Konfiguration

Siehe `configs/` für vollständige Beispiele. Alle Felder:

```yaml
title: Name im Bericht
symbols: [SPY, TLT]          # Yahoo-Symbole (Xetra: .DE, z. B. SAP.DE, EUNL.DE)
benchmark: SPY               # ohne Angabe: gleichgewichtetes Universum
start: 2010-01-01
end: null

strategy:
  name: tsmom
  params: {lookback: 252}
  grid: {lookback: [126, 252]}   # ohne Angabe: Standard-Raster der Strategie

sizing:
  name: vol_target             # equal | vol_target
  params: {target: 0.10, lookback: 60, max_weight: 0.5, max_gross: 1.0, slot: universe}

config:
  initial_capital: 100000
  execution: open              # open | close
  integer_shares: true
  rebalance_threshold: 0.02
  stop_loss: null              # z. B. 0.08
  trailing_stop: null
  take_profit: null
  costs: {commission_bps: 0, commission_min: 0, commission_fixed: 1, slippage_bps: 5, borrow_bps: 50, cash_rate: 0}

robustness:                    # einzelne Tests mit null abschalten
  grid: true
  walk_forward: {train_years: 4, test_years: 1, anchored: false, objective: sharpe}
  monte_carlo: {n_sims: 2000, block: 21}
  pbo: {n_blocks: 10}
  cost_sensitivity: true

report: reports/mein_test.html
```

## Grenzen

Das sollte man wissen, bevor man Ergebnissen vertraut:

- **Survivorship Bias.** Wer heute erfolgreiche Aktien auswählt und sie zehn Jahre zurück testet, testet mit
  dem Wissen von heute. Für Aktienauswahl-Strategien braucht man historische Indexzusammensetzungen inklusive
  delisteter Werte (z. B. Norgate, CRSP, Sharadar). ETFs auf breite Indizes sind davon kaum betroffen.
- **Datenqualität.** Yahoo Finance ist kostenlos, aber nicht fehlerfrei. `qbt download` meldet verdächtige
  Sprünge und Lücken.
- **Tagesdaten.** Intraday-Effekte, Auktionen und die Reihenfolge von Hoch und Tief innerhalb eines Tages
  sind unbekannt; Stops werden deshalb konservativ behandelt.
- **Nicht modelliert:** Steuern (z. B. Abgeltungsteuer und Vorabpauschale), Währungsumrechnung zwischen Werten
  in verschiedenen Währungen, Marktauswirkung großer Orders, Margin Calls.

Professionelle Häuser nutzen zusätzlich bereinigte Point-in-Time-Datenbanken, Intraday-Daten mit
Orderbuch-Modellen und eine vom Backtest getrennte Ausführungsinfrastruktur. Bekannte Frameworks mit
ähnlichem Ansatz sind QuantConnect LEAN, NautilusTrader, Zipline-Reloaded und vectorbt.

## Entwicklung

```bash
pytest            # Tests (offline, mit synthetischen Daten)
ruff check .      # Linting
```

Projektstruktur:

```
src/qbt/
  data.py         Daten laden, cachen, prüfen, CSV-Import
  indicators.py   SMA, EMA, RSI, Bollinger, ATR, Donchian, Volatilität, Momentum
  strategies.py   Strategien und Registrierung
  sizing.py       Gleichgewichtung, Volatilitätsziel
  engine.py       Portfolio-Simulation, Kosten, Stops, Trade-Buchhaltung
  metrics.py      Kennzahlen, PSR/DSR, Trade-Statistik
  robustness.py   Raster, Walk-Forward, Monte Carlo, PBO, Kostensensitivität
  charts.py       Plotly-Grafiken
  report.py       HTML-Bericht und Einschätzung
  pipeline.py     Konfiguration → kompletter Lauf
  cli.py          Kommandozeile
app/dashboard.py  Streamlit-Dashboard
configs/          Beispielkonfigurationen
tests/            Tests
```

## Hinweis

Dieses Projekt dient der Analyse und Weiterbildung. Ergebnisse aus Backtests sind keine Prognose und keine
Anlageberatung.
