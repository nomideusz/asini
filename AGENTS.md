# AGENTS.md — asini monorepo

> Root-level orchestration spec. Read this before any package-level CLAUDE.md.
> Answers: what exists, how it relates, what agents can do, what they must not.

---

## The Plan in One Paragraph

Zaur (`C:\cmder\apps\tours`) is a complete tour booking platform that proves
the business logic is correct. It is a reference — it never runs in production
again and never moves into this monorepo. Its logic is extracted into clean,
generic packages. A new platform (`thebest.travel`) is built on top of those
packages from day one — new look, new UX, no legacy debt. The packages work
without thebest.travel. thebest.travel is built entirely from the packages.

---

## Repository Identity

**Monorepo name:** asini (working name — not a brand, may change)
**npm scope:** @nomideusz (personal account — no org needed yet)
**GitHub:** @nomideusz (personal account)
**Domains:** thebest.travel (platform, future)

**Naming note:** "asini" is just the local monorepo folder name and internal
CSS token prefix (`--asini-*`). All published npm packages use `@nomideusz`.
If a dedicated org is created later, migration is just renaming `package.json`
names + publishing deprecation notices on old names. No code changes needed.
Do not block any work on org creation.

---

## Directory Structure

```
asini/
  package.json              root — workspace scripts, shared dev deps
  pnpm-workspace.yaml       declares packages/ and apps/
  .gitignore
  AGENTS.md                 ← this file

  packages/
    svelte-calendar/        @nomideusz/svelte-calendar — PUBLIC npm package
    svelte-scheduler/       @nomideusz/svelte-scheduler — PUBLIC npm package (core logic implemented)

  apps/
    thebest/                thebest.travel — SvelteKit, PRIVATE, new platform
    yoga/                   szkolyjogi.pl — SvelteKit, PRIVATE, real directory + sandbox

  tools/
    yoga-scraper/           Python — outside pnpm workspaces, just colocated
```

### Reference paths (read-only — never run, never import from)
```
C:\cmder\apps\tours\             ← Zaur — business logic reference only
C:\cmder\apps\booking-platform\  ← abandoned prototype — secondary reference
```

---

## Zaur — What It Is and How to Use It

Zaur is the reference implementation. It is complete and correct.
It contains proven business logic for every feature thebest.travel needs.

**How agents use Zaur:**
- Read it to understand how a feature should work
- Extract logic from it into packages (de-SvelteKit-ified, de-typed, pure)
- Never copy UI, routes, or platform-specific code
- Never reference it as a dependency
- Never run `pnpm dev` or `pnpm build` in it

**What Zaur proves is correct (mine these files):**

| Zaur file | Extract into | What it proves |
|---|---|---|
| `src/lib/utils/cancellation-policies.ts` | `packages/svelte-scheduler/src/core/policy.ts` | Policy configs, refund calculation, guide=full refund rule |
| `src/lib/utils/pricing-calculations.ts` | `packages/svelte-scheduler/src/core/pricing/engine.ts` | Full pricing engine — 4 models, group discounts, add-ons, Stripe fees |
| `src/lib/utils/refund-handler.ts` | Reference only for `apps/thebest` | Pre-transfer vs post-transfer refund paths |
| `src/lib/utils/qr-generation.ts` | `packages/svelte-qr/src/core/encode.ts` (future) | QR PNG/SVG/Buffer generation |
| `src/lib/db/schema/drizzle.ts` | Reference for `apps/thebest` DB schema | All entity shapes — tours, slots, bookings, payments, payouts |
| `src/lib/email/templates/` | Reference for `@nomideusz/svelte-notify` (future) | Email template structure, all notification types |
| `src/lib/utils/image-storage.ts` | `packages/svelte-media/` (future) | Image upload, sharp optimization, multi-size variants (thumbnail/medium/large) |
| `src/lib/utils/minio-client.ts` | `packages/svelte-media/` (future) | MinIO S3-compatible client init, bucket management |
| `src/lib/i18n.ts` + `messages/*.json` | `packages/svelte-i18n/` (future) | Language store, message loading, Paraglide runtime |

**What Zaur got wrong (do not replicate):**
- In-progress schema migration — `refundStatus`/`refundStatusNew` dual columns. thebest.travel starts clean.
- Naming: "Zaur", internal branding, all references disappear completely.
- Monolithic structure — logic tangled with SvelteKit routes. Packages fix this.
- No tests anywhere.
- `console.log` in production Stripe paths.

---

## Package Registry

### Currently in asini

| Path | Package name | Status | Role |
|---|---|---|---|
| `packages/svelte-calendar` | `@nomideusz/svelte-calendar` | ✅ published | Calendar rendering |
| `packages/svelte-scheduler` | `@nomideusz/svelte-scheduler` | ✅ core complete, components in progress | Booking/scheduling logic |
| `apps/thebest` | private | 🏗️ scaffolded (PR #20) | thebest.travel platform |
| `apps/yoga` | private | ✅ live at szkolyjogi.pl | Real directory + package sandbox |

### Future packages

| Package | Role | Logic already proven in |
|---|---|---|
| `@nomideusz/svelte-payments` | Stripe Connect UI, payout flows | Zaur `src/lib/stripe.server.ts` |
| `@nomideusz/svelte-qr` | QR generation + scanning | Zaur `src/lib/utils/qr-generation.ts` |
| `@nomideusz/svelte-notify` | Email/SMS templates | Zaur `src/lib/email/templates/` |
| `@nomideusz/svelte-media` | Image upload, optimization (sharp), multi-size storage (MinIO/S3) | Zaur `src/lib/utils/image-storage.ts`, `avatar-storage.ts`, `minio-client.ts` |
| `@nomideusz/svelte-i18n` | Multi-language support, message loading | Zaur `src/lib/i18n.ts`, `messages/{en,pl,de}.json`, Paraglide runtime |
| `@nomideusz/channel-manager` | Viator/GYG availability sync | Not yet — requires certification |

---

## Dependency Rules

**Dependencies only flow downward. No exceptions.**

```
apps/thebest   (private — thebest.travel)
apps/yoga      (private — szkolyjogi.pl)
    ↓ both depend on
packages/svelte-scheduler
    ↓ peer dependency
packages/svelte-calendar
    ↓
nothing

Future (same rule — downward only):
apps/* → svelte-payments, svelte-media, svelte-i18n, svelte-qr, svelte-notify
svelte-payments, svelte-media, etc. → nothing (or svelte-calendar/scheduler as peers)
```

**Hard violations — never:**
- Any package importing from `apps/`
- Any package importing from Zaur (`C:\cmder\apps\tours\`)
- Any package containing Stripe keys, DB credentials, or platform secrets
- Redefining `TimelineEvent`, `CalendarAdapter`, or `DateRange` in scheduler
- Adding `@booking-platform/*` or any Zaur path to any package.json
- Publishing under any scope other than `@nomideusz` without explicit approval

---

## apps/thebest — The New Platform

Built from scratch. Uses packages from day one.
No Zaur code copied in. No Zaur naming anywhere.

**Stack (same as Zaur — proven choices):**
- SvelteKit 5 + Svelte 5
- Tailwind CSS 4 + DaisyUI 5 (app-level styling — never in packages)
- PostgreSQL + Drizzle ORM (clean schema — no migration debt)
- Lucia v3 + OAuth2
- Stripe Connect
- Resend (email)
- MinIO / S3

**What it does NOT inherit from Zaur:**
- Any UI components
- Any route structure
- Any Zaur-specific naming
- The half-migrated schema columns
- The monolithic util files

**What it inherits via packages:**
- All booking logic (via `@nomideusz/svelte-scheduler`)
- All calendar rendering (via `@nomideusz/svelte-calendar`)
- All pricing calculation (via scheduler's pricing module)
- All cancellation policy logic (via scheduler's policy module)

**The DB schema for thebest starts clean.**
Use Zaur's `drizzle.ts` as the design reference for entity shapes,
but write fresh migrations. No legacy columns.

---

## apps/yoga — Real Directory + Sandbox

szkolyjogi.pl is a real yoga school directory in Poland.
It is also the primary integration test environment for packages.

**Real directory role:** polish yoga schools, public listings, class schedules.
Worth maintaining as a real product — has real users.

**Sandbox role:** first app to integrate each new package version.
If it works in yoga, it's ready for thebest.

**Do not** optimize yoga for growth, monetization, or add auth.
**Do** use it to validate: autoColor, isFree tags, calendar bridge, scheduler bridge.

---

## Canonical Domain Types

Defined in `packages/svelte-scheduler/src/core/types.ts`.
Changing these is a breaking change. Agents stop and flag before modifying.

```
TourDefinition      what a tour IS — maps from Zaur's tours table shape
ScheduleRule        when it runs — pattern: once | weekly | custom
TourSlot            a specific occurrence — maps from Zaur's timeSlots table
Booking             a tourist's purchase — maps from Zaur's bookings table
GuestProfile        name, email, phone, language — no auth required
PriceStructure      pricing rules — maps from Zaur's pricingModel + related JSON fields
PriceBreakdown      calculated result — maps from Zaur's BookingPriceResult
CancellationPolicy  refund rules — maps from Zaur's CancellationPolicyConfig
GuideAvailability   blocked times, buffer minutes, max tours per day
```

### Inherited from svelte-calendar — never redefine

```
TimelineEvent       what the calendar renders
CalendarAdapter     interface the calendar fetches from
DateRange           { start: Date, end: Date }
```

---

## TourSlot State Machine

Every agent touching booking or cancellation logic must know this.

```
        OPEN ──── capacity reached ────────────────→ FULL
          │                                           │
          │                                    booking cancelled
          │                                           │
          ├──── cutoff passed, ←─────────────────────┘
          │     min not met ──→ AT_RISK
          │                       │              booking added,
          │              cutoff + still          min now met
          │              under minimum                │
          │                   ↓                       │
          │               CANCELLED ←─────────────────┘
          │                   ↑
          ├── guide cancels ──┘
          │
          └──── tour date passed + guide confirms ──→ COMPLETED
```

### Side effects per transition

| Transition | Required side effects |
|---|---|
| → FULL | emit `slot:full`, block new bookings |
| FULL → OPEN | emit `slot:available` |
| → AT_RISK | emit `slot:at-risk`, notify guide + all guests |
| → CANCELLED (auto) | emit `slot:cancelled`, full refund all, notify in guest language |
| → CANCELLED (guide) | same — always 100% refund, no time window |
| → COMPLETED | emit `slot:completed`, trigger payout (platform handles) |

**Non-negotiable (already correct in Zaur — preserve exactly):**
Guide cancellation = full refund. Always. `cancelledBy === 'guide'` bypasses
the policy window entirely. No exceptions. Preserve this when extracting policy.ts.

---

## Pricing Engine

Full implementation exists in Zaur's `pricing-calculations.ts`.
When extracted into `packages/svelte-scheduler/src/core/pricing/engine.ts`:

1. Replace `Tour` parameter with generic `PriceStructure`
2. Remove all `$lib/` imports
3. Remove SvelteKit-specific types
4. Must be a pure function — no DB, no Stripe, no side effects

### The 4 pricing models (from Zaur — all must work)
- `per_person` — base price × participants
- `participant_categories` — per-category prices (adult/child/senior/etc.) with group discounts
- `group_tiers` — flat price per group size bracket
- `private_tour` — flat rate regardless of participant count

### Discount application order
1. Base price per model above
2. Participant type modifiers
3. Group discount tiers (percentage or fixed)
4. Add-ons (flat per booking)
5. Stripe fee (pass-through or guide absorbs)
6. Platform fee ← **not in Zaur** — add as step 6 in thebest

### STRIPE_FEES table
Migrate verbatim from Zaur's `pricing-calculations.ts`.
Includes PLN and Scandinavian currencies. Do not shrink it.

---

## Refund Architecture

Proven in Zaur's `refund-handler.ts`. Two paths:

```
Before transfer (most common — guide gets paid after tour):
  → refund directly from platform Stripe account

After transfer (rare — guide paid early, then cancellation):
  → reverse transfer (funds return to platform)
  → then refund customer
```

thebest.travel implements this same two-path logic.
Use Zaur's `refund-handler.ts` as the exact reference when building it.

---

## Extraction Rules

When moving logic from Zaur into packages:

1. **Read the Zaur file fully first**
2. **Identify the pure logic** — separate from SvelteKit, DB, and Stripe dependencies
3. **Write the package version** from scratch using Zaur as spec, not copy-paste
4. **Adapt types** to canonical asini types
5. **Remove all** `$lib/`, `$env/`, SvelteKit server imports
6. **Add unit tests** — Zaur has none; packages must have them
7. **Verify purity** — function takes inputs, returns outputs, no side effects

The goal: if you delete Zaur tomorrow, the packages still work perfectly.

---

## tools/yoga-scraper

Python. Not in pnpm workspaces. Run independently.

```
tools/yoga-scraper/
  scraper.py      fetches from Fitssey
  requirements.txt
  output/         gitignored
```

- Run: `cd tools/yoga-scraper && python scraper.py`
- Agents on pnpm packages: ignore this directory entirely

---

## CSS Token Contract

All packages use only `--asini-*` CSS custom properties internally.
Never hardcode colors or fonts. Never use Tailwind or DaisyUI inside packages.

**Apps** use Tailwind CSS 4 + DaisyUI 5 for styling:
- `apps/thebest` — Tailwind CSS 4 (`@tailwindcss/vite` plugin) + DaisyUI 5 (`@plugin "daisyui"` in CSS)
- `apps/yoga` — Tailwind CSS 4 + DaisyUI 5 (same setup)
- Apps map `--asini-*` tokens to DaisyUI semantic colors so packages render correctly

```css
--asini-bg              --asini-surface         --asini-surface-raised
--asini-border          --asini-border-strong
--asini-text            --asini-text-2          --asini-text-3
--asini-accent          --asini-accent-muted
--asini-success         --asini-warning         --asini-danger         --asini-info
--asini-font-sans       --asini-font-mono
--asini-radius          --asini-radius-sm
```

---

## Build Order

```
Step 1 — Verify publishing ✅ DONE
  Tasks:   Verify @nomideusz npm scope works for all packages
           Register thebest.travel domain (when ready for platform)
  Gate:    npm publish @nomideusz/svelte-calendar succeeds
  Note:    Org migration (if ever) is a future rename, not a blocker

Step 2 — Fix svelte-calendar in yoga ✅ DONE
  Tasks:   autoColor fix (category grouping, not hardcoded palette)
           isFree → "Bezpłatne" tag
  Gate:    pnpm check passes in yoga app

Step 3 — Scaffold svelte-scheduler ✅ DONE
  Tasks:   package.json (name: @nomideusz/svelte-scheduler, peer: @nomideusz/svelte-calendar)
           tsconfig.json strict
           vitest
           src/core/types.ts (stubs only)
           src/adapters/types.ts (SchedulerAdapter interface)
  Gate:    pnpm check passes on stubs
  Result:  13 files created, 0 errors across all packages
           Types: TourDefinition, ScheduleRule, TourSlot, Booking, GuestProfile,
           PriceStructure, PriceBreakdown, CancellationPolicy, GuideAvailability
           + SchedulerAdapter interface (tour CRUD, slot mgmt, booking lifecycle)
           + re-exports TimelineEvent, CalendarAdapter, DateRange from calendar

Step 4 — Extract logic from Zaur into scheduler ✅ DONE
  Tasks:   cancellation-policies.ts → core/policy.ts
           pricing-calculations.ts → core/pricing/engine.ts
           STRIPE_FEES → core/pricing/currency.ts
           (+ booking-platform) collection.ts → adapters/memory.ts
           (+ booking-platform) recurrence.ts → core/events/recurrence.ts
  Gate:    pnpm check passes, all extracted logic has unit tests
  Result:  4 PRs merged (#12 policy, #13 pricing, #14 memory adapter, #15 recurrence)
           All modules have full unit test coverage
           Exports wired through core/index.ts and lib/index.ts

Step 5 — Implement scheduler core ✅ DONE
  Tasks:   core/booking.ts — state machine
           core/capacity.ts — spots, conflict detection
           core/events/generator.ts — lazy slot generation
  Gate:    100% state machine transitions tested
  Result:  PR #16 merged. Full booking state machine with capacity tracking.

Step 6 — Svelte components ✅ DONE
  Tasks:   BookingFlow.svelte, CancelFlow.svelte
           GroupManifest.svelte, AvailabilityPicker.svelte
           useScheduler.svelte.ts
  Gate:    Full booking flow end-to-end, memory adapter only
  Result:  PR #17 merged. All scheduler Svelte components implemented.

Step 7 — Calendar bridge ✅ DONE
  Tasks:   toCalendarAdapter.ts, toTimelineEvent.ts
  Gate:    yoga shows scheduler-driven schedule via svelte-calendar
           Full, at-risk, cancelled states render correctly
  Result:  PR #18 merged. Calendar bridge integration complete.

Step 8 — Build apps/thebest
  8a — Scaffold (PR #20, pending merge)
    Tasks:   SvelteKit app, Drizzle schema, drizzle-adapter, route stubs
    Gate:    pnpm check + pnpm build pass
  8b — App shell + styling (Issue #21)
    Tasks:   Tailwind CSS 4 + DaisyUI 5 setup, navbar, footer, homepage
             --asini-* token mapping to DaisyUI theme
    Gate:    Responsive app shell renders, theme switching works
  8c — Authentication (Issue #22, parallel with 8b)
    Tasks:   Lucia v3, email/password signup + login, session hooks
             Protected guide routes
    Gate:    Guide can register, log in, access /guide area
  8d — Guide tour management (Issue #23, requires 8b + 8c)
    Tasks:   Tour CRUD, pricing model forms (all 4 models)
             Schedule builder, cancellation policy selection
    Gate:    Guide creates a tour with pricing and schedule
  8e — Public booking flow (Issue #24, requires 8d)
    Tasks:   Public tour listing, tour detail, BookingFlow integration
             Confirmation page, cancellation page
    Gate:    Tourist completes booking end-to-end

Step 9 — First pilot guides on thebest.travel
  Gate:    5 real guides live, real bookings processing
```

---

## Agent Boundaries

### Autonomous
- Implementing within one package without cross-package type changes
- UI, styling, component internals
- Writing tests
- Extracting logic from Zaur per extraction rules above
- Bug fixes not affecting public API

### Cross-package coordination — stop and flag
- Changes to `TimelineEvent`, `CalendarAdapter`, `DateRange`
- Changes to canonical types in `svelte-scheduler/src/core/types.ts`
- Changes to `SchedulerAdapter` interface
- New fields on `Booking`, `TourSlot`, `TourDefinition`
- Calendar bridge changes
- Adding a new package

### Human decision required — stop, leave TODO
- Platform fee model and payout timing for thebest.travel
- Viator/GYG certification and integration
- thebest.travel DB schema decisions (fresh, no Zaur migration)
- Guide capacity enforcement (hard block vs soft warning)
- Promo code stacking rules
- Multi-day tour partial cancellation

---

## Validation Gates

### packages/svelte-calendar
```bash
pnpm check     # zero errors
pnpm test      # 100% pass
pnpm package   # dist/index.js + dist/widget.js produced
```

### packages/svelte-scheduler
```bash
pnpm check       # zero errors, strict mode
pnpm test        # all state machine transitions covered
pnpm test:bridge # calendar bridge integration tests
pnpm package     # memory adapter alone runs complete booking flow
```

### apps/thebest
```bash
pnpm check   # zero errors
pnpm build   # succeeds
             # no pending Drizzle migrations
```

### apps/yoga
```bash
pnpm check   # zero errors
pnpm build   # succeeds
```

---

## Frequently Wrong Things

**1. Zaur naming anywhere in asini**
No "Zaur" in code, comments, variable names, routes, or error messages.
It is a reference. It does not exist in this repo.

**2. Copying Zaur UI or routes**
Extract logic only. UI and routes are rebuilt from scratch with new design.
Copy-pasting Svelte components from Zaur defeats the purpose.

**3. Guide cancellation = full refund**
Proven correct in Zaur. Preserve exactly when extracting.
`cancelledBy === 'guide'` → 100%, always, no time window.

**4. Pricing engine purity**
When migrating from Zaur: strip `Tour` type, strip `$lib` imports.
Pure function only. Inputs in, `PriceBreakdown` out.

**5. thebest.travel schema is fresh**
Do not copy Zaur's migration state (dual refundStatus columns, legacy fields).
Start from clean migrations. Use Zaur's schema as shape reference only.

**6. Slot generation is lazy**
Generate from ScheduleRule on demand. Do not pre-store all slots.
Only cancelled instances are persisted.

**7. CSS frameworks in packages**
`--asini-*` variables only inside packages. Tailwind CSS 4 + DaisyUI 5 in apps only.
DaisyUI semantic colors (`primary`, `base-100`, etc.) for theming — avoid raw Tailwind colors (`red-500`).

**8. autoColor — set category, never color**
Always `category` on calendar events. Never direct `color`.

---

## Stop Comment Format

```ts
// AGENT STOP: [one-line reason]
// Trying to: [what you were implementing]
// Blocked by: [specific decision or dependency needed]
// Options: [2-3 paths forward, optional]
```

Always stop when:
- Canonical type change affects other packages
- New npm dependency not already in package.json
- DB schema decision for thebest.travel
- Real Stripe operation or real email needed
- Dependency direction would be violated
- Test failing with unclear cause
- Business decision not documented here