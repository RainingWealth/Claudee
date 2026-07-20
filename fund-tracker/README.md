# Fund Tracker & Presenter

A client-facing web application for tracking fund performance, computing trailing returns,
visualising price history, fetching relevant news, and generating scenario-based forward projections.

> **Educational use only.** Not financial advice. Past performance does not guarantee future results.

---

## Features

- **Multi-identifier input**: Look up funds by **ticker** (SPY), **ISIN** (US78462F1030), or **internal fund code**
- **Trailing returns**: 2Y, 3Y, 5Y annualised CAGR and cumulative return with missing-data warnings
- **Performance chart**: Interactive line chart with 1Y / 3Y / 5Y period toggle
- **Fund summary**: Objective, style, top holdings / sectors / countries (from Yahoo Finance)
- **News feed**: Latest fund-relevant news with citations and links (Google News RSS, no key required)
- **Scenario projections**: Base / Bull / Bear forward projections (±1σ from historical CAGR)
- **PDF export**: One-page client snapshot (generated client-side, no backend needed)
- **CSV upload**: Import NAV history for private/unlisted funds
- **Demo mode**: Pre-loaded demo funds (SPY, VWRA.L, Sample Private Fund)
- **Audit log**: Every data refresh and upload is logged with timestamps and source info
- **Compliance**: Mandatory disclaimers on all projection displays and PDF exports

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend API | FastAPI (Python 3.11) |
| Data source | Yahoo Finance via `yfinance` |
| CSV upload | Custom parser with multi-format date support |
| ISIN lookup | OpenFIGI free API |
| Database | SQLite (default) or PostgreSQL |
| News | Google News RSS via `feedparser` |
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| PDF export | @react-pdf/renderer (client-side) |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env as needed (defaults work out of the box with SQLite)

# Start the API server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
API documentation: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

The app will be available at `http://localhost:3000`.

### 3. Load Demo Data

With the backend running:

```bash
curl -X POST http://localhost:8000/api/v1/demo/seed
```

Or click "Load Demo Funds" on the dashboard.

---

## Running Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

Tests cover:
- Return calculation math (CAGR, cumulative, missing-data edge cases)
- Scenario projection math (bull > base > bear, bear floor, disclaimer)
- CSV adapter (BOM, multi-format dates, negative NAV rejection)
- API integration tests (fund search, returns endpoint)

---

## Environment Variables

Copy `.env.example` to `backend/.env`:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./fund_tracker.db` | Database connection URL |
| `DEMO_MODE` | `false` | Auto-seed demo funds on startup |
| `LOG_LEVEL` | `INFO` | Logging verbosity |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |
| `CACHE_TTL_HOURS` | `24` | Price/returns cache TTL |
| `NEWS_CACHE_TTL_HOURS` | `6` | News cache TTL |
| `NEWSAPI_KEY` | _(unset)_ | Optional: NewsAPI.org fallback |
| `OPENFIGI_API_KEY` | _(unset)_ | Optional: increases OpenFIGI rate limits |
| `OPENAI_API_KEY` | _(unset)_ | Optional: enables AI news summaries |
| `MAX_CSV_SIZE_MB` | `10` | CSV upload size limit |

---

## CSV Upload Format

```csv
date,nav
2024-01-02,100.00
2024-01-03,100.50
2024-01-04,99.75
```

- Columns `date` and `nav` are required (case-insensitive)
- Supported date formats: `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, `DD-Mon-YYYY`
- NAV values must be positive
- UTF-8 and UTF-8-with-BOM are both supported
- Download a blank template: `GET /api/v1/upload/template`

---

## API Reference

Base URL: `http://localhost:8000/api/v1`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/funds/search` | Resolve ticker/ISIN/code, create fund |
| `GET` | `/funds` | List all funds |
| `GET` | `/funds/{id}` | Fund detail + holdings |
| `DELETE` | `/funds/{id}` | Remove fund |
| `GET` | `/funds/{id}/returns` | Trailing 2Y/3Y/5Y returns |
| `GET` | `/funds/{id}/chart?period=1y` | Daily NAV series for chart |
| `GET` | `/funds/{id}/news` | Latest news (cached 6h) |
| `POST` | `/funds/{id}/news/refresh` | Force news re-fetch |
| `GET` | `/funds/{id}/scenarios` | Base/bull/bear projections |
| `POST` | `/upload/csv` | Upload NAV CSV |
| `GET` | `/upload/template` | Download CSV template |
| `POST` | `/refresh/{id}` | Re-fetch prices from yfinance |
| `POST` | `/refresh/all` | Re-fetch all yfinance funds |
| `POST` | `/demo/seed` | Seed demo data (idempotent) |
| `DELETE` | `/demo/reset` | Remove all demo funds |
| `GET` | `/config/disclaimer` | Get disclaimer text |

Full interactive docs: `http://localhost:8000/docs`

---

## Scenario Projection Methodology

Projections use **historical data only**. The math is transparent and auditable:

1. **Base CAGR**: Compound Annual Growth Rate from the longest available window (5Y → 3Y → 2Y)
2. **Annualised volatility**: Standard deviation of daily log returns × √252
3. **Bull scenario**: Base + 1 standard deviation
4. **Bear scenario**: max(Base − 1 standard deviation, −99%) — floored to prevent negative projected values
5. **Projected value**: $1,000 × (1 + rate)^years

News context may appear in the `notes` field but **does not mathematically alter the CAGR** — this keeps projections auditable and avoids hallucination risk.

**All projections carry a mandatory disclaimer and are for educational purposes only.**

---

## Compliance & Audit Trail

- Every data operation (price refresh, CSV upload, news fetch, scenario generation) is recorded in the `audit_log` table with:
  - Event type, fund ID, timestamp, data source, row counts
  - Success / partial / error status with error messages
- Disclaimer text is served dynamically from the backend (`GET /config/disclaimer`) so it can be updated without a frontend redeploy
- Every fund card shows "Data as of [date] UTC" for transparency
- Demo funds are clearly labeled with a "Demo" badge

---

## Docker (Optional)

```bash
# Start everything with Docker Compose
docker-compose up

# With demo mode enabled
DEMO_MODE=true docker-compose up
```

---

## Project Structure

```
fund-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app
│   │   ├── config.py         # Settings + disclaimer text
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── models/           # ORM models (Fund, PriceHistory, etc.)
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # API endpoints
│   │   ├── adapters/         # Data source adapters
│   │   ├── services/         # Business logic
│   │   └── utils/            # Pure math + date helpers
│   └── tests/                # pytest test suite
├── frontend/
│   └── src/
│       ├── app/              # Next.js 14 App Router pages
│       ├── components/       # React components
│       ├── hooks/            # SWR data-fetching hooks
│       ├── lib/              # API client + formatters
│       └── types/            # TypeScript type definitions
├── .env.example
├── docker-compose.yml
└── README.md
```
