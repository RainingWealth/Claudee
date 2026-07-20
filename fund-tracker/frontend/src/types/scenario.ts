export interface ScenarioHorizon {
  horizon_years: number;
  base_cagr: number;
  bull_cagr: number;
  bear_cagr: number;
  sigma_annual: number | null;
  base_value_per_1000: number;
  bull_value_per_1000: number;
  bear_value_per_1000: number;
  notes: string | null;
  generated_at: string;
}

export interface ScenariosData {
  fund_id: number;
  disclaimer: string;
  projections: ScenarioHorizon[];
}
