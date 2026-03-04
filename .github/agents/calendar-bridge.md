# Task: Implement Calendar Bridge

## Context

Read `AGENTS.md` fully before starting. This is **Build Order Step 7**.

Also read:
- `packages/svelte-calendar/CLAUDE.md`
- `packages/svelte-calendar/src/lib/index.ts` — the public calendar API
- `apps/yoga/src/routes/listing/[id]/+page.svelte` — how the yoga app currently wires the calendar

Prerequisites — these tasks must be complete before starting this one:
- `extract-recurrence.md` (generateSlots exists)
- `scheduler-core.md` (TourSlot state machine complete)

The calendar bridge is what connects the scheduler domain (`TourSlot`, `TourDefinition`) to the calendar rendering layer (`TimelineEvent`, `CalendarAdapter`). Without this bridge, the calendar has no way to show scheduler-driven schedules.

## What to Build

### `packages/svelte-scheduler/src/lib/bridge/toTimelineEvent.ts`

```ts
export function toTimelineEvent(slot: TourSlot, tour: TourDefinition): TimelineEvent
```

Maps a `TourSlot` to a `TimelineEvent` for rendering in `@nomideusz/svelte-calendar`.

Mapping rules:
- `id` → `slot.id`
- `title` → `tour.name`
- `start` → `slot.startTime`
- `end` → `slot.endTime`
- `category` → `tour.categories[0] ?? tour.name` (never use `color` directly — set `category`)
- `status` → map `SlotStatus` to calendar status string:
  - `open` with `availableSpots - bookedSpots <= 3` → `'limited'`
  - `open` (plenty of spots) → `'available'`
  - `full` → `'full'`
  - `cancelled` → `'cancelled'`
  - `completed` → `'available'` (historical, still renderable)
  - `at_risk` → `'limited'` (treat as limited visibility)

  Check the `TimelineEvent` type in `@nomideusz/svelte-calendar` before writing the mapping:
  - **If `TimelineEvent` already has a `status` field**: set it directly on the returned `TimelineEvent`.
  - **If `TimelineEvent` does not yet have a `status` field**: include the mapped status value in `data.status`, and leave a `// TODO: add status to TimelineEvent in @nomideusz/svelte-calendar` comment at the mapping site.
- `data` → always include `{ slotId: slot.id, tourId: tour.id, bookedSpots: slot.bookedSpots, availableSpots: slot.availableSpots, spotsLeft: slot.availableSpots - slot.bookedSpots }`

### `packages/svelte-scheduler/src/lib/bridge/toCalendarAdapter.ts`

```ts
export function toCalendarAdapter(
  adapter: SchedulerAdapter,
  tourId: string
): CalendarAdapter
```

Returns a `CalendarAdapter` (the interface from `@nomideusz/svelte-calendar`) that fetches slots via the scheduler adapter and converts them to `TimelineEvent[]`.

The returned adapter's `getEvents(range: DateRange)` method:
1. Calls `adapter.getTourById(tourId)` to load the tour
2. Calls `adapter.getSlots(tourId, range)` to get persisted/existing slots
3. Calls `generateSlots(tour, existingSlots, range)` to fill in generated slots
4. Maps each slot to a `TimelineEvent` via `toTimelineEvent(slot, tour)`
5. Returns the array

### `packages/svelte-scheduler/src/lib/bridge/index.ts`

```ts
export { toTimelineEvent } from './toTimelineEvent.js';
export { toCalendarAdapter } from './toCalendarAdapter.js';
```

## Exports

Update `src/lib/index.ts` to re-export:
```ts
export { toTimelineEvent, toCalendarAdapter } from './bridge/index.js';
```

## Validation: yoga integration

After implementing the bridge, verify it works in `apps/yoga`:

1. Open `apps/yoga/src/routes/listing/[id]/+page.svelte`
2. The existing `scheduleToRecurring()` and `scheduleToDated()` functions currently build `CalendarAdapter`s manually
3. You do NOT need to replace them — the yoga app uses raw scraped schedule data, not the scheduler domain
4. Instead, add a note at the top of the yoga page file explaining the bridge API is available for when the yoga app migrates to the full scheduler

**Do NOT break the yoga app's existing calendar integration.**

## Tests

Create `packages/svelte-scheduler/src/lib/bridge/toTimelineEvent.test.ts`:
- Open slot with many spots maps to `status: 'available'`
- Open slot with ≤3 spots maps to `status: 'limited'`
- Full slot maps to `status: 'full'`
- Cancelled slot maps to `status: 'cancelled'`
- `category` is set from `tour.categories[0]`, never from a hardcoded color
- `data.spotsLeft` is correct

Create `packages/svelte-scheduler/src/lib/bridge/toCalendarAdapter.test.ts`:
- Adapter returns events for the given range
- Generated slots (no existing slot in store) are included
- Cancelled persisted slots are excluded
- Multiple tours do not bleed into each other

## Constraints

- Do not modify `@nomideusz/svelte-calendar` — bridge goes in the scheduler package only
- Do not break `apps/yoga` — its existing calendar wiring must keep working
- `pnpm check` must pass across all packages (`pnpm check` from repo root)
- `pnpm test` must pass in `packages/svelte-scheduler`
- No new npm dependencies
