# CLAUDE.md — Yoga Scraper Project Context

## Project Overview

Data pipeline for **szkolyjogi.pl** — discovers, scrapes, and enriches yoga school data across Polish cities. Stores data in a remote Turso (libsql) database shared with a SvelteKit frontend.

## Tech Stack

- **Python 3.13** on Windows
- **crawl4ai 0.8.0** — async web crawler with Playwright backend
- **OpenAI GPT-4o-mini** — structured output for LLM extraction (pricing, about, schedule)
- **Pydantic v2** — data models / JSON schemas for LLM responses
- **libsql_client** — sync HTTP client for Turso remote DB
- **Playwright** — used by `scrape_fitssey.py` for XHR interception
- **Turso** — remote SQLite database (has SQL limitations — see below)

## Architecture

```
src/
  db.py              — DB connection, schema validation, all read/write helpers (~415 lines)
  models.py          — Pydantic models: PricingTier, PricingData, ScheduleEntry, ScheduleData, AboutData
  tracking.py        — Scrape logging: ensure_scrape_log_table(), log_scrape(), track_scrape()
  scrape.py          — Main crawl4ai + LLM extraction pipeline (~715 lines, includes Pydantic validation)
  scrape_fitssey.py  — Fitssey XHR schedule scraper (Playwright-based, 866 lines)
  seed_from_places.py — Google Places API seeder (330 lines)
  __init__.py
```

### Helper/Analysis Scripts (prefixed with `_`)
```
_dashboard.py      — Data coverage dashboard (run to see enrichment state)
_validate.py       — Manual validation of extraction quality on sample schools
_analyze_urls.py   — URL categorization (335 non-Fitssey schedule URLs mapped)
_db_state.py       — Original database health check
```

## Key Commands

```bash
# Run dashboard to see data state
python _dashboard.py

# Run validation on sample schools
python _validate.py

# Scrape all schools needing data
python -m src.scrape

# Scrape specific school
python -m src.scrape --school yoga-republic

# Scrape specific city with limit
python -m src.scrape --city Kraków --limit 10

# Prices only
python -m src.scrape --prices-only

# Force re-scrape
python -m src.scrape --force --limit 5
```

## Database

- **Remote**: Turso at `https://yogadb-nomideusz.aws-eu-west-1.turso.io`
- **Schema**: 5 tables (schools, school_styles, schedule_entries, scrape_log, etc.) with 71+ columns
- **Contract**: `REQUIRED_COLUMNS` dict in `db.py` defines the column contract with the SvelteKit Drizzle schema

### Turso SQL Limitations (IMPORTANT)
- **No `GROUP_CONCAT()`** — use alternative approaches
- **No `RANDOM()`** — use `ORDER BY` without random
- **Subqueries in SELECT can fail** — prefer JOINs or separate queries
- **`LENGTH()` in complex expressions** — may cause `KeyError: 'result'` (the libsql_client error when Turso can't parse SQL)
- When Turso rejects a query, `libsql_client` throws `KeyError: 'result'` — this is the universal "unsupported SQL" signal

## Current Data State (as of last dashboard run — 2026-03-03)

| Field | Count | % of 657 w/ website |
|-------|------:|----:|
| pricing_json | 130 | 20% |
| description | 27 | 4% |
| email | 25 | 4% |
| phone | 666 | 101%* |
| styles | 394 | 60% |
| schedule | 16 schools, 623 rows | 2% |

\* phones + styles came from Google Places seed, not scraping

### Enrichment by City
- **Warszawa (partially enriched)**: 19/75 pricing, 26/75 about, 24/75 email — batch interrupted mid-run (~35 of 75 processed)
- **Big cities (ZERO enrichment)**: Kraków (72), Wrocław (56), Łódź (52), Poznań (48), Szczecin (42), Toruń (35)
- **Partially enriched (pricing only)**: Katowice (24/34), Gdańsk (22/47), Gdynia (15/24), Bydgoszcz (13/18), Gliwice (11/15), Częstochowa (9/11), Białystok (8/9 + 1 about/email)

### Work Remaining
- 527 schools need pricing (246 already have a pricing_url discovered)
- 630 schools need description
- 632 schools need email
- 352 schools need schedule (30 Fitssey, 338 other)

## Scrape Pipeline (src/scrape.py)

### Flow per school:
1. **Crawl homepage** with `keep_nav_footer=True` (for contact info extraction)
2. **Discover subpage URLs** — pricing_url, schedule_url, about_url (via link patterns)
3. **Crawl content pages** (pricing, about/contact) with nav/footer stripped
4. **Extract pricing** via LLM → `PricingData` (tiers with names, prices, durations)
5. **Extract about** via LLM → `AboutData` (description, styles, phone, email) — merges homepage + about/contact page content
6. **Extract schedule** via crawl → signal check → optional JS fallback → LLM → `ScheduleData`

### Critical Safeguards

#### Schedule Hallucination Prevention
- `_has_schedule_signals(markdown)` — requires **≥2 time patterns** (HH:MM) AND **≥1 Polish day-of-week** before sending to LLM
- Without this, GPT-4o-mini fabricates entire schedules from generic page content
- Prompt includes "NEVER invent or fabricate data" + list of known fake names to reject

#### JS-Rendered Schedule Pages
- `crawl_schedule_page(url)` — uses JS `window.scrollTo` + 4.5s total wait for dynamic content
- `CacheMode.BYPASS` to avoid stale cached versions
- No `wait_for` CSS selector (Turso comma-separated selector bug)
- Auto-triggered when regular crawl lacks schedule signals

#### About Page Discovery
- Discovers `/o-nas`, `/kontakt`, `/about`, `/o-studio` pages via `ABOUT_LINK_PATTERNS` regex
- Homepage crawled with `keep_nav_footer=True` to capture contact info in footer
- Content from homepage + about page merged before LLM extraction

### crawl4ai Notes
- `CacheMode.BYPASS` for schedule pages, `CacheMode.ENABLED` for regular pages
- `remove_overlay_elements=True` — helps with cookie banners but not perfect
- `wait_for` CSS selectors must NOT use comma-separated values
- Concurrency default: 5 concurrent crawls

## Goals & Roadmap

### Phase 1: Foundation ✅ COMPLETE
- [x] Delete 7 old scripts, keep only db.py, scrape_fitssey.py, seed_from_places.py
- [x] Build `tracking.py` — scrape logging
- [x] Build `models.py` — Pydantic extraction schemas
- [x] Build `scrape.py` — crawl4ai + LLM pipeline
- [x] Verify imports, dry-run test (1 school)

### Phase 2: Data Quality Fixes ✅ COMPLETE
- [x] Identify quality issues (5-school validation)
- [x] Fix #1: Schedule hallucination — `_has_schedule_signals()` + improved prompt
- [x] Fix #2: Empty about extraction — about page discovery, keep_nav_footer, better prompt
- [x] Fix #3: JS-rendered schedules — `crawl_schedule_page()` with JS scroll fallback
- [x] Fix #4: wait_for CSS selector bug — removed entirely, rely on JS delays
- [x] Re-validate fixes (Luna Pilates + Z Miłości confirmed working)

### Phase 3: Data Visibility ✅ COMPLETE
- [x] Build `_dashboard.py` — data coverage dashboard
- [x] Fix Turso SQL compatibility issues in dashboard queries

### Phase 4: Enrichment Runs 🔶 IN PROGRESS
- [x] First test batch: 10 schools in Warszawa (9 enriched, 1 error)
- [x] Review quality — extraction is solid (pricing tiers, descriptions, emails, phones)
- [x] Bug fix: "unhashable type: 'dict'" — LLM returns dicts instead of strings for styles
  - Added Pydantic model_validate() in extract_with_llm() (falls back to raw on validation failure)
  - Added defensive dict→string coercion in update_about() for styles
- [ ] **Resume Warszawa** — ~35/75 done, ~40 remaining (run: `python -m src.scrape --city Warszawa`)
- [ ] Proceed city by city: Kraków → Wrocław → Łódź → Poznań → Szczecin → Toruń → etc.
- [ ] Re-run cities with pricing-only data (Gdańsk, Katowice, Gdynia, etc.) for about/email
- [ ] Run Fitssey schedule scraper on 30 known Fitssey schools

### Phase 5: Polish & Tooling ❌ NOT STARTED
- [ ] Rebuild `normalize.py` — data cleaning/normalization
- [ ] Rebuild `cli.py` — proper CLI with argparse (pyproject.toml entry point exists but is broken)
- [ ] Schedule type detection (weekly vs dated schedules)
- [ ] Bulk production runs with error handling & resume

## Known Limitations

1. **~60-70% of schedule URLs use embedded booking widgets** (Fitssey, Booksy, etc.) that can't be scraped with crawl4ai — need specialized scrapers or are unsupportable
2. **Cookie consent banners** still pollute some markdown despite `remove_overlay_elements=True`
3. **Turso SQL limitations** require careful query construction — no GROUP_CONCAT, no RANDOM(), fragile subqueries
4. **iframe-based booking widgets** are invisible to crawl4ai (Fitssey has its own XHR scraper)
5. **Rate limits**: OpenAI calls are sequential per school; crawl4ai concurrency default is 5
6. **LLM schema drift**: GPT-4o-mini sometimes returns `{"type":"string"}` objects instead of actual string values for styles — handled by Pydantic validation fallback + defensive coercion in `update_about()`
7. **Fitssey-hosted sites** (e.g. Blisko Studio Jogi) — crawl4ai can scrape Fitssey pricing pages but returns no pricing for class-only schools (price=None); about extraction still works
8. **Throughput**: ~45 seconds per school on average (crawl + LLM); 75-school batch takes ~55 min

## Environment

- `.env` contains `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `OPENAI_API_KEY`, `GOOGLE_PLACES_API_KEY`
- Virtual environment at `.venv/`
- Install: `pip install -e .`
- Python encoding: set `PYTHONIOENCODING=utf-8` for Windows terminal output with Polish characters
