# Task: Implement Svelte Booking Components

## Context

Read `AGENTS.md` fully before starting. This is **Build Order Step 6**.

Also read `packages/svelte-scheduler/CLAUDE.md` if it exists. Review the existing types in
`packages/svelte-scheduler/src/lib/core/types.ts` and the adapter interface.

Prerequisites — these tasks must be complete before starting this one:
- `scheduler-core.md` (booking.ts, capacity.ts exist)
- `extract-pricing-engine.md` (calculatePrice exists)
- `extract-memory-adapter.md` (createMemoryAdapter exists)

**Stack:** Svelte 5 runes mode only. No Svelte 4 syntax. No `$:`, no `on:` events. No Tailwind. CSS via `--asini-*` tokens only.

## What to Build

### `packages/svelte-scheduler/src/lib/components/BookingFlow.svelte`

A multi-step booking UI component.

Props:
```ts
interface Props {
  adapter: SchedulerAdapter;
  slotId: string;
  onbooked?: (booking: Booking) => void;
  oncancelled?: () => void;
}
```

Steps:
1. **Slot summary** — show tour name, date/time, available spots. Load via `adapter.getSlotById` + `adapter.getTourById`.
2. **Guest details** — name (required), email (required), phone (optional).
3. **Participants** — number input (1 to available spots). If tour uses `participant_categories`, show a count per category.
4. **Price summary** — show `PriceBreakdown` from `calculatePrice`. Display `totalAmount` prominently.
5. **Confirm** — button to submit. Calls `createBooking(adapter, slotId, guest, participants, options)`.
6. **Confirmation** — show booking reference, total paid, what to expect next.

State management: use `$state` for current step, guest data, participant counts, price breakdown, and loading/error state.

Error handling: display inline errors for validation failures (`BookingError`) and network errors. Never swallow errors silently.

### `packages/svelte-scheduler/src/lib/components/CancelFlow.svelte`

A cancellation confirmation UI.

Props:
```ts
interface Props {
  adapter: SchedulerAdapter;
  bookingId: string;
  cancelledBy?: 'guest' | 'guide';
  oncancelled?: (result: { booking: Booking; refundAmount: number }) => void;
  onaborted?: () => void;
}
```

Steps:
1. **Load booking** — show booking reference, tour name, date, total paid.
2. **Refund preview** — compute and show refund amount using `calculateRefund`.
3. **Confirm cancellation** — button calls `cancelBooking(adapter, bookingId, cancelledBy ?? 'guest')`.
4. **Result** — show confirmation message with refund amount.

### `packages/svelte-scheduler/src/lib/components/AvailabilityPicker.svelte`

A date picker that shows available slots.

Props:
```ts
interface Props {
  adapter: SchedulerAdapter;
  tourId: string;
  range: DateRange;
  onselect?: (slot: TourSlot) => void;
}
```

Displays a list of available (non-cancelled, non-full) slots within `range` for `tourId`.
Uses `generateSlots(tour, existingSlots, range)` from the recurrence module.
Each slot row shows: date, time, available spots, status badge.
Clicking a row calls `onselect(slot)`.

### `packages/svelte-scheduler/src/lib/components/GroupManifest.svelte`

A read-only display of all bookings for a slot (admin/guide view).

Props:
```ts
interface Props {
  adapter: SchedulerAdapter;
  slotId: string;
}
```

Loads bookings via `adapter.getBookingsForSlot(slotId)`.
Displays a table: guest name, email, participants, booking reference, status.
Shows totals: total participants, total revenue.

### Component index

Create `packages/svelte-scheduler/src/lib/components/index.ts`:
```ts
export { default as BookingFlow } from './BookingFlow.svelte';
export { default as CancelFlow } from './CancelFlow.svelte';
export { default as AvailabilityPicker } from './AvailabilityPicker.svelte';
export { default as GroupManifest } from './GroupManifest.svelte';
```

## Exports

Update `src/lib/index.ts` to re-export the components:
```ts
export { BookingFlow, CancelFlow, AvailabilityPicker, GroupManifest } from './components/index.js';
```

## Demo page

Update `packages/svelte-scheduler/src/routes/+page.svelte` to render a working end-to-end demo using `createMemoryAdapter` with seed data (at least 2 tours, 3 slots, 1 pre-existing booking). The demo must show `BookingFlow`, `CancelFlow`, and `AvailabilityPicker` working together.

## CSS

All styles must use `--asini-*` CSS custom properties. Never hardcode colors, fonts, or breakpoints. No Tailwind. No DaisyUI.

## Constraints

- Svelte 5 runes only: `$state`, `$derived`, `$props`, `$effect`, snippets
- No `on:` events — use `oneventname` prop callbacks (e.g. `onbooked`, `oncancelled`, `onselect` — all lowercase, no `on:` prefix, no capitalization after `on`)
- No Tailwind or any CSS framework inside the package
- No new npm dependencies
- `pnpm check` must pass in `packages/svelte-scheduler`
- Components are exported from the package — they are part of the public API
