# Task: Extract Recurrence / Slot Generation Logic

## Context

Read `AGENTS.md` fully before starting. This is **Build Order Step 4d + Step 5 (generator)**.

Two reference files:
- `C:\cmder\apps\booking-platform\` — look for `recurrence.ts` or similar recurring event patterns
- `C:\cmder\apps\tours\src\lib\db\schema\drizzle.ts` — to understand `timeSlots` / slot generation shape

Also review the `ScheduleRule` type in `packages/svelte-scheduler/src/lib/core/types.ts`.

## What to Build

### `packages/svelte-scheduler/src/lib/core/events/recurrence.ts`

Low-level recurrence utilities that expand a `ScheduleRule` into a list of `{ startTime, endTime }` pairs within a date range.

```ts
export function expandRule(
  rule: ScheduleRule,
  range: DateRange
): Array<{ startTime: Date; endTime: Date }>
```

Rules:
- `pattern: 'once'` — return a single occurrence if `validFrom` falls within `range`
- `pattern: 'weekly'` — for each date in `range`, if the day-of-week matches `rule.daysOfWeek`, generate an occurrence
  - Use `rule.startTime` (HH:MM) + the date in `rule.timezone` to compute the correct UTC Date
  - Use `rule.endTime` to compute `endTime`
  - Respect `rule.validFrom` and `rule.validUntil` boundaries
- `pattern: 'custom'` — not yet implemented; return empty array and leave a `// TODO: custom recurrence` comment in the branch body that handles the `'custom'` pattern case

Timezone handling: use the `Intl.DateTimeFormat` API (no extra deps) to construct dates in the correct timezone. Alternatively, if `date-fns-tz` is already available as a workspace peer via `@nomideusz/svelte-calendar`, you may use it — check `packages/svelte-calendar/package.json` before deciding.

### `packages/svelte-scheduler/src/lib/core/events/generator.ts`

Slot generation — turns `ScheduleRule[]` + existing `TourSlot[]` (persisted exceptions) into a final list of `TourSlot` objects for a given range.

```ts
export function generateSlots(
  tour: TourDefinition,
  existingSlots: TourSlot[],
  range: DateRange
): TourSlot[]
```

Logic:
1. For each `ScheduleRule` in `tour.scheduleRules`, call `expandRule(rule, range)` to get raw occurrences
2. For each raw occurrence, check if a matching `TourSlot` already exists in `existingSlots` (match by `scheduleRuleId` + overlapping time)
   - If yes: use the existing slot (it may have been cancelled or have custom capacity)
   - If no: construct a new in-memory `TourSlot` (do NOT assign a permanent ID — use a deterministic temporary ID like `generated-{ruleId}-{startTime.getTime()}`)
3. Exclude generated slots whose `status === 'cancelled'` (persisted cancellations)
4. Return the merged list sorted by `startTime`

**Important — slot generation is lazy (AGENTS.md rule):**
Only cancelled instances are ever persisted. Everything else is generated on demand.
The `generateSlots` function must not write to any store.

### `packages/svelte-scheduler/src/lib/core/events/index.ts`

Re-export `expandRule` and `generateSlots`.

## Exports

Update `packages/svelte-scheduler/src/lib/core/index.ts` to re-export:
```ts
export { expandRule, generateSlots } from './events/index.js';
```

Then re-export from `src/lib/index.ts`.

## Tests

Create `packages/svelte-scheduler/src/lib/core/events/recurrence.test.ts`:
- `once` rule generates exactly 1 occurrence
- `once` rule generates 0 occurrences if date is outside range
- `weekly` rule on Monday generates occurrences only on Mondays
- `weekly` rule respects `validUntil` boundary
- Correct timezone conversion (e.g. `Europe/Warsaw` UTC+1 vs UTC+2 in summer)

Create `packages/svelte-scheduler/src/lib/core/events/generator.test.ts`:
- Generated slots appear when no existing slots exist
- Persisted slot (with custom status) replaces generated slot
- Cancelled persisted slot is excluded from output
- Output is sorted by `startTime`
- Does not mutate input arrays

## Constraints

- No SvelteKit imports, no `$lib`, no DB, no Stripe
- No new npm dependencies (use `date-fns-tz` only if already available via the workspace)
- `pnpm check` must pass in `packages/svelte-scheduler`
- `pnpm test` must pass (all new tests green)
- `generateSlots` is pure — no side effects, no persistence
