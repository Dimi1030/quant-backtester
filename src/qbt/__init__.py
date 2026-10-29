"""qbt: Backtesting-Engine für Aktien und ETFs."""

from . import data, engine, metrics, robustness, sizing, strategies
from .engine import Config, Costs, run, simulate
from .strategies import STRATEGIES

__all__ = ["data", "engine", "metrics", "robustness", "sizing", "strategies",
           "Config", "Costs", "run", "simulate", "STRATEGIES"]
__version__ = "0.1.0"
