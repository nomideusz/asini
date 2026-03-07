# Guide Panel UX v2 — Design

> Approved 2026-03-07. Covers the 4 high-priority UX improvements for the guide panel in apps/thebest.

## Design principles

- Linear-inspired: clean, focused, one purpose per view
- Progressive disclosure: simple defaults, power features on reveal
- No over-engineering: client-side filtering (small datasets), no pagination yet
- Design system: `--asini-*` tokens, Geist font, blue accent, tight 6px radii

---

## 1. Dashboard — Full-width calendar

**Route:** `/guide/dashboard`

**Current:** Shows one tour's calendar inside a `max-w-6xl` container with stats badges.

**New:** The dashboard IS the calendar. Full-width, full-height, immersive.

### Layout
- Break out of `max-w-*` constraint — content area goes edge-to-edge
- Minimal padding: `p-2 md:p-3`
- Calendar height: fills viewport (`calc(100vh - header height - padding)`)
- No stats, no legend, no extras

### Calendar integration
- Use `createCompositeAdapter` from `@nomideusz/svelte-calendar` to merge all tour adapters into one calendar
- Each tour gets a distinct color via the calendar palette system
- Custom `event` snippet renders: tour name + booked/available count (e.g., "Old Town 3/10")
- Click slot → navigates to `/guide/tours/{tourId}`
- Default view: `week-planner`, day/week pills visible
- `readOnly` stays true (guides manage slots from tour detail, not dashboard)

### Empty state
- Keep existing empty state (no tours → CTA to create first tour)

---

## 2. Tours listing — Search + filter

**Route:** `/guide/tours`

**Current:** Flat grid of tour cards, no filtering.

**New:** Add search + status filter pills above the card grid.

### Search bar
- Text input at the top, filters by tour name
- Client-side instant filtering (list is small, 1-15 tours)
- Placeholder: "Search tours..."

### Status filter pills
- Inline pill toggle next to search: **All** / **Active** / **Draft**
- Same pill style as calendar day/week pills (compact, `--asini-radius-sm`)
- Default: All

### Tour cards
- Keep existing card layout (name, duration, capacity, status badge)
- Add booking count to each card: "12 bookings this month" in `--asini-text-3`
- Requires loading booking counts in the page server load

### No sort, no pagination
- Not needed at 1-15 tours

---

## 3. Bookings table — Actions + filtering

**Route:** `/guide/bookings`

**Current:** Read-only table with 8 columns, no actions, no filtering.

**New:** Add search, status filter, and row actions.

### Search bar
- Filters by guest name, email, or booking reference
- Client-side, instant

### Status filter pills
- **All** / **Confirmed** / **Pending** / **Cancelled**
- Same pill component as tours listing

### Row actions (new column)
Three icon buttons per row, compact:

1. **View** (eye icon) — expands the row inline (accordion) showing:
   - Slot date and time
   - Pricing breakdown
   - Booking timestamp
   - Payment details
   - Full guest info

2. **Contact** (envelope icon) — `mailto:{guestEmail}` link
   - Pre-fills subject with booking reference

3. **Cancel** (x icon) — triggers cancellation flow:
   - Inline confirmation: "Cancel booking {ref}? Refund of {amount} will be issued."
   - Shows refund amount based on tour's cancellation policy
   - Requires new server action: `?/cancelBooking`
   - Only visible for confirmed/pending bookings (not already cancelled)

### Server changes needed
- New action `cancelBooking` on bookings page
- Load cancellation policy data alongside bookings for refund calculation

---

## 4. Tour creation form — Progressive disclosure

**Route:** `/guide/tours/new`

**Current:** Single long form with all sections expanded: basics, pricing (4 models visible), schedule, cancellation, submit.

**New:** Same single page, restructured with progressive disclosure.

### Visible by default (3 sections)

**1. Basics**
- Name (required)
- Description
- Duration + capacity (min/max)
- That's it. Languages, included items, requirements move to Extras.

**2. Pricing**
- Default: "Per person" model with a single price + currency field
- "Advanced pricing" toggle reveals: pricing model selector (categories, tiers, private tour) with their respective sub-forms
- When collapsed, only shows the price field — simplest possible view

**3. When**
- Default: single date + start time + end time (creates one slot)
- "Recurring schedule" toggle reveals: weekly pattern, days of week, valid from/until
- Label is "When" not "Schedule" — plain language

### Collapsed by default (2 sections)

**4. Cancellation policy**
- Collapsed, shows one-line summary: "Flexible — full refund 24h before"
- Click to expand: policy selector + custom policy fields
- Default value: `flexible` (most common)

**5. Extras**
- Collapsed, labeled "Additional details (optional)"
- Contains: languages, included items, requirements
- These are optional — no guide needs them on first tour creation

### Sticky submit bar
- Fixed to bottom of viewport as user scrolls
- Contains: "Create Tour" primary button + "Cancel" ghost link
- Subtle top border + backdrop blur

### Completion indicators
- Each section header shows a subtle checkmark icon when required fields in that section are filled
- Lightweight visual — not a formal stepper or progress bar

### Server changes
- "When" section with a single date+time creates a manual slot (not a schedule rule)
- "When" section with recurring enabled creates a schedule rule (same as current)

---

## Shared UI patterns

### Filter pill component
Used in tours listing and bookings table. Specifications:
- Inline flex row of pills
- Active pill: `bg-(--asini-accent) text-white`
- Inactive pill: `bg-(--asini-surface) text-(--asini-text-2)`
- Size: `px-3 py-1.5 text-xs font-medium`
- Radius: `--asini-radius-sm`
- Stateful: client-side `$state`, filters the displayed list

### Expandable section component
Used in tour creation form. Specifications:
- Header: section title + chevron icon (rotates on expand)
- One-line summary visible when collapsed
- Smooth height transition on expand/collapse
- `$state` boolean for open/closed

### Confirmation dialog
Used in booking cancellation. Specifications:
- Inline (not modal) — appears below the cancel button
- Shows refund amount + "Confirm" / "Never mind" buttons
- Red accent on confirm button (`--asini-danger`)
- Auto-dismisses on successful cancellation

---

## Out of scope (medium priority, future batch)

- Inline form validation
- Guest booking lookup
- Confirmation dialogs for other destructive actions (tour delete, photo delete)
- Structured inputs for languages/included items (tag picker)
- Settings page expansion (name/email/password editing)
- Tour detail sidebar reorganization
- Analytics/stats page
