# Task: apps/thebest — Guide Tour Management UI

## Context

Read `AGENTS.md` fully before starting. This builds on the scaffold + auth + styling.

Prerequisites:
- Auth (thebest-auth.md) merged — guide can sign up and log in
- Styling (thebest-styling.md) merged — Tailwind + DaisyUI + app shell in place
- Drizzle adapter exists at `src/lib/server/scheduler/drizzle-adapter.ts`

Reference: Zaur's tour creation at `C:\cmder\apps\tours\src\routes\guide\tours\` — read for features only.

## What to Build

### 1. Tour list page (guide area)

Update `src/routes/guide/tours/+page.server.ts` and `+page.svelte`:
- Load guide's tours via the Drizzle adapter (filter by `guideId` from session)
- Display as card grid using DaisyUI `card` components
- Each card: tour name, status badge, capacity, price summary, "Edit" button
- Empty state: "No tours yet — create your first one"
- "Create Tour" button at top → links to `/guide/tours/new`

### 2. Tour creation form

Create `src/routes/guide/tours/new/+page.svelte` and `+page.server.ts`:

Multi-step form or single scrollable form with sections:

**Basic info:**
- Name (text input, required)
- Description (textarea)
- Duration (number, minutes)
- Location (text)
- Languages (multi-select or tag input)
- Categories (multi-select or tag input)

**Capacity:**
- Min participants (number, default 1)
- Max participants (number, required)

**Pricing:**
- Model selector: per_person | participant_categories | group_tiers | private_tour
- Based on model, show appropriate fields:
  - `per_person`: base price (number, in major currency units → convert to cents), currency selector
  - `participant_categories`: dynamic list of categories with name + price each
  - `group_tiers`: dynamic list of tier brackets with max-size + price
  - `private_tour`: flat rate + currency
- Reference `PriceStructure` type from `@nomideusz/svelte-scheduler`

**Schedule:**
- Pattern: once | weekly | custom
- For weekly: day-of-week checkboxes + start time + end time
- Valid from date, valid until date (optional)
- Timezone (default Europe/Warsaw)
- Reference `ScheduleRule` type from `@nomideusz/svelte-scheduler`

**Cancellation policy:**
- Policy type selector: flexible | moderate | strict
- Reference existing policies from `@nomideusz/svelte-scheduler` core/policy

**Form action:**
- Server action validates all fields
- Creates tour via adapter
- Serializes pricing, schedule rules, cancellation policy as JSON
- Sets `guideId` from session
- Redirects to `/guide/tours/[tourId]`

### 3. Tour detail / edit page

Update `src/routes/guide/tours/[tourId]/+page.server.ts` and `+page.svelte`:
- Load tour by ID, verify guide owns it
- Display tour details with inline edit capabilities
- Show upcoming slots using `AvailabilityPicker` from `@nomideusz/svelte-scheduler`
- Show recent bookings using `GroupManifest` from `@nomideusz/svelte-scheduler`
- "Publish" / "Unpublish" toggle (sets `isPublic` and `status`)
- Map `--asini-*` tokens so scheduler components render correctly

### 4. Tour status management

- Draft → Active: validate tour has at least one schedule rule, pricing configured
- Active → Draft: warn about existing bookings
- Published (isPublic): tour appears on public listing

## Styling Guidelines

- All forms use DaisyUI `fieldset`, `input`, `select`, `textarea`, `btn` components
- Form validation errors use `validator` component or inline `alert-error`
- Cards use `card card-border` for elevation
- Responsive: stack on mobile, grid on desktop
- Use `steps` component for multi-step form progress (if multi-step)

## Constraints

- No Stripe integration — pricing is configured but no payment processing
- No image upload — leave `// TODO: tour image upload via MinIO/S3` stub
- No rich text editor for description — plain textarea
- Guide can only see/edit their own tours
- `pnpm check` must pass from repo root

## Validation

```bash
cd apps/thebest
pnpm check   # zero errors
pnpm build   # succeeds
```
