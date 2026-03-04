# Task: Implement Scheduler Core — Booking State Machine & Capacity

## Context

Read `AGENTS.md` fully before starting. This is **Build Order Step 5**.

Prerequisites — these tasks must be complete before starting this one:
- `extract-cancellation-policy.md` (policy.ts exists)
- `extract-pricing-engine.md` (pricing/engine.ts exists)
- `extract-memory-adapter.md` (memory.ts exists)
- `extract-recurrence.md` (events/generator.ts exists)

Reference the TourSlot state machine diagram in `AGENTS.md` and its side-effects table.

## What to Build

### `packages/svelte-scheduler/src/lib/core/booking.ts`

The booking state machine. All booking lifecycle transitions go through here.

```ts
export async function createBooking(
  adapter: SchedulerAdapter,
  slotId: string,
  guest: GuestProfile,
  participants: number,
  options?: {
    participantsByCategory?: Record<string, number>;
    selectedAddonIds?: string[];
    specialRequests?: string;
  }
): Promise<Booking>
```

Steps:
1. Load slot via `adapter.getSlotById(slotId)` — throw if not found
2. Load tour via `adapter.getTourById(slot.tourId)` — throw if not found
3. Validate: slot must be `open` to accept a booking — throw `BookingError('SLOT_NOT_OPEN')` if `slot.status` is anything other than `'open'` (i.e. `'full'`, `'cancelled'`, `'completed'`, `'at_risk'` all reject)
4. Validate: `participants > 0`, `participants <= (slot.availableSpots - slot.bookedSpots)` — throw if over capacity
5. Calculate price: call `calculatePrice(tour.pricing, participants, options)`
6. Call `adapter.createBooking(...)` with status `'confirmed'` and paymentStatus `'pending'`
7. Return the created booking

```ts
export async function cancelBooking(
  adapter: SchedulerAdapter,
  bookingId: string,
  cancelledBy: 'guest' | 'guide' | 'system',
  reason?: string
): Promise<{ booking: Booking; refundAmount: number }>
```

Steps:
1. Load booking via `adapter.getBookingById(bookingId)` — throw if not found
2. Load slot via `adapter.getSlotById(booking.slotId)` — throw if not found
3. Load tour via `adapter.getTourById(booking.tourId)` — throw if not found
4. Compute `refundAmount` via `calculateRefund(booking, slot, cancelledBy, tour.cancellationPolicy)`
5. Call `adapter.updateBookingStatus(bookingId, 'cancelled', { cancelledBy, cancellationReason: reason })`
6. If slot was `full`, check remaining confirmed bookings — if `bookedSpots < availableSpots`, update slot to `open`
7. Return `{ booking: updatedBooking, refundAmount }`

```ts
export class BookingError extends Error {
  constructor(
    message: string,
    public readonly code: 'SLOT_NOT_FOUND' | 'TOUR_NOT_FOUND' | 'SLOT_NOT_OPEN' | 'OVER_CAPACITY' | 'INVALID_PARTICIPANTS'
  ) {
    super(message);
    this.name = 'BookingError';
  }
}
```

### `packages/svelte-scheduler/src/lib/core/capacity.ts`

Capacity utilities.

```ts
/** Returns how many spots are still available on a slot. */
export function availableSpots(slot: TourSlot): number

/** Returns true if the slot has reached its capacity. */
export function isFull(slot: TourSlot): boolean

/** Returns true if a slot is at risk of cancellation (below minimum capacity as cutoff approaches). */
export function isAtRisk(slot: TourSlot, tour: TourDefinition, now?: Date): boolean
```

`isAtRisk` logic: return true if `slot.status === 'open'` AND `slot.bookedSpots < tour.minCapacity` AND less than 24 hours until `slot.startTime` (use `now` parameter, defaulting to `new Date()`).

```ts
/** 
 * Checks whether adding `count` participants would exceed slot capacity.
 * Returns null if ok, or an error string if not.
 */
export function checkCapacity(slot: TourSlot, count: number): string | null
```

### `packages/svelte-scheduler/src/lib/core/index.ts`

Re-export all new exports:
```ts
export { createBooking, cancelBooking, BookingError } from './booking.js';
export { availableSpots, isFull, isAtRisk, checkCapacity } from './capacity.js';
```

Then re-export from `src/lib/index.ts`.

## Tests

Create `packages/svelte-scheduler/src/lib/core/booking.test.ts`:
- Successfully create a booking on an open slot
- Throw `BookingError('SLOT_NOT_OPEN')` when slot is cancelled
- Throw `BookingError('OVER_CAPACITY')` when requesting more spots than available
- After cancellation, slot transitions from `full` back to `open`
- Guide cancellation results in 100% refund
- Guest cancellation far in advance results in full refund per policy
- Guest cancellation at last minute results in zero refund per policy

Create `packages/svelte-scheduler/src/lib/core/capacity.test.ts`:
- `availableSpots` returns correct remaining count
- `isFull` returns true when `bookedSpots >= availableSpots`
- `isAtRisk` returns true when below minCapacity within 24h
- `isAtRisk` returns false when above minCapacity
- `checkCapacity` returns null when within limits
- `checkCapacity` returns error string when over capacity

All tests use `createMemoryAdapter` from the memory adapter.

## Constraints

- No SvelteKit imports, no `$lib`, no DB, no Stripe calls
- No new npm dependencies
- `pnpm check` must pass in `packages/svelte-scheduler`
- `pnpm test` must pass
- `createBooking` and `cancelBooking` are async (they use the adapter interface)
- State machine transitions must match `AGENTS.md` exactly
