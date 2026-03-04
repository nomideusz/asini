# CLAUDE.md — Intent Spec for @nomideusz/svelte-calendar

> This file encodes the intent of this project for autonomous coding agents.
> Read this before touching any file. Follow these principles over any other heuristic.

---

## What This Is

A **Svelte 5 calendar component library** that serves as the scheduling UI module for a SaaS booking platform.

This is not a general-purpose calendar. It is the visual and interactive core of a booking system for wellness and fitness businesses — yoga studios, pilates, dance schools, crossfit, etc.

Primary consumer: **szkolyjogi.pl** (`apps/yoga`) — a yoga school directory for Poland, and the go-to-market vehicle for the booking SaaS.

**Current version:** 0.6.3  
**Stack:** Svelte 5, SvelteKit, TypeScript, Vite, pnpm, date-fns, date-fns-tz

---

## Why This Exists (Purpose)

Studios need to manage their schedule and let clients book classes. This library provides the calendar UI for three distinct surfaces in the product:

### Surface 1 — Studio Admin (editable)
The studio owner manages their schedule. Can create, move, and cancel classes. Sees attendance, capacity, waiting lists. This is the `readOnly={false}` mode.

### Surface 2 — Client Booking View (interactive, read-only data)
A client browsing a studio's schedule. Events show availability state (available / limited / full / cancelled). Clicking an event opens a booking flow. This is `readOnly={true}` with `oneventclick` wired to a booking modal.

### Surface 3 — Embeddable Widget (lightweight embed)
A `<day-calendar>` web component studios drop onto their own website. Connects to the platform API. Already partially exists in `widget/`. This is the "without leaving your site" feature.

---

## View Strategy

Two view families. **Agenda is the client-facing surface. Planner is the admin surface.**

### Agenda (client-facing — primary)
List-based. Readable, scannable, works perfectly on mobile.
- `week-agenda` — rolling 7-day list ← **in production today**
- `day-agenda` — single day ← needed for booking detail / mobile booking

### Planner (admin-facing — secondary)
Time-grid. Gives studio owners a visual schedule to manage.
- `week-planner` — traditional week grid
- `day-planner` — single day grid with drag-to-create

**The toggle a user sees is Agenda ↔ Planner. This already works via the `view` prop.**

Mobile: Agenda already works. Planner on mobile is useful for studio owners checking their schedule from a phone.

---

## Adapter Strategy

| Adapter | Purpose | Keep? |
|---|---|---|
| `createMemoryAdapter` | In-memory, dated events | ✅ always |
| `createRecurringAdapter` | Weekly repeating schedules | ✅ core use case |
| `createRestAdapter` | Connects to platform API | ✅ needed for booking |
| `createCompositeAdapter` | Combine multiple sources | ⚠️ defer |

**Do not add adapters without a concrete use case.**

---

## What the Calendar Needs for Booking (The Real Gap)

The yoga app schema already has the data. The calendar doesn't expose it yet.

### 1. Event availability state (visual)
`TimelineEvent` needs a `status` field used in Agenda view:
- `available` — spots open (green indicator or default)
- `limited` — few spots left (amber indicator)
- `full` — no spots, show waitlist option (red/muted)
- `cancelled` — class cancelled (strikethrough, dimmed)

These should render as a small pill or dot on the agenda event row.

### 2. Capacity display
Agenda event rows should optionally show `X spots left` when `data.spotsLeft` is set.

### 3. Booking callback
`oneventclick` already exists. The host app (yoga) handles the modal. The calendar just needs to pass the full event including `data` payload.

### 4. Admin mode additions (future)
When `readOnly={false}`:
- Drag to create new class slots
- Click event to edit (title, capacity, instructor)
- Drag event to reschedule

---

## Architecture (Read Before Editing)

```
src/lib/
  adapters/       — data layer (memory, REST, recurring, composite)
  calendar/       — Calendar.svelte shell + view registry
  core/           — types, clock, time utils, i18n labels, palette
  engine/         — reactive state (ViewState, EventStore, DragState, Selection)
  primitives/     — shared UI atoms (EventBlock, TimeGutter, NowIndicator, etc.)
  theme/          — CSS token strings, auto-theme probe, presets
  views/          — view components (Planner, Agenda, Mobile*)
  widget/         — standalone web component (embeddable on studio websites)
  index.ts        — public API barrel
```

**Key rule:** Views receive state via Svelte context set by `Calendar.svelte`. Views never import directly from engine.

---

## What "Done" Looks Like

Shippable when:
- [ ] `week-agenda` and `day-agenda` work on desktop and mobile
- [ ] Events can display availability state (available / limited / full / cancelled)
- [ ] `createRecurringAdapter` and `createMemoryAdapter` correctly project events
- [ ] `pnpm check` passes clean
- [ ] No console errors in demo
- [ ] README matches actual exported API

Not blocking ship:
- Admin editing mode
- Composite adapter
- Widget polish

---

## Current Tasks

> Replace this section with specific tasks before each agent session.
> Max 3 items. Each must be a discrete, testable outcome.

---

## Constraints (Non-Negotiable)

- **Svelte 5 only.** No Svelte 4 syntax. No `$:`, no `on:` events.
- **No new runtime dependencies** without approval. `date-fns` and `date-fns-tz` only.
- **Public API is stable.** Nothing removed/renamed from `src/lib/index.ts` without a major version note.
- **CSS via `--dt-*` tokens only.** No hardcoded colors or fonts in `<style>`.
- **pnpm only.**
- **No breaking changes to `CalendarAdapter`** without updating all built-in adapters.

---

## Decision Boundaries

**Decides autonomously:**
- Implementation inside a view component
- CSS within the token system
- Tests and test data
- Internal refactors that don't touch public API
- Bug fixes with a clear correct behavior

**Must stop and leave a TODO comment:**
- Any change to `src/lib/index.ts` exports
- New props on `Calendar`
- Changes to adapter or engine interfaces
- Anything affecting the widget build
- Adding a new npm dependency
- Anything that would break the yoga app integration

---

## Dev Commands

```bash
pnpm install
pnpm dev              # demo at localhost:5173
pnpm check            # TypeScript (must pass before committing)
pnpm test             # vitest
pnpm run package      # build library → dist/
pnpm run build:widget # build embeddable widget
```

---

## Code Style

- Svelte 5 runes: `$state`, `$derived`, `$effect`, `$props`, snippets
- TypeScript strict — no `any` without a comment
- Named exports only (no default exports except Svelte components)
- `PascalCase.svelte`, `camelCase.ts`
- Scoped `<style>`, `--dt-*` tokens, no inline styles

---

## Stop Conditions

Stop and leave a clear comment if:
- You're about to edit `dist/` directly
- Correct behavior can't be determined from code + README
- A fix touches more than 3 files in ways that affect the public API
- Tests are failing and the cause isn't clear
