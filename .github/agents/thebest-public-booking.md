# Task: apps/thebest — Public Booking Flow

## Context

Read `AGENTS.md` fully before starting. This builds on the scaffold + auth + styling + guide tour management.

Prerequisites:
- Styling (thebest-styling.md) merged — Tailwind + DaisyUI + app shell
- Guide tours (thebest-guide-tours.md) merged — guides can create tours
- Drizzle adapter at `src/lib/server/scheduler/drizzle-adapter.ts`

## What to Build

### 1. Public tour listing

Create `src/routes/tours/+page.server.ts` and `+page.svelte`:
- No auth required — this is the public-facing page
- Load all tours where `isPublic = true` and `status = 'active'`
- Display as card grid:
  - Tour name, location, duration, price summary
  - Guide name
  - Languages as badges
  - Categories as badges
  - "View Details" button
- Search/filter bar (optional, simple text filter on name/location)
- Empty state: "No tours available yet"

### 2. Public tour detail page

Create `src/routes/tours/[tourId]/+page.server.ts` and `+page.svelte`:
- Load tour by ID (must be public + active)
- Display:
  - Tour name, description, location, duration
  - Guide info (name)
  - Pricing summary (formatted from `PriceStructure`)
  - Languages, categories as badges
  - Cancellation policy summary (use `getPolicyDescription` from scheduler if available, or format manually)
- **AvailabilityPicker** from `@nomideusz/svelte-scheduler`:
  - Pass Drizzle adapter, tourId, date range (next 30 days)
  - Map `--asini-*` CSS tokens for proper rendering
  - On slot select → navigate to `/book/[slotId]`

### 3. Booking page

Update `src/routes/book/[slotId]/+page.server.ts` and `+page.svelte`:
- Load slot by ID (handle both persisted and virtual slots)
- For virtual slots: the slot must be materialized in the DB when the booking starts
- Use `BookingFlow` component from `@nomideusz/svelte-scheduler`
- Pass the Drizzle adapter
- Map `--asini-*` CSS tokens
- On booking complete:
  - Show confirmation with booking reference
  - `// TODO: send confirmation email via Resend`
  - `// TODO: process payment via Stripe`
  - For now: booking is created with `paymentStatus: 'pending'`

### 4. Booking confirmation page

Create `src/routes/book/confirmation/[bookingId]/+page.svelte`:
- Load booking by ID
- Display confirmation details:
  - Booking reference (prominent)
  - Tour name, date/time
  - Guest details
  - Price breakdown
  - Status
- "Back to Tours" link
- Print-friendly layout (optional)

### 5. Public cancellation page

Create `src/routes/book/cancel/[bookingId]/+page.svelte`:
- Use `CancelFlow` component from `@nomideusz/svelte-scheduler`
- Guest enters booking reference to look up their booking
- Show cancellation policy and refund estimate
- On cancel: update booking status
- `// TODO: process refund via Stripe`

## Styling Guidelines

- Tour cards: DaisyUI `card`, responsive grid (1 col mobile, 2 tablet, 3 desktop)
- Tour detail: two-column layout on desktop (info left, availability right)
- Booking page: centered, max-width container
- Use DaisyUI semantic colors + badges for status/categories
- Map `--asini-*` tokens wherever scheduler components are used

## Virtual Slot Handling

The `AvailabilityPicker` generates virtual slots from schedule rules. When a tourist selects one:
1. Navigate to `/book/[slotId]` with the virtual slot ID
2. `BookingFlow` materializes it via `adapter.createSlot()` using the `initialSlot` prop
3. From that point, the slot exists in the DB and all operations work normally

Pass the full slot object through SvelteKit's page state or URL params as needed.

## Constraints

- No real payment processing — create bookings with `paymentStatus: 'pending'`
- No real email — leave TODO stubs for Resend
- No auth required for booking (guests book without accounts)
- `pnpm check` must pass from repo root

## Validation

```bash
cd apps/thebest
pnpm check   # zero errors
pnpm build   # succeeds
```
