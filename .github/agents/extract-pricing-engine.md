# Task: Extract Pricing Engine

## Context

Read `AGENTS.md` fully before starting. This is **Build Order Step 4b**.

The reference implementation lives in Zaur at `C:\cmder\apps\tours\src\lib\utils\pricing-calculations.ts`.
Read it completely before writing any code. Your job is to extract the pure pricing logic into the scheduler package — not copy-paste, but re-implement from scratch using it as the spec.

## What to Build

### `packages/svelte-scheduler/src/lib/core/pricing/currency.ts`

Export the `STRIPE_FEES` table verbatim from Zaur. It maps currency codes to fee structures.
Include PLN and all Scandinavian currencies exactly as they appear in Zaur.
Do not shrink or simplify the table.

Export type `StripeFeeStructure` describing the shape of each entry.

### `packages/svelte-scheduler/src/lib/core/pricing/engine.ts`

Export a single pure function:

```ts
export function calculatePrice(
  pricing: PriceStructure,
  participants: number,
  options?: {
    participantsByCategory?: Record<string, number>;
    selectedAddonIds?: string[];
  }
): PriceBreakdown
```

This function must correctly handle all 4 pricing models defined in `PricingModel`:

#### `per_person`
`basePrice × participants`

#### `participant_categories`
Sum of `(category.price × count)` for each category in `participantsByCategory`.
Apply group discount tiers if `pricing.groupDiscountsEnabled === true`.

#### `group_tiers`
Find the matching `GroupPricingTier` where `minParticipants <= participants <= maxParticipants`.
Return the tier's flat `price` for the whole group.

#### `private_tour`
Return `pricing.privateTour.flatPrice` regardless of participant count.

### Discount application order (from AGENTS.md — follow exactly)
1. Base price per model above
2. Participant type modifiers (already baked into category prices)
3. Group discount tiers (percentage or fixed) — apply to subtotal
4. Add-ons (flat per booking, not per person) — sum selected addon prices
5. Stripe fee — look up from `STRIPE_FEES` table by `pricing.currency`
   - If `pricing.guidePaysProcessingFee === true`: guide absorbs it (subtract from `guideReceives`)
   - If `false`: add to customer total
6. Platform fee — **not in Zaur, not in this package**. Leave a `// TODO: platform fee` comment where step 6 would go.

### Return value

Populate all fields of `PriceBreakdown` (defined in `src/lib/core/types.ts`):
- `basePrice`, `groupDiscount`, `discountedBase`, `addonsTotal`, `subtotal`
- `processingFee`, `totalAmount`, `guideReceives`, `guidePaysProcessingFee`
- `categoryBreakdown` (when using `participant_categories`)
- `selectedTier` (when a group tier or discount tier matched)
- `errors` — validation errors (e.g. "No matching tier for 0 participants")

### `packages/svelte-scheduler/src/lib/core/pricing/index.ts`

Re-export `calculatePrice` and `STRIPE_FEES` and `StripeFeeStructure`.

## Exports

Re-export from `src/lib/core/index.ts`:
```ts
export { calculatePrice, STRIPE_FEES } from './pricing/index.js';
export type { StripeFeeStructure } from './pricing/index.js';
```

## Tests

Create `packages/svelte-scheduler/src/lib/core/pricing/engine.test.ts` using vitest.

Cover:
- `per_person`: 3 participants × 50 PLN = 150 PLN
- `participant_categories`: mixed adult/child prices, correct sum
- `group_tiers`: correct tier selected, wrong participant count returns error
- `private_tour`: flat price regardless of count
- Group discount (percentage) reduces total correctly
- Add-on adds flat fee to subtotal
- `guidePaysProcessingFee: true` — fee comes out of `guideReceives`, not customer total
- `guidePaysProcessingFee: false` — fee added to `totalAmount`
- Zero participants returns error in `errors` array

## Types

Use only types from `src/lib/core/types.ts`. Never import from SvelteKit, `$lib`, or Zaur.

## Constraints

- Pure function — no side effects, no DB, no Stripe calls
- No new npm dependencies
- `pnpm check` must pass in `packages/svelte-scheduler`
- `pnpm test` must pass (all new tests green)
- Follow extraction rules in `AGENTS.md` exactly
- STRIPE_FEES must be migrated verbatim — do not shrink it
