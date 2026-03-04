# CLAUDE.md — Asini Monorepo

> Root context file for the monorepo. For project-specific context, see each project's own CLAUDE.md.

---

## What This Is

**Asini** is a pnpm monorepo containing the full stack for **szkolyjogi.pl** — a yoga school directory and future booking SaaS for Poland.

## Structure

```
packages/
  svelte-calendar/     — Svelte 5 calendar component library (@nomideusz/svelte-calendar)
  svelte-scheduler/    — booking/scheduling logic library (@nomideusz/svelte-scheduler)
apps/
  yoga/                — SvelteKit web app (szkolyjogi.pl)
tools/
  yoga-scraper/        — Python data pipeline (crawl4ai + LLM extraction)
```

## Workspace Relationships

- `apps/yoga` depends on `packages/svelte-calendar` via `workspace:*`
- `packages/svelte-scheduler` peers on `packages/svelte-calendar`
- `tools/yoga-scraper` is a Python project (not part of pnpm workspace), shares Turso DB with `apps/yoga`
- `packages/svelte-calendar` is also published to npm as `@nomideusz/svelte-calendar`
- `packages/svelte-scheduler` is also published to npm as `@nomideusz/svelte-scheduler`

## Commands

```bash
# Install all JS dependencies
pnpm install

# Dev servers
pnpm dev:calendar        # calendar demo site (packages/svelte-calendar)
pnpm dev:scheduler       # scheduler demo site (packages/svelte-scheduler)
pnpm dev:yoga            # szkolyjogi.pl app (apps/yoga)

# Build
pnpm build:calendar      # build calendar
pnpm build:scheduler     # build scheduler
pnpm build:yoga          # build yoga app
pnpm package:calendar    # package calendar for npm publish
pnpm package:scheduler   # package scheduler for npm publish

# Quality
pnpm check               # typecheck all JS packages
pnpm test                # run tests across all packages

# Python (yoga-scraper)
cd tools/yoga-scraper
python -m src.scrape     # run scraper
python _dashboard.py     # data coverage dashboard
```

## Conventions

- **Package manager:** pnpm with workspaces
- **Node.js:** >=20
- **Python:** >=3.11 (yoga-scraper only)
- **TypeScript:** strict mode in all JS projects
- **Svelte:** v5 (runes mode)
