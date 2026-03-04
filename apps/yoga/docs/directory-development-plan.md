# Directory Development Plan (Current Focus)

## Scope Decision

Phase 1 focuses on **directory product quality only**:

- Home directory UX
- City/style discovery pages
- Listing detail quality
- Claim and correction flows
- SEO text quality and internal linking

Booking system integration remains external and is deferred.

## Build Sequence (Execution Order)

## 1) Listing UX Hardening

**Files**

- `src/lib/components/YogaSchoolTable.svelte`
- `src/routes/+page.svelte`
- `src/routes/[city]/+page.svelte`

**Tasks**

- Persist table filters/sort state (style, sort key, sort direction, page reset rules).
- Ensure table/card toggle behavior is deterministic and discoverable.
- Verify keyboard accessibility for row navigation and filter controls.
- Improve empty state copy and filtering clarity.

**Acceptance**

- State remains stable after navigation/back.
- Sorting and filtering produce consistent results.
- Full table interactions are usable via keyboard.

## 2) Detail Page Quality (Claimed vs Unclaimed)

**Files**

- `src/routes/listing/[id]/+page.svelte`
- `src/routes/listing/[id]/+page.server.ts`

**Tasks**

- Enforce unclaimed rules: no photo gallery, clear claim CTA.
- Add report/correction CTA in-page and footer area.
- Ensure required data blocks render with graceful fallbacks.
- Add unique SEO body text strategy per listing.

**Acceptance**

- Unclaimed profiles always show claim CTA.
- Missing fields never break layout.
- Every listing page has non-duplicate textual content.

## 3) SEO Multiplier Pages

**Files**

- `src/routes/category/[slug]/+page.svelte`
- `src/routes/category/[slug]/+page.server.ts`

**Tasks**

- Finalize style page templates for priority styles.
- Add strong internal links: style → city/listings and listing → style.
- Add intro copy blocks with intent-specific language.

**Acceptance**

- Each priority style has an indexable page.
- Internal linking path exists both directions.

## 4) Legal and Trust Layer

**Files**

- legal pages in `src/routes/` (privacy/cookies/contact)
- listing detail route and global layout/footer

**Tasks**

- Publish privacy/cookies baseline pages.
- Add legal inbox contact and correction policy copy.
- Add report-incorrect-information action across relevant pages.

**Acceptance**

- Legal baseline pages are publicly available.
- Correction request path is visible and testable.

## 5) Directory Analytics Baseline

**Tasks**

- Track search/filter usage.
- Track list → detail click-through rate.
- Track claim CTA clicks and correction submissions.

**Acceptance**

- Dashboard can report core directory funnel weekly.

## Recommended Sprint Split

### Sprint A (7 days)

- Listing UX hardening
- Detail page unclaimed/claim behavior
- Report/correction CTA

### Sprint B (7 days)

- Style page SEO templates
- Legal baseline publishing
- Analytics events for directory funnel

## Weekly Metrics (Directory-First)

- Listings published and QA-passed
- Listing detail CTR from table/cards
- Claim CTA click rate
- Correction submissions and resolution time
- Organic sessions to city/style/listing pages
