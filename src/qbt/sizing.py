"""Positionsgrößen: wandelt Signale (-1..1) in Zielgewichte des Portfolios um."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from . import indicators as ind
from .data import Panel


@dataclass
class EqualWeight:
    """Gleichgewichtung.

    slot="universe": jeder Wert hat einen festen Anteil 1/N; ohne Signal bleibt dieser Anteil in Cash.
    slot="active":   das Kapital wird gleichmäßig auf alle Werte mit Signal verteilt.
    """

    gross: float = 1.0
    slot: str = "universe"

    def weights(self, signals: pd.DataFrame, panel: Panel) -> pd.DataFrame:
        if self.slot == "active":
            n = signals.abs().gt(0).sum(axis=1).replace(0, np.nan)
            return signals.div(n, axis=0).fillna(0.0) * self.gross
        return signals * (self.gross / signals.shape[1])


@dataclass
class VolatilityTarget:
    """Volatilitätsskalierung je Wert (wie bei Managed-Futures-Trendfolgern üblich).

    Jeder Wert bekommt einen Anteil 1/N, skaliert mit Zielvolatilität / gemessener Volatilität.
    Ruhige Werte werden größer, schwankende kleiner gewichtet. Das Bruttoexposure wird auf
    `max_gross` begrenzt, Einzelgewichte auf `max_weight`.
    """

    target: float = 0.15
    lookback: int = 60
    max_weight: float = 1.0
    max_gross: float = 1.0
    slot: str = "universe"

    def weights(self, signals: pd.DataFrame, panel: Panel) -> pd.DataFrame:
        vol = ind.realized_vol(panel.close.ffill(), self.lookback).reindex_like(signals)
        scale = (self.target / vol).clip(upper=self.max_weight * signals.shape[1])
        if self.slot == "active":
            n = signals.abs().gt(0).sum(axis=1).replace(0, np.nan)
            w = signals.mul(scale).div(n, axis=0)
        else:
            w = signals.mul(scale) / signals.shape[1]
        w = w.clip(-self.max_weight, self.max_weight).fillna(0.0)
        gross = w.abs().sum(axis=1)
        factor = (self.max_gross / gross).where(gross > self.max_gross, 1.0)
        return w.mul(factor, axis=0)


SIZERS = {"equal": EqualWeight, "vol_target": VolatilityTarget}


def get(name: str, **kw) -> EqualWeight | VolatilityTarget:
    if name not in SIZERS:
        raise KeyError(f"Unbekannter Sizer '{name}'. Verfügbar: {', '.join(SIZERS)}")
    return SIZERS[name](**kw)
