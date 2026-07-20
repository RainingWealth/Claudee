export interface Contribution {
  id: string; // uuid
  date: string; // ISO yyyy-mm-dd — buy-in / top-up date
  amount: number; // cash invested, in the portfolio's base currency
}

export type PortfolioMode = "allocation" | "holdings";

export interface PortfolioHolding {
  fundId: number;
  ticker: string | null;
  name: string;
  currency: string;
  /** Percent, 0-100. Used when the portfolio is in "allocation" mode. */
  targetWeightPct?: number;
  /** Dated buy-ins/top-ups. Used when the portfolio is in "holdings" mode. */
  contributions?: Contribution[];
}

export interface Portfolio {
  id: string; // uuid
  name: string;
  baseCurrency: string;
  mode: PortfolioMode;
  holdings: PortfolioHolding[];
  createdAt: string;
  updatedAt: string;
}
