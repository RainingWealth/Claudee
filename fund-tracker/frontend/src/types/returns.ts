export interface ReturnWindow {
  label: string;
  years: number;
  start_date: string | null;
  end_date: string | null;
  start_nav: number | null;
  end_nav: number | null;
  cumulative_return: number | null;
  cagr: number | null;
  data_complete: boolean;
  missing_days: number;
  warning: string | null;
}

export interface ReturnsData {
  fund_id: number;
  latest_nav: number | null;
  latest_date: string | null;
  windows: ReturnWindow[];
}

export interface ChartPoint {
  date: string;
  nav: number;
}

export interface ChartData {
  fund_id: number;
  period: string;
  series: ChartPoint[];
}
