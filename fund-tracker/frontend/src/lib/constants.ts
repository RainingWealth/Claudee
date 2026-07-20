export const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : "/api/v1";

export const CHART_PERIODS = ["1y", "3y", "5y"] as const;
export type ChartPeriod = (typeof CHART_PERIODS)[number];

export const SCENARIO_HORIZONS = [1, 3, 5] as const;
export type ScenarioHorizon = (typeof SCENARIO_HORIZONS)[number];

export const COLORS = {
  bull: "#16a34a",   // green-600
  base: "#2563eb",   // blue-600
  bear: "#dc2626",   // red-600
  line: "#3b82f6",   // blue-500
  grid: "#e5e7eb",   // gray-200
  text: "#374151",   // gray-700
} as const;
