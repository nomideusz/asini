# Task: Implement In-Memory SchedulerAdapter

## Context

Read `AGENTS.md` fully before starting. This is **Build Order Step 4c**.

The reference implementation can be found in the booking-platform prototype at
`C:\cmder\apps\booking-platform\` — look for `collection.ts` or similar in-memory store patterns.
Also review the `SchedulerAdapter` interface already defined in
`packages/svelte-scheduler/src/lib/adapters/types.ts`.

## What to Build

Create `packages/svelte-scheduler/src/lib/adapters/memory.ts`.

This file exports a factory function:

```ts
export function createMemoryAdapter(seed?: {
  tours?: TourDefinition[];
  slots?: TourSlot[];
  bookings?: Booking[];
}): SchedulerAdapter
```

The returned adapter stores all data in-memory (plain arrays/Maps). It is the reference adapter used
for testing, demos, and the `pnpm dev` demo page in `packages/svelte-scheduler`.

### Method implementations

Implement every method defined in `SchedulerAdapter`:

**Tour CRUD**
- `getTours(filter?)` — return tours array, optionally filtered by `status`
- `getTourById(id)` — find by id, return undefined if not found
- `createTour(tour)` — assign a new random UUID, push to store, return it
- `updateTour(id, patch)` — merge patch into existing tour, return updated
- `deleteTour(id)` — remove tour and cascade-delete its slots and bookings

**Slot management**
- `getSlots(tourId, range)` — return slots for tourId where `startTime` falls within `range`
- `getSlotById(id)` — find by id
- `createSlot(slot)` — assign UUID, push, return
- `updateSlot(id, patch)` — merge patch, return updated
- `cancelSlot(id, cancelledBy)` — set `status: 'cancelled'`, return updated slot
  - When a slot is cancelled, all confirmed bookings for that slot must also be updated to `status: 'cancelled'`
  - Set `cancelledBy` on each affected booking

**Booking lifecycle**
- `getBookingsForSlot(slotId)` — return bookings matching slotId
- `getBookingsForTour(tourId, range?)` — return bookings matching tourId, optionally filtered by slot date range
- `getBookingById(id)` — find by id
- `getBookingByReference(reference)` — find by `bookingReference`
- `createBooking(booking)` — assign UUID, generate `bookingReference` (format: `BK-XXXXXXXX` uppercase alphanumeric), set `createdAt` to ISO now, push, return
  - Also increment `bookedSpots` on the referenced slot
  - If `bookedSpots >= availableSpots`, set slot `status: 'full'`
- `updateBookingStatus(id, status, metadata?)` — update status fields, merge metadata, return updated

### ID generation

Use `crypto.randomUUID()` — it is available in Node 18+ and all modern browsers. No external deps.

### Booking reference generation

Format: `BK-` followed by 8 uppercase alphanumeric characters (A-Z, 0-9).
Use `Math.random()` — uniqueness is sufficient for in-memory use.

## Exports

Update `packages/svelte-scheduler/src/lib/adapters/index.ts` to export `createMemoryAdapter`:
```ts
export { createMemoryAdapter } from './memory.js';
```

Then re-export from `src/lib/index.ts`:
```ts
export { createMemoryAdapter } from './adapters/index.js';
```

## Tests

Create `packages/svelte-scheduler/src/lib/adapters/memory.test.ts` using vitest.

Cover:
- Create and retrieve a tour
- Create a slot and retrieve it by tourId + date range
- Create a booking and verify `bookedSpots` increments on the slot
- Slot becomes `full` when `bookedSpots >= availableSpots`
- Cancelling a slot cascades to cancel all confirmed bookings on that slot
- Deleting a tour removes its slots and bookings
- `getBookingByReference` finds a booking by its reference string
- `updateBookingStatus` with `cancelledBy: 'guide'` sets metadata correctly

## Constraints

- No npm dependencies — use only `crypto.randomUUID()` from the Node/Web standard library
- No SvelteKit imports, no `$lib`, no DB
- `pnpm check` must pass in `packages/svelte-scheduler`
- `pnpm test` must pass (all new tests green)
- The adapter must work standalone — it is used in the `pnpm dev` demo without any external services
