"""Technische Indikatoren. Alle Funktionen arbeiten spaltenweise auf Series oder DataFrames
und verwenden nur Daten bis zum jeweiligen Tag (kein Blick in die Zukunft)."""

from __future__ import annotations

import pandas as pd

Frame = pd.Series | pd.DataFrame


def sma(x: Frame, n: int) -> Frame:
    return x.rolling(n, min_periods=n).mean()


def ema(x: Frame, n: int) -> Frame:
    return x.ewm(span=n, adjust=False, min_periods=n).mean()


def rsi(x: Frame, n: int = 14) -> Frame:
    """Relative Strength Index nach Wilder (Glättung mit alpha = 1/n)."""
    d = x.diff()
    up = d.clip(lower=0).ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    rs = up / dn
    out = 100 - 100 / (1 + rs)
    return out.where(dn != 0, 100.0).where(up.notna())


def bollinger(x: Frame, n: int = 20, k: float = 2.0) -> tuple[Frame, Frame, Frame]:
    mid = sma(x, n)
    sd = x.rolling(n, min_periods=n).std(ddof=0)
    return mid - k * sd, mid, mid + k * sd


def true_range(high: Frame, low: Frame, close: Frame) -> Frame:
    pc = close.shift(1)
    a, b, c = high - low, (high - pc).abs(), (low - pc).abs()
    m = a.where(a >= b, b)
    m = m.where(m >= c, c)
    # Am ersten Tag fehlt der Vortagesschluss: dann gilt nur Hoch minus Tief.
    return m.fillna(a)


def atr(high: Frame, low: Frame, close: Frame, n: int = 14) -> Frame:
    return true_range(high, low, close).ewm(alpha=1 / n, adjust=False, min_periods=n).mean()


def donchian(high: Frame, low: Frame, n: int) -> tuple[Frame, Frame]:
    """Höchstes Hoch und tiefstes Tief der letzten n Tage, ohne den aktuellen Tag."""
    return high.rolling(n, min_periods=n).max().shift(1), low.rolling(n, min_periods=n).min().shift(1)


def realized_vol(close: Frame, n: int = 20, periods: int = 252) -> Frame:
    """Annualisierte Volatilität der Tagesrenditen über n Tage."""
    return close.pct_change().rolling(n, min_periods=n).std() * periods**0.5


def momentum(close: Frame, lookback: int, skip: int = 0) -> Frame:
    """Rendite über `lookback` Tage, wobei die letzten `skip` Tage ausgelassen werden (z. B. 12-1)."""
    return close.shift(skip) / close.shift(lookback) - 1
