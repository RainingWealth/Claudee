/**
 * Pure portfolio math: weighted returns (allocation mode), units/XIRR
 * (holdings mode). No React, no fetch — takes already-loaded data in,
 * returns numbers out, so it can be unit tested in isolation.
 */
import type { ReturnsData, ChartPoint } from "@/types/returns";
import type { ScenariosData } from "@/types/scenario";
import type { Contribution, PortfolioHolding } from "@/types/portfolio";

// ── Allocation mode: weighted trailing returns ──────────────────────────────

export interface WeightedWindow {
  label: string;
  cagr: number | null;
  cumulativeReturn: number | null;
  dataComplete: boolean;
}

/** Rescales weights so they sum to 100. Returns [] unchanged if total is 0. */
export function normalizeWeights(
  holdings: { fundId: number; targetWeightPct?: number }[]
): Map<number, number> {
  const total = holdings.reduce((s, h) => s + (h.targetWeightPct ?? 0), 0);
  const map = new Map<number, number>();
  if (total <= 0) {
    holdings.forEach((h) => map.set(h.fundId, 0));
    return map;
  }
  holdings.forEach((h) => map.set(h.fundId, ((h.targetWeightPct ?? 0) / total) * 100));
  return map;
}

/**
 * Blends trailing return windows (2Y/3Y/5Y) across holdings by normalized
 * weight. A window is marked incomplete if ANY constituent's window is
 * incomplete or missing — the blended number is still computed but the
 * caller should render it as a caveat, matching per-fund UI conventions.
 */
export function weightedReturns(
  holdings: { fundId: number; targetWeightPct?: number }[],
  returnsByFundId: Map<number, ReturnsData>
): WeightedWindow[] {
  const weights = normalizeWeights(holdings);
  const labels = ["2Y", "3Y", "5Y"];

  return labels.map((label) => {
    let cagrSum = 0;
    let cumSum = 0;
    let weightSeen = 0;
    let dataComplete = true;
    let anyMissing = false;

    for (const h of holdings) {
      const w = (weights.get(h.fundId) ?? 0) / 100;
      if (w <= 0) continue;
      const returns = returnsByFundId.get(h.fundId);
      const window = returns?.windows.find((win) => win.label === label);
      if (!window || window.cagr == null || window.cumulative_return == null) {
        anyMissing = true;
        dataComplete = false;
        continue;
      }
      if (!window.data_complete) dataComplete = false;
      cagrSum += w * window.cagr;
      cumSum += w * window.cumulative_return;
      weightSeen += w;
    }

    if (weightSeen <= 0) {
      return { label, cagr: null, cumulativeReturn: null, dataComplete: false };
    }

    return {
      label,
      cagr: cagrSum,
      cumulativeReturn: cumSum,
      dataComplete: dataComplete && !anyMissing,
    };
  });
}

export interface BlendedProjection {
  horizonYears: number;
  baseCagr: number;
  bullCagr: number;
  bearCagr: number;
  baseValuePer1000: number;
  bullValuePer1000: number;
  bearValuePer1000: number;
}

/** Blends scenario CAGRs across holdings by normalized weight, per horizon. */
export function blendedProjections(
  holdings: { fundId: number; targetWeightPct?: number }[],
  scenariosByFundId: Map<number, ScenariosData>,
  horizons: number[] = [1, 3, 5]
): BlendedProjection[] {
  const weights = normalizeWeights(holdings);

  return horizons.map((h) => {
    let base = 0,
      bull = 0,
      bear = 0,
      weightSeen = 0;

    for (const holding of holdings) {
      const w = (weights.get(holding.fundId) ?? 0) / 100;
      if (w <= 0) continue;
      const scenarios = scenariosByFundId.get(holding.fundId);
      const proj = scenarios?.projections.find((p) => p.horizon_years === h);
      if (!proj) continue;
      base += w * proj.base_cagr;
      bull += w * proj.bull_cagr;
      bear += w * proj.bear_cagr;
      weightSeen += w;
    }

    if (weightSeen <= 0) {
      return {
        horizonYears: h,
        baseCagr: 0,
        bullCagr: 0,
        bearCagr: 0,
        baseValuePer1000: 1000,
        bullValuePer1000: 1000,
        bearValuePer1000: 1000,
      };
    }

    return {
      horizonYears: h,
      baseCagr: base,
      bullCagr: bull,
      bearCagr: bear,
      baseValuePer1000: 1000 * Math.pow(1 + base, h),
      bullValuePer1000: 1000 * Math.pow(1 + bull, h),
      bearValuePer1000: 1000 * Math.pow(1 + bear, h),
    };
  });
}

// ── Holdings mode: units, value-over-time, XIRR ─────────────────────────────

/**
 * NAV on the latest price_date <= asOf ("last known price" convention —
 * never interpolates forward). Series must be sorted ascending by date.
 * Returns null if asOf precedes the first available date.
 */
export function navAsOf(series: ChartPoint[], asOf: string): number | null {
  if (!series.length) return null;
  let result: number | null = null;
  for (const point of series) {
    if (point.date > asOf) break;
    result = point.nav;
  }
  return result;
}

export interface ResolvedContribution extends Contribution {
  units: number | null; // null if the buy-in date predates available data
}

/** Converts each cash contribution into units bought, using navAsOf. */
export function resolveContributions(
  contributions: Contribution[],
  series: ChartPoint[]
): ResolvedContribution[] {
  return contributions.map((c) => {
    const nav = navAsOf(series, c.date);
    return { ...c, units: nav && nav > 0 ? c.amount / nav : null };
  });
}

/** Total units held as of a given date (only contributions dated <= asOf count). */
export function unitsHeldAsOf(resolved: ResolvedContribution[], asOf: string): number {
  return resolved
    .filter((c) => c.date <= asOf && c.units != null)
    .reduce((sum, c) => sum + (c.units as number), 0);
}

export interface TimelinePoint {
  date: string;
  value: number;
  invested: number;
}

/**
 * Builds a portfolio-value-vs-invested timeline across all holdings, sampled
 * on the union of every constituent fund's price dates within [start, today].
 */
export function computePortfolioTimeline(
  holdings: { contributions: Contribution[]; series: ChartPoint[] }[]
): TimelinePoint[] {
  const resolvedByHolding = holdings.map((h) => ({
    resolved: resolveContributions(h.contributions, h.series),
    series: h.series,
  }));

  const allDates = new Set<string>();
  resolvedByHolding.forEach(({ series }) => series.forEach((p) => allDates.add(p.date)));
  const dates = Array.from(allDates).sort();
  if (!dates.length) return [];

  return dates.map((date) => {
    let value = 0;
    let invested = 0;
    for (const { resolved, series } of resolvedByHolding) {
      const units = unitsHeldAsOf(resolved, date);
      const nav = navAsOf(series, date) ?? 0;
      value += units * nav;
      invested += resolved
        .filter((c) => c.date <= date)
        .reduce((sum, c) => sum + c.amount, 0);
    }
    return { date, value, invested };
  });
}

/**
 * Money-weighted annualised return (XIRR). Cashflows: negative for
 * contributions, positive for the final valuation. Sorted internally.
 * Returns null if it doesn't converge or the flows don't bracket a root
 * (e.g. all-negative, or a single flow).
 */
export function xirr(cashflows: { amount: number; date: string }[]): number | null {
  const flows = [...cashflows].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (flows.length < 2) return null;
  const hasPositive = flows.some((c) => c.amount > 0);
  const hasNegative = flows.some((c) => c.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const t0 = new Date(flows[0].date).getTime();
  const yearsFrom = (d: string) => (new Date(d).getTime() - t0) / (365.25 * 86400000);

  const npv = (r: number) =>
    flows.reduce((sum, c) => sum + c.amount / Math.pow(1 + r, yearsFrom(c.date)), 0);
  const dnpv = (r: number) =>
    flows.reduce(
      (sum, c) => sum - (yearsFrom(c.date) * c.amount) / Math.pow(1 + r, yearsFrom(c.date) + 1),
      0
    );

  // Newton-Raphson first.
  let r = 0.1;
  for (let i = 0; i < 100; i++) {
    const f = npv(r);
    const d = dnpv(r);
    if (!isFinite(f) || !isFinite(d) || d === 0) break;
    const next = r - f / d;
    if (Math.abs(next - r) < 1e-7) return next;
    r = next;
    if (r <= -0.9999) break;
  }

  // Bisection fallback on a wide bracket.
  let lo = -0.9999;
  let hi = 10;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (fLo * fHi > 0) return null; // no sign change — can't bracket a root
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/** Simple (money-unweighted) return: (current value - invested) / invested. */
export function simpleReturn(currentValue: number, invested: number): number | null {
  if (invested <= 0) return null;
  return (currentValue - invested) / invested;
}

export interface HoldingSummary {
  fundId: number;
  invested: number;
  currentValue: number;
  units: number;
  unresolvedContributions: number; // count of buy-ins predating available data
}

export function summarizeHolding(
  holding: PortfolioHolding,
  series: ChartPoint[]
): HoldingSummary {
  const contributions = holding.contributions ?? [];
  const resolved = resolveContributions(contributions, series);
  const today = new Date().toISOString().slice(0, 10);
  const units = unitsHeldAsOf(resolved, today);
  const latestNav = series.length ? series[series.length - 1].nav : 0;
  const invested = resolved
    .filter((c) => c.units != null)
    .reduce((sum, c) => sum + c.amount, 0);
  return {
    fundId: holding.fundId,
    invested,
    currentValue: units * latestNav,
    units,
    unresolvedContributions: resolved.filter((c) => c.units == null).length,
  };
}
