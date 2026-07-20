"""Pure mathematical functions for fund return calculations.

These functions have no I/O or side effects, making them trivially testable.
All NAV values must be positive floats.
"""
import math
import statistics
from typing import Sequence


def cumulative_return(start: float, end: float) -> float:
    """Compute simple total return from start to end NAV.

    Returns a decimal (e.g. 0.27 for 27%).
    """
    if start <= 0:
        raise ValueError(f"start NAV must be positive, got {start}")
    if end < 0:
        raise ValueError(f"end NAV must be non-negative, got {end}")
    return (end / start) - 1.0


def cagr(start: float, end: float, years: float) -> float:
    """Compound Annual Growth Rate from start to end NAV over fractional years.

    Returns a decimal (e.g. 0.10 for 10% annualised).
    """
    if start <= 0:
        raise ValueError(f"start NAV must be positive, got {start}")
    if end < 0:
        raise ValueError(f"end NAV must be non-negative, got {end}")
    if years <= 0:
        raise ValueError(f"years must be positive, got {years}")
    if end == 0:
        return -1.0  # Total loss
    return (end / start) ** (1.0 / years) - 1.0


def log_returns(navs: Sequence[float]) -> list[float]:
    """Compute daily log returns from a sequence of NAV values.

    Returns list of length len(navs) - 1.
    """
    if len(navs) < 2:
        return []
    result = []
    for i in range(1, len(navs)):
        if navs[i - 1] <= 0 or navs[i] <= 0:
            continue
        result.append(math.log(navs[i] / navs[i - 1]))
    return result


def annualized_stddev(navs: Sequence[float], trading_days: int = 252) -> float:
    """Annualised standard deviation of daily log returns.

    Args:
        navs: sequence of NAV prices (daily, ordered chronologically)
        trading_days: number of trading days per year (default 252)

    Returns:
        Annualised volatility as a decimal (e.g. 0.18 for 18%)
    """
    returns = log_returns(navs)
    if len(returns) < 2:
        return 0.0
    daily_std = statistics.stdev(returns)
    return daily_std * math.sqrt(trading_days)


def projected_value(initial: float, rate: float, years: int) -> float:
    """Project the value of an initial investment at a given annual rate.

    Args:
        initial: starting value (e.g. 1000.0)
        rate: annualised growth rate as decimal (e.g. 0.10 for 10%)
        years: investment horizon in whole years

    Returns:
        Projected terminal value
    """
    return initial * ((1.0 + rate) ** years)
