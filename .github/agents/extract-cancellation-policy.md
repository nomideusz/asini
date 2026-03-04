# Task: Extract Cancellation Policy Logic

## Context

Read `AGENTS.md` fully before starting. This is **Build Order Step 4a**.

The reference implementation lives in Zaur at `C:\cmder\apps\tours\src\lib\utils\cancellation-policies.ts`.
Read it completely before writing any code. Your job is to extract the pure logic into the scheduler package — not copy-paste, but re-implement from scratch using it as the spec.

## What to Build

Create `packages/svelte-scheduler/src/lib/core/policy.ts`.

This module must export:

### `CANCELLATION_POLICIES: Record<string, CancellationPolicy>`

A map of the pre-defined policy configs from Zaur. Include all named policies — typically:
- `flexible` — full refund up to some hours before
- `standard` — tiered refund (full/partial/none)
- `strict` — minimal refund window
- `non-refundable` — no refunds

Adapt Zaur's policy configs verbatim to the `CancellationPolicy` type already defined in `src/lib/core/types.ts`.

### `calculateRefund(booking: Booking, slot: TourSlot, cancelledBy: 'guest' | 'guide' | 'system', policy: CancellationPolicy): number`

Returns the refund amount in the booking's currency.

**Non-negotiable rule (preserve exactly from Zaur):**
`cancelledBy === 'guide'` always returns 100% of `booking.totalAmount`. No time window. No exceptions.

For guest/system cancellations:
1. Compute hours until `slot.startTime` from now
2. Find the matching `CancellationRule` (the rule whose `hoursBeforeTour` is ≤ hours remaining, ordered descending)
3. Return `booking.totalAmount * (rule.refundPercentage / 100)`
4. If no rule matches (too late), return 0

### `getApplicableRule(hoursUntilTour: number, policy: CancellationPolicy): CancellationRule | null`

Returns the best-matching rule for a given hours-until-tour value, or null if no refund applies.

### `describeRefund(booking: Booking, slot: TourSlot, policy: CancellationPolicy): string`

Returns a human-readable description of the refund that would apply right now for a guest cancellation. Example: "100% refund (more than 48 hours before tour)".

## Exports

Re-export everything from `src/lib/core/index.ts`.

## Tests

Create `packages/svelte-scheduler/src/lib/core/policy.test.ts` using vitest.

Cover:
- Guide cancellation always returns 100% regardless of timing
- Full refund when cancelling well in advance
- Partial refund in the middle window
- Zero refund when past all windows
- `getApplicableRule` returns null when no rules match

## Types

Use the types already defined in `src/lib/core/types.ts`:
- `CancellationPolicy`
- `CancellationRule`
- `Booking`
- `TourSlot`

Never redefine or duplicate these.

## Constraints

- Pure functions only — no DB, no Stripe, no SvelteKit imports
- No new npm dependencies
- `pnpm check` must pass in `packages/svelte-scheduler`
- `pnpm test` must pass (all new tests green)
- Follow the extraction rules in `AGENTS.md` exactly
