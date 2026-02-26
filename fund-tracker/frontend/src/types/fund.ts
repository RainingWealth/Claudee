export interface Holding {
  holding_name: string;
  weight: number | null;
  holding_type: string | null;
  as_of_date: string | null;
}

export interface FundSummary {
  id: number;
  ticker: string | null;
  isin: string | null;
  internal_code: string | null;
  name: string;
  asset_class: string | null;
  style: string | null;
  currency: string;
  is_demo: boolean;
  latest_nav: number | null;
  latest_date: string | null;
}

export interface FundDetail extends FundSummary {
  objective: string | null;
  holdings: Holding[];
  created_at: string | null;
  updated_at: string | null;
}
