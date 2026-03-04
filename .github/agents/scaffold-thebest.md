# Task: Scaffold apps/thebest — New Platform

## Context

Read `AGENTS.md` fully before starting. This is **Build Order Step 8**.

Also read:
- `AGENTS.md` section "apps/thebest — The New Platform" in full
- `AGENTS.md` section "Refund Architecture"
- Zaur's schema at `C:\cmder\apps\tours\src\lib\db\schema\drizzle.ts` — for entity shapes only

Prerequisites — these must be complete:
- `calendar-bridge.md` (bridge complete, packages publishable)
- `@nomideusz/svelte-scheduler` and `@nomideusz/svelte-calendar` packages must pass `pnpm check`

**This is the new platform. Start clean. Nothing from Zaur UI/routes is copied.**

## What to Build

### 1. Scaffold the SvelteKit app

Create `apps/thebest/` as a new SvelteKit 5 application.

Stack:
- SvelteKit 2 + Svelte 5 (runes mode)
- TypeScript strict
- `@sveltejs/adapter-node` (not adapter-auto — we know the target)
- PostgreSQL + Drizzle ORM
- `pnpm` only

```bash
# From repo root:
cd apps
pnpm create svelte@latest thebest
# Choose: SvelteKit, TypeScript, no ESLint/Prettier/Playwright/Vitest (add manually)
cd thebest
pnpm install
```

Then add:
```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit @types/pg
pnpm add lucia oslo @lucia-auth/adapter-drizzle
pnpm add stripe
pnpm add @resend/node
pnpm add @nomideusz/svelte-scheduler@workspace:* @nomideusz/svelte-calendar@workspace:*
```

### 2. Add `thebest` to the workspace

Update `pnpm-workspace.yaml` to include `apps/thebest`.

### 3. Database schema

Create `apps/thebest/src/lib/server/db/schema.ts` using Drizzle ORM + PostgreSQL dialect.

Use Zaur's `drizzle.ts` as a shape reference only. Start fresh — no migration debt.

Required tables (clean, no legacy columns):

**`guides`** — the platform operator accounts
- `id` (uuid, primary key)
- `email` (text, unique, not null)
- `name` (text)
- `stripeAccountId` (text) — Stripe Connect account ID
- `stripeOnboardingComplete` (boolean, default false)
- `createdAt` (timestamp)

**`tours`** — tour definitions
- `id` (uuid, primary key)
- `guideId` (uuid, FK → guides)
- `name`, `description` (text)
- `duration` (integer, minutes)
- `capacity`, `minCapacity`, `maxCapacity` (integer)
- `languages` (text array)
- `location` (text)
- `categories` (text array)
- `pricingJson` (jsonb) — serialized `PriceStructure`
- `cancellationPolicyJson` (jsonb) — serialized `CancellationPolicy`
- `scheduleRulesJson` (jsonb) — serialized `ScheduleRule[]`
- `status` (text: 'active' | 'draft')
- `isPublic` (boolean, default false)
- `createdAt`, `updatedAt` (timestamp)

**`slots`** — persisted slot exceptions (cancelled slots only + manual slots)
- `id` (uuid, primary key)
- `tourId` (uuid, FK → tours)
- `scheduleRuleId` (text, nullable) — which rule generated this
- `startTime`, `endTime` (timestamp with timezone)
- `availableSpots` (integer)
- `bookedSpots` (integer, default 0)
- `status` (text: SlotStatus values)
- `notes` (text)
- `isGenerated` (boolean)
- `createdAt` (timestamp)

**`bookings`** — confirmed bookings
- `id` (uuid, primary key)
- `tourId` (uuid, FK → tours)
- `slotId` (uuid, FK → slots, nullable — generated slots don't have a DB row)
- `guestName`, `guestEmail`, `guestPhone` (text)
- `guestLanguage` (text)
- `participants` (integer)
- `participantsByCategoryJson` (jsonb, nullable)
- `selectedAddonIdsJson` (jsonb, nullable)
- `priceBreakdownJson` (jsonb)
- `totalAmount` (integer, cents) — store as integer cents, not float
- `currency` (text)
- `status` (text: BookingStatus values)
- `paymentStatus` (text: PaymentStatus values)
- `paymentIntentId` (text, nullable) — Stripe PaymentIntent ID
- `bookingReference` (text, unique)
- `attendanceStatus` (text)
- `specialRequests` (text, nullable)
- `cancelledBy` (text, nullable)
- `cancellationReason` (text, nullable)
- `createdAt` (timestamp)

Do **not** add `refundStatusNew` or any dual-column migration artifacts. This schema is clean.

### 4. Drizzle adapter

Create `apps/thebest/src/lib/server/scheduler/drizzle-adapter.ts`.

Implement `SchedulerAdapter` backed by the Drizzle schema above. This is the production adapter.

Key implementation notes:
- `getSlots` returns only rows from the `slots` table — generated slots come from `generateSlots()` in the calling code
- `createBooking` must also write to the `slots` table if the slot doesn't exist yet (for generated slots that receive their first booking)
- Monetary values in DB are integer cents; convert to/from float in the adapter boundary
- JSON columns (pricing, cancellation policy, etc.) are deserialized on read, serialized on write

### 5. Initial route structure

Create these routes with minimal placeholder content (no UI polish needed at this stage):

- `src/routes/+layout.svelte` — shell with nav placeholder
- `src/routes/+page.svelte` — homepage placeholder ("thebest.travel coming soon")
- `src/routes/guide/+layout.svelte` — authenticated guide area shell
- `src/routes/guide/tours/+page.svelte` — guide's tour list (uses adapter to load tours)
- `src/routes/guide/tours/[tourId]/+page.svelte` — tour detail with slot calendar
- `src/routes/book/[slotId]/+page.svelte` — public booking page using `BookingFlow` component

### 6. Validate

```bash
cd apps/thebest
pnpm check   # zero TypeScript errors
pnpm build   # succeeds
```

## Hard stops — leave a TODO comment and stop

- Any Stripe Connect live key integration → `// TODO: Stripe Connect onboarding`
- Any real email send → `// TODO: Resend email notification`
- Any auth implementation beyond the Lucia scaffolding → `// TODO: auth flow`
- thebest.travel domain configuration → not needed yet

## Constraints

- No Zaur UI components, no Zaur route structure, no Zaur naming
- No dual migration columns — schema is clean and fresh
- pnpm only — never use npm or yarn
- `apps/yoga` must not be affected in any way
- `pnpm check` from repo root must pass across all packages and apps
