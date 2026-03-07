# yoga-scraper — Data pipeline for szkolyjogi.pl

Standalone Python scraper that discovers, enriches, and maintains yoga school data
in the shared Turso database. The SvelteKit website reads from the same DB.

## Architecture

```
┌──────────────────┐          ┌──────────────────┐
│  yoga (SvelteKit) │          │  yoga-scraper     │
│  Reads from Turso │◄────────►│  Writes to Turso  │
│  Drizzle ORM      │  Turso   │  libsql-client    │
│  Deployed on web   │   DB    │  Runs locally     │
└──────────────────┘          └──────────────────┘
```

**Schema owner:** The SvelteKit project (`yoga/src/lib/server/db/schema.ts`) owns the DB schema via Drizzle.
The scraper validates the schema at startup and fails loudly if columns are missing.

## Setup

```bash
cd yoga-scraper
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -e .
```

### Configure `.env`

```bash
cp .env.example .env
# Edit with your keys — use the same TURSO_DATABASE_URL as the web project
```

### Install browsers (for URL discovery with crawl4ai)

```bash
crawl4ai-setup
# or: python -m playwright install chromium
```

## Usage

All commands go through a unified CLI:

```bash
# Discover schools via Google Places API
yoga-scraper seed
yoga-scraper seed --cities Warszawa Kraków
yoga-scraper seed --dry-run

# Scrape websites for pricing, about, schedules
yoga-scraper scrape
yoga-scraper scrape --school yoga-republic
yoga-scraper scrape --prices-only
yoga-scraper scrape --city Kraków
yoga-scraper scrape --force --limit 5

# Scrape Fitssey schedules (Playwright XHR intercept)
yoga-scraper scrape-schedules
yoga-scraper scrape-schedules --school joga-centrum
yoga-scraper scrape-schedules --retry-empty
yoga-scraper scrape-schedules --engine crawl4ai

# Generate editorial descriptions from raw text
yoga-scraper normalize
yoga-scraper normalize --school yoga-republic
yoga-scraper normalize --force

# Consolidate duplicate yoga styles to canonical names
yoga-scraper consolidate-styles --dry-run
yoga-scraper consolidate-styles

# Check data coverage
yoga-scraper status
yoga-scraper status --missing prices
yoga-scraper status --missing schedules

# View scrape history
yoga-scraper log
yoga-scraper log --school yoga-republic
yoga-scraper log --task scrape_pricing
```

## Full Pipeline

```bash
yoga-scraper seed                    # 1. Discover schools via Google Places
yoga-scraper scrape                  # 2. Enrich with website data (prices, about, schedule)
yoga-scraper scrape-schedules        # 3. Scrape Fitssey schedules (XHR intercept)
yoga-scraper normalize               # 4. Generate editorial descriptions
yoga-scraper consolidate-styles      # 5. Merge duplicate yoga styles
yoga-scraper status                  # 6. Check what's still missing
```

## Schema Validation

On every run, the scraper checks that all required DB columns exist.
If the Drizzle schema changes in the web project:

1. Run `pnpm db:push` in the web project to push schema changes to Turso
2. The scraper will automatically detect the new columns on its next run
3. If columns were *removed*, the scraper will fail with a clear error listing what's missing

## Tracking

Every scrape attempt is logged in the `scrape_log` table:
- **task**: what was done (seed, discover_urls, scrape_pricing, etc.)
- **status**: success, error, no_data, skipped
- **message**: error details or summary of what was found
- **fields_updated**: which DB fields were changed
- **duration_ms**: how long it took

Use `yoga-scraper status` and `yoga-scraper log` to inspect.

## Project Structure

```
yoga-scraper/
├── pyproject.toml          # Dependencies & CLI entry point
├── .env                    # API keys & Turso credentials
├── seeds.yaml              # Known yoga schools with URLs
├── src/
│   ├── cli.py              # Unified CLI entry point
│   ├── db.py               # Database connection, schema validation, queries, style normalization
│   ├── tracking.py         # Scrape log & freshness reporting
│   ├── models.py           # Pydantic models for LLM extraction
│   ├── seed_from_places.py # Google Places discovery
│   ├── scrape.py           # Website scraping (crawl4ai + LLM) → DB
│   ├── scrape_fitssey.py   # Fitssey schedule scraping (Playwright XHR intercept)
│   └── normalize.py        # LLM description generation
├── _dashboard.py           # Quick data coverage dashboard
├── _overnight.py           # Batch scraper (all cities, subprocess per city)
├── _validate.py            # Manual extraction quality review
└── tests/
```
