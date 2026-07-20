# Fund Tracker — Enhancement Implementation Manual

> Execution spec for five portfolio-focused features. Written to be followed step-by-step
> by an implementing model/developer. Grounded in the current backend + frontend as of
> branch `claude/fund-tracker-presenter-XUqhD`.

## 0. Decisions already made (do not re-litigate)

| Topic | Decision | Consequence |
|---|---|---|
| Portfolio storage | **Both** — `localStorage` first (Phase 1), DB table later (Phase 2) | Shape the client data model so it maps 1:1 to a future table. No login in Phase 1. |
| Price/NAV data source | **Public Yahoo tickers only** | Every tracked/back-tested fund must resolve on Yahoo Finance. NAV series come from existing price history (7yr fetched on add). |
| Report export | **PDF** | Extend the existing `@react-pdf` `FundSnapshot` into a `PortfolioSnapshot`. No new PDF library. |
| Return-over-time model | **Multiple buy-ins / top-ups (DCA)** | Units accrue per dated contribution; annualised figure must be **money-weighted (XIRR)**, not simple %. |

## 1. Ground truth about the current app (read before coding)

- **API base**: all endpoints under `/api/v1` (Next.js rewrites proxy `/api/v1/*` → backend). Client in `frontend/src/lib/api.ts`.
- **Trailing return windows are `2Y`, `3Y`, `5Y`** (`returns_service.WINDOW_DEFINITIONS`), returned as **decimals** (`0.27` = 27%). Fields per window: `label, years, cagr, cumulative_return, data_complete, missing_days, warning, start/end_date, start/end_nav`.
- **Chart periods** are `1y|3y|5y` only (`GET /funds/{id}/chart?period=`). Capped at 5 years — **insufficient for arbitrary buy-in dates**, hence the new prices endpoint in §3.
- **Scenario horizons** are `1,3,5` years; `bull = base + sigma`, `bear = max(base - sigma, -0.99)`, `value_per_1000 = 1000*(1+cagr)^years`.
- **Reusable pure math** lives in `backend/app/utils/math_utils.py`: `cumulative_return`, `cagr`, `log_returns`, `annualized_stddev`, `projected_value`.
- **No portfolio / watchlist / user / auth exists.** Everything is keyed by `fund_id` only. CORS is open to the frontend origin.
- **Adding a fund** = `POST /api/v1/funds/search {query}` → resolves ticker/ISIN/internal_code, creates the `Fund`, fetches 7yr prices, returns `{fund, created}`. This is the mechanism behind "track these funds" (§7, feature 5).
- **PDF path**: `usePdfExport(fundId)` (`frontend/src/hooks/usePdfExport.ts`) fetches `getFund/getReturns/getScenarios/getNews`, dynamically imports `@react-pdf/renderer` + `FundSnapshot`, builds a blob, triggers download. `FundSnapshot.tsx` is A4 landscape, Helvetica, `StyleSheet.create`.
- **Migrations**: `alembic/versions/` is empty; dev relies on `Base.metadata.create_all` at startup. Any new model must be imported in `app/models/__init__.py` or it won't be registered.

---

## 2. Shared client data model (Phase 1 — `localStorage`)

Single source of truth for portfolios, designed to drop into a DB table later. Store under key `ft.portfolios.v1`.

```ts
// frontend/src/types/portfolio.ts
export interface Contribution {
  id: string;          // uuid
  date: string;        // ISO yyyy-mm-dd (buy-in date)
  amount: number;      // cash invested in portfolio base currency
}
export interface PortfolioHolding {
  fundId: number;
  ticker: string | null;
  name: string;
  currency: string;                 // fund.currency (for FX flagging — see §8 open Q)
  mode: "allocation" | "holdings";  // per-holding; a portfolio is normally all one mode
  targetWeightPct?: number;         // allocation mode: 0..100
  contributions?: Contribution[];   // holdings mode: DCA buy-ins
}
export interface Portfolio {
  id: string;              // uuid
  name: string;
  baseCurrency: string;    // default "USD"
  mode: "allocation" | "holdings";
  holdings: PortfolioHolding[];
  createdAt: string;
  updatedAt: string;
}
```

Helpers to build:
- `frontend/src/hooks/useLocalStorage.ts` — generic `useLocalStorage<T>(key, initial)`.
- `frontend/src/hooks/usePortfolios.ts` — CRUD over the array in `localStorage` (`create/update/delete/get/list`), returns stable callbacks. **This is the seam for Phase 2**: swap its internals from `localStorage` to `fetch('/api/v1/portfolios')` without touching components.

> Phase 2 mapping (for reference, don't build yet): tables `portfolios(id, name, base_currency, mode, created_at, updated_at)`, `portfolio_holdings(id, portfolio_id FK, fund_id FK, mode, target_weight)`, `contributions(id, holding_id FK, date, amount)`. Add each model, register in `app/models/__init__.py`, add router `routers/portfolios.py`, generate `alembic revision --autogenerate`.

---

## 3. Backend addition (the ONLY backend change in Phase 1)

Arbitrary buy-in dates need NAV history beyond the 5y chart cap. Add a date-ranged prices endpoint that reuses the existing series function.

**File**: `backend/app/routers/returns.py` (add to the existing `/funds` router)

```python
@router.get("/{fund_id}/prices", response_model=PricesResponse)
def get_prices(fund_id: int, start: date | None = None, end: date | None = None, db: Session = Depends(get_db)):
    series = _price_series_for_fund(db, fund_id)          # existing helper, ascending
    if start: series = [(d, n) for d, n in series if d >= start]
    if end:   series = [(d, n) for d, n in series if d <= end]
    return PricesResponse(fund_id=fund_id, series=[ChartPoint(date=d, nav=n) for d, n in series])
```

**Schema** (`backend/app/schemas/returns.py`): reuse `ChartPoint`; add
`class PricesResponse(BaseModel): fund_id: int; series: list[ChartPoint]`.

**Client** (`frontend/src/lib/api.ts`):
```ts
export async function getPrices(fundId: number, start?: string, end?: string): Promise<ChartData> {
  const qs = new URLSearchParams(); if (start) qs.set("start", start); if (end) qs.set("end", end);
  return apiFetch<ChartData>(`/funds/${fundId}/prices?${qs}`);
}
```
Add a `usePrices(fundId, start)` SWR hook mirroring `useChart`.

**Acceptance**: `GET /api/v1/funds/1/prices?start=2019-01-01` returns the full series from that date; empty `series` when the fund has no prices (don't 500).

---

## 4. Feature 1 — List view (alternative to grid)

Frontend only. No backend change.

**Build**
- `frontend/src/hooks/useViewMode.ts` — `useLocalStorage<"grid"|"list">("ft.viewmode", "grid")`.
- `frontend/src/components/fund/ViewToggle.tsx` — segmented control (grid ▦ / list ☰), calls setter.
- `frontend/src/components/fund/FundListView.tsx` — a table: columns **Name · Ticker · Class · NAV · 2Y · 3Y · 5Y · Actions**. Reuse `useReturns(fund.id)` per row, `formatCurrency`/`formatPercent`/`pctColor`. Row click → `/fund/{id}`. Include the delete (`✕`) and an "Add to portfolio" action. Wrap in `overflow-x:auto`.

**Edit**: `frontend/src/app/page.tsx` — add `const [view] = useViewMode()`, render `<ViewToggle/>` in the header row, and branch `view === "grid" ? <FundGrid/> : <FundListView/>`.

**Acceptance**: toggle persists across reload; both views show identical data; list view is horizontally scrollable on mobile, not the page body.

---

## 5. Feature 2 — Portfolio builder + weighted-average return (allocation mode)

**Goal**: pick funds, assign target weights (%), see the blended trailing return.

**Algorithm** (pure fn `frontend/src/lib/portfolio.ts`):
```
normalizeWeights(holdings): scale targetWeightPct so Σ = 100 (or warn if user wants raw).
For each window W in [2Y,3Y,5Y]:
  weightedCagr[W]       = Σ_i (w_i * cagr_i[W])            // w_i = weight/100
  weightedCumulative[W] = Σ_i (w_i * cumulative_i[W])
  complete[W] = every constituent's window has data_complete === true
```
- Fetch each constituent's returns via existing `getReturns`. Skip/flag funds missing a window (`data_complete=false`) — show the blended number greyed with a "partial data" note (inherit the same caveat the per-fund UI shows).
- Optional: **blended projection** — Σ w_i · base/bull/bear_cagr from each fund's `getScenarios`, then `value_per_1000 = 1000*(1+blendedCagr)^h`. Mirrors `ScenarioSection`.

**UI**: `frontend/src/app/portfolio/page.tsx` (+ nav link "Portfolios").
- Portfolio picker (list from `usePortfolios`) + "New portfolio".
- Fund selector: add from tracked funds (`getFunds`) or search.
- Editable weight inputs with a live "Σ = 100%" validator and a "normalise" button.
- Results card: weighted 2Y/3Y/5Y CAGR + cumulative, per-holding contribution breakdown, blended projection chart (reuse recharts BarChart like `ScenarioSection`).

**Acceptance**: a 60/40 SPY/AGG-style split shows a weighted CAGR between the two constituents; weights not summing to 100 are flagged; removing a fund recomputes instantly.

---

## 6. Feature 4 — Actual holdings, buy-in dates, return over time (holdings mode)

**Goal**: user keys in real contributions (amount + date, multiple per fund); plot portfolio value vs invested from first buy-in to today; show simple return + annualised **XIRR**.

**Data prerequisite**: per-fund full NAV series via `getPrices(fundId, earliestBuyIn)` (§3).

**Algorithms** (`frontend/src/lib/portfolio.ts`):
```
navAsOf(series, d): NAV on the latest price_date <= d (binary search; null if d precedes data).
Per holding h with contributions [(d_k, a_k)]:
  units_k        = a_k / navAsOf(series_h, d_k)          // reject if navAsOf null → warn "buy-in predates data"
  unitsHeld(t)   = Σ_{d_k <= t} units_k
  value_h(t)     = unitsHeld(t) * navAsOf(series_h, t)
Timeline T = sorted union of all funds' price_dates in [minBuyIn, today] (or monthly sampling for long spans).
portfolioValue(t) = Σ_h value_h(t)            // assumes one baseCurrency — see §8
invested(t)       = Σ_{all d_k <= t} a_k
simpleReturn      = (portfolioValue(today) - invested(today)) / invested(today)
```
**XIRR** (money-weighted annualised return) — hand-rolled, no dependency:
```ts
// cashflows: contributions as NEGATIVE on their dates + current value POSITIVE today
function xirr(cf: {amount:number; date:string}[]): number | null {
  const t0 = new Date(cf[0].date).getTime();
  const yf = (d:string) => (new Date(d).getTime() - t0) / (365.25*864e5);
  const npv = (r:number) => cf.reduce((s,c)=> s + c.amount / Math.pow(1+r, yf(c.date)), 0);
  const dnpv = (r:number) => cf.reduce((s,c)=> s - yf(c.date)*c.amount / Math.pow(1+r, yf(c.date)+1), 0);
  let r = 0.1;
  for (let i=0;i<100;i++){ const f=npv(r), d=dnpv(r); if(!isFinite(f)||!isFinite(d)) break;
    const nr = r - f/d; if(Math.abs(nr-r)<1e-7) return nr; r=nr; }
  // bisection fallback on [-0.9999, 10]
  let lo=-0.9999, hi=10, flo=npv(lo); if (flo*npv(hi) > 0) return null;
  for (let i=0;i<200;i++){ const mid=(lo+hi)/2, fm=npv(mid);
    if(Math.abs(fm)<1e-7) return mid; (flo*fm<0)?(hi=mid):(lo=mid, flo=fm); }
  return (lo+hi)/2;
}
```

**UI**: on the same portfolio page when `mode==="holdings"`:
- Per-holding contribution editor (rows of date + amount, add/remove).
- Value-over-time chart (recharts `LineChart`): two series — **Portfolio value** (line) and **Invested** (step line). Reuse `PerformanceChart` styling/colors.
- Summary tiles: total invested, current value, absolute gain, **simple return %**, **XIRR %/yr**.
- Warnings for buy-ins predating a fund's data coverage.

**Acceptance**: a single $10k buy-in of SPY 3 years ago shows current value ≈ NAV_today/NAV_then × 10k, simpleReturn matches, and XIRR ≈ SPY's 3Y CAGR; adding a second dated top-up shifts XIRR correctly and the invested step-line jumps on that date.

---

## 7. Feature 3 — Export portfolio as PDF

**Build**
- `frontend/src/components/pdf/PortfolioSnapshot.tsx` — clone `FundSnapshot` structure. Props: `{ portfolio, weighted, holdings[], timeline?, summary? }`. Sections:
  - Header: portfolio name, baseCurrency, generated timestamp, holding count.
  - Holdings table: name · ticker · weight% (allocation) or invested/current/units (holdings) · 2Y/3Y/5Y CAGR.
  - Weighted returns block (allocation) **or** invested/current/simpleReturn/XIRR tiles (holdings).
  - Value-over-time mini line: draw with `@react-pdf` `<Svg><Path/>` from the computed timeline (no recharts in PDF). Skip if allocation mode.
  - Disclaimer box (fetch via `getDisclaimer()` or reuse `scenarios.disclaimer` text).
- `frontend/src/hooks/usePortfolioPdfExport.ts` — mirror `usePdfExport`: gather data, dynamic-import `@react-pdf/renderer` + `PortfolioSnapshot`, `pdf(doc).toBlob()`, download as `portfolio-${slug(name)}.pdf`.

**Edit**: add an "Export PDF" button on the portfolio page.

**Acceptance**: exported PDF opens, matches the on-screen numbers, and renders the value line in holdings mode.

---

## 8. Feature 5 — Tracked-funds list (watchlist)

Since data = Yahoo tickers, "tracking a fund" = adding it via `POST /funds/search`. The dashboard already lists all added funds; this feature makes bulk onboarding easy and (optionally) groups funds.

**Phase 1 (no backend change)**
- `frontend/src/components/fund/BulkAddFunds.tsx` — a textarea accepting one ticker per line (or comma-separated). On submit, call `searchFund(ticker)` sequentially with a progress list (✓ added / • exists / ✗ not found on Yahoo). Surface failures clearly so the user can fix tickers.
- Optional named watchlists in `localStorage` (`ft.watchlists.v1`: `{id, name, fundIds[]}`) with a filter chip row on the dashboard. Only build if the user wants grouping; otherwise the tracked list == all non-demo funds.

**Phase 2**: `watchlists` / `watchlist_items` tables + `routers/watchlists.py`.

**⚠ Requires input from the user**: the actual ticker list (see §9). Funds without a Yahoo ticker (e.g. HSBC Life SG ILP funds) cannot be auto-tracked or back-tested — they'd need CSV NAV import and are out of scope for the auto-plot features.

**Acceptance**: pasting `SPY, VWRA.L, QQQ` adds three funds with 7yr history; an invalid ticker reports "not found" without aborting the batch.

---

## 9. What I still need from you (blocking / decisions)

1. **The ticker list (feature 5)** — *blocking for a real end-to-end demo.* Give me Yahoo Finance tickers for every fund you want to track (e.g. `SPY`, `VWRA.L`, `QQQ`, `0P0000XXXX.SI` for SG-listed funds). Names-only is fine too — I'll resolve what I can and report misses.
2. **Multi-currency policy** — a portfolio mixing USD and SGD funds needs FX conversion to a base currency, which Yahoo NAV alone doesn't give us. Phase 1 assumes **all holdings share one base currency** and does no FX. Confirm that's acceptable, or we add an FX source (later phase).
3. **XIRR vs simple return** — plan shows **both**, headlining XIRR as the annualised figure. Confirm.
4. **PDF branding** — plain (current Helvetica/no logo) is the default. Send a logo/color if you want it branded.

## 10. Tools / dependencies

- **No new npm/pip packages required.** `@react-pdf/renderer`, `recharts`, `swr`, `clsx` already present; XIRR/units math is hand-rolled; date handling uses `Date` + existing helpers.
- **Backend**: one new endpoint (§3), existing deps only. yfinance fetches work through the outbound proxy.
- **To run & verify** (the executing model needs this): backend `uvicorn app.main:app` (SQLite default) + frontend `npm run dev`; add a few real tickers via search to get live data.
- **Phase 2 only**: Alembic migrations (`alembic` already installed; generate first real migration when the portfolio tables land).

## 11. Suggested execution order

1. §3 prices endpoint (+ client hook) — unblocks §6.
2. §4 List view (F1) — small, self-contained, ships value immediately.
3. §2 model + `usePortfolios`/`useLocalStorage` seam.
4. §5 allocation-mode weighted returns (F2).
5. §6 holdings mode + value-over-time + XIRR (F4).
6. §7 portfolio PDF (F3).
7. §8 bulk-add tracked funds (F5) — once the user provides tickers.
8. Tests: unit-test the pure functions (`weightedReturns`, `navAsOf`, `unitsHeld`, `xirr`) — these carry the correctness risk.

## 12. Correctness watch-list (where bugs will hide)

- Returns are **decimals** end-to-end; only multiply by 100 at render (`formatPercent` already does).
- Windows are **2Y/3Y/5Y**, not 1Y — don't invent a 1Y trailing return; use chart/prices for shorter spans.
- `navAsOf` must use **≤ date** (last known NAV), never interpolate forward; a buy-in on a weekend/holiday takes the prior trading day.
- Funds have **differing date coverage**; align on the union of dates and forward-fill, and propagate `data_complete=false` into blended figures.
- XIRR needs cashflows **sorted by date** and at least one negative + one positive; return `null` and show "—" otherwise.
- Guard divide-by-zero: `invested === 0`, empty series, single-point series.
