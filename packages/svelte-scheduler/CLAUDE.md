# CLAUDE.md — Intent Spec for @nomideusz/svelte-scheduler

> This file encodes the intent of this project for autonomous coding agents.
> Read this before touching any file. Follow these principles over any other heuristic.
> Also read the root `AGENTS.md` — it takes precedence on cross-package decisions.

---

## What This Is

A **pure TypeScript + Svelte 5 booking and scheduling library** that encodes all business logic for a tour booking platform.

This is not a general-purpose booking engine. It is the exact logic extracted from a proven reference implementation (Zaur) and made reusable and testable. The target consumers are `apps/thebest` (tour booking SaaS) and `apps/yoga` (yoga school directory).

**Current version:** 0.1.0 (types only — logic extraction in progress)
**Stack:** TypeScript strict, Svelte 5, Vitest, pnpm

---

## What This Package Does

Everything related to the lifecycle of a booking:

1. **Pricing** — calculate prices for 4 pricing models (per_person, participant_categories, group_tiers, private_tour)
2. **Cancellation policies** — compute refunds based on how far in advance a cancellation happens
3. **Slot generation** — lazily expand ScheduleRules into bookable TourSlots for a date range
4. **Booking state machine** — create, confirm, cancel, complete bookings through defined transitions
5. **Capacity management** — track available spots, detect full/at-risk slots
6. **Calendar bridge** — convert TourSlots → TimelineEvents for rendering in `@nomideusz/svelte-calendar`
7. **Svelte components** — BookingFlow, CancelFlow, AvailabilityPicker, GroupManifest

---

## Architecture

```
src/lib/
  core/
    types.ts          — canonical domain types (source of truth — do not change without flagging)
    index.ts          — re-exports everything from core/
    policy.ts         — cancellation policy configs + refund calculation
    booking.ts        — booking state machine (createBooking, cancelBooking)
    capacity.ts       — capacity utilities (availableSpots, isFull, isAtRisk)
    pricing/
      currency.ts     — STRIPE_FEES table
      engine.ts       — calculatePrice() pure function
      index.ts        — re-exports
    events/
      recurrence.ts   — expandRule() — ScheduleRule → {startTime, endTime}[]
      generator.ts    — generateSlots() — lazy slot generation
      index.ts        — re-exports
  adapters/
    types.ts          — SchedulerAdapter interface
    memory.ts         — in-memory adapter (for tests + demo)
    index.ts          — re-exports
  bridge/
    toTimelineEvent.ts  — TourSlot → TimelineEvent
    toCalendarAdapter.ts — SchedulerAdapter → CalendarAdapter
    index.ts          — re-exports
  components/
    BookingFlow.svelte
    CancelFlow.svelte
    AvailabilityPicker.svelte
    GroupManifest.svelte
    index.ts          — re-exports
  index.ts            — public API barrel
```

---

## Key Invariants

**Never change `src/lib/core/types.ts` without flagging.**
These types are the contract between this package and all consumers (apps/thebest, apps/yoga).
Changing them is a breaking change to the public API.

**Guide cancellation = 100% refund. Always.**
`cancelledBy === 'guide'` bypasses all policy windows and returns the full amount.
This is proven correct in Zaur and must be preserved exactly.

**Slot generation is lazy.**
`generateSlots()` never writes to any store. Only cancelled instances are persisted.
Generated slots exist only in memory for the duration of a request/render.

**All core logic is pure.**
No SvelteKit imports, no `$lib`, no DB calls, no Stripe calls anywhere in `core/` or the memory adapter.

---

## Current Build Status

See `AGENTS.md` "Build Order" for the full sequence. Current state:

- [x] Step 3 — Scaffolded: types, adapter interface, index barrels
- [ ] Step 4a — `core/policy.ts` (extract cancellation policy from Zaur)
- [ ] Step 4b — `core/pricing/engine.ts` (extract pricing engine from Zaur)
- [ ] Step 4c — `adapters/memory.ts` (in-memory adapter)
- [ ] Step 4d — `core/events/recurrence.ts` + `generator.ts`
- [ ] Step 5 — `core/booking.ts` + `core/capacity.ts`
- [ ] Step 6 — Svelte components
- [ ] Step 7 — Calendar bridge

Agent task files for each step: `.github/agents/`

---

## Current Tasks

> Replace this section with specific tasks before each agent session.
> Max 3 items. Each must be a discrete, testable outcome.

---

## Constraints (Non-Negotiable)

- **TypeScript strict.** No `any` without a comment explaining why.
- **Svelte 5 only** in components. No `$:`, no `on:` events, no Svelte 4 syntax.
- **No new runtime dependencies** without approval. Currently: none (peers only).
- **Public API is stable.** Nothing removed/renamed from `src/lib/index.ts` without a major version note.
- **CSS via `--asini-*` tokens only** in components. No hardcoded colors, no Tailwind, no DaisyUI.
- **pnpm only.**
- **Core logic is pure.** No side effects outside of adapter method calls.

---

## Decision Boundaries

**Decides autonomously:**
- Implementation of pure logic functions
- Internal refactors that don't change the public API
- Test data and test structure
- CSS within the `--asini-*` token system

**Must stop and leave a TODO comment:**
- Any change to `src/lib/core/types.ts`
- Any change to the `SchedulerAdapter` interface
- New runtime npm dependencies
- Any change to `src/lib/index.ts` exports
- Anything that would affect `apps/yoga` or `apps/thebest`
- Business logic decisions not documented in `AGENTS.md`

---

## Dev Commands

```bash
pnpm install
pnpm dev              # demo at localhost:5173
pnpm check            # TypeScript (must pass before committing)
pnpm test             # vitest run --passWithNoTests
pnpm test:watch       # vitest
pnpm run package      # build library → dist/
```

---

## Code Style

- TypeScript strict — no `any` without a comment
- Named exports only (no default exports except Svelte components)
- `PascalCase.svelte`, `camelCase.ts`
- Svelte 5 runes: `$state`, `$derived`, `$effect`, `$props`, snippets
- Scoped `<style>` in Svelte components, `--asini-*` tokens only

---

## Stop Conditions

Stop and leave a clear comment if:
- You're about to modify `src/lib/core/types.ts`
- You're about to change the `SchedulerAdapter` interface
- A fix requires a new npm dependency
- Tests are failing and the cause isn't clear from the code
- You need to make a decision about business logic not documented in `AGENTS.md`
