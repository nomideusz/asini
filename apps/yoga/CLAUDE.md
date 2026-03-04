# CLAUDE.md — Intent Spec for szkolyjogi.pl

> This file encodes the intent of this project for autonomous coding agents.
> Read this before touching any file. Follow these principles over any other heuristic.

---

## What This Is

**szkolyjogi.pl** is a yoga school directory for Poland.

The directory lists yoga studios, shows their schedules, prices, and contact info. Studios are discovered and scraped automatically. Studio owners can claim their profiles to manage their listings.

**Stack:** SvelteKit, TypeScript, SQLite (Turso), Drizzle ORM, pnpm  
**Calendar UI:** `@nomideusz/svelte-calendar` (workspace package at `packages/svelte-calendar`)

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Homepage — city tiles, search, full school table |
| `/[city]` | City page — filtered listings for a city |
| `/category/[slug]` | Style page — listings filtered by yoga style |
| `/listing/[id]` | School profile — schedule, pricing, contact, claim CTA |
| `/listing/[id]/claim` | Claim form — studio owner submits claim request |
| `/about` | About the project |
| `/post` | Add/claim studio info page |
| `/terms` | Terms of service |

---

## Data Model

Key tables in `src/lib/server/db/schema.ts`:

- **`schools`** — studio listings (name, city, pricing, schedule URLs, claim status)
- **`scheduleEntries`** — classes (time, teacher, capacity, flags)
- **`styles`** + **`schoolStyles`** — yoga style tags (many-to-many)
- **`claimRequests`** — profile claim submissions (name, email, role, status)
- **`scrapeLog`** — tracks automatic data refresh

---

## autoColor — Core Differentiator

The calendar's autoColor system: events without a `color` field are auto-assigned consistent colors grouped by `category`. Same class type = same color, always.

**The rule:** Never manually assign `color` on schedule events. Never pass a hardcoded `palette` to adapters. Always set `category: e.style ?? e.className` so the grouping is meaningful.

This applies to both `scheduleToRecurring()` and `scheduleToDated()` in `listing/[id]/+page.svelte`.

---

## Completed

- [x] Public school listings by city and category
- [x] Schedule display (weekly + dated modes) via `@nomideusz/svelte-calendar`
- [x] autoColor (same class type = same color, no hardcoded palette)
- [x] Cancelled classes shown with strikethrough
- [x] Free classes tagged "Bezpłatne"
- [x] Price display, contact info, Google Maps link
- [x] "Claim your profile" form + DB storage (TODO: email notification)
- [x] Static pages: about, post, terms
- [x] Error page, breadcrumbs, SEO meta tags
- [x] robots.txt (references sitemap)
- [x] Sitemap.xml (dynamic, all listings + city + category pages)
- [x] JSON-LD structured data on listing pages (SportsActivityLocation schema)
- [x] Canonical URLs (`<link rel="canonical">` on all pages)
- [x] Polish alphabetical sorting in tables (Intl.Collator pl-PL)

---

## TODO — Bugs

- [ ] Sitemap includes listing with empty ID (`/listing/`) — filter out empty IDs
- [ ] Claim page sidebar duplicates city in address ("Puławska 67, Warszawa, Warszawa")
- [ ] JSON-LD uses `$derived(() => ...)` — should be `$derived.by(() => ...)`

## TODO — Pre-Launch

- [ ] `lang="pl"` on `<html>` tag (accessibility + SEO)
- [ ] Production adapter (replace `adapter-auto` with target platform adapter)
- [ ] Favicon / app icons
- [ ] Email notification on new claim request

---

## Constraints (Non-Negotiable)

- **SvelteKit only.** No separate frontend framework.
- **pnpm only.** Never use npm or yarn.
- **SQLite + Drizzle.** No ORM changes without approval.
- **Polish-first UI.** All user-facing strings in Polish (`pl-PL` locale).
- **`@nomideusz/svelte-calendar`** for all calendar/schedule UI. Do not build a custom calendar.
- **No breaking schema changes** without a migration file in `drizzle/`.
- **Never show Fitssey's live booking data** (spotsLeft, totalCapacity) — it is scraped and stale.

---

## Decision Boundaries

**Decides autonomously:**
- UI layout and styling within existing CSS variable system
- Query optimization that doesn't change the schema
- Component decomposition within a route
- Adding new pages that don't require schema changes

**Must stop and leave a TODO comment:**
- Any schema change (requires migration)
- New npm dependencies
- Authentication / user account logic
- Anything that sends email or SMS
- Changes to the scraper or data pipeline

---

## Dev Commands

```bash
pnpm install
pnpm dev          # dev server at localhost:5173
pnpm build        # production build
pnpm preview      # preview production build
pnpm check        # TypeScript check
```

---

## Code Style

- SvelteKit file conventions: `+page.svelte`, `+page.server.ts`, `+layout.svelte`
- Svelte 5 runes throughout (`$state`, `$derived`, `$props`)
- TypeScript strict mode
- Polish strings for all UI copy
- CSS: use existing `--sf-*` CSS variables (defined in `app.css`)

---

## Stop Conditions

Stop and leave a clear comment if:
- A feature requires a new database table or column (needs migration)
- Correct behavior requires understanding the scraper pipeline
- A change would affect the public URL structure (SEO impact)
- Any external API key or credential is needed
