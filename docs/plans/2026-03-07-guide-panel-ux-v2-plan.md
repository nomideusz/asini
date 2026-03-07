# Guide Panel UX v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the guide panel UX with 4 high-priority features: full-width calendar dashboard, tours search/filter, bookings actions, and progressive disclosure tour creation form.

**Architecture:** All changes are in `apps/thebest`. No new packages, no DB migrations. Client-side filtering (datasets are small). New i18n keys in both en.json and pl.json. Shared UI patterns (filter pills, expandable sections) are inline — no component library extraction yet.

**Tech Stack:** SvelteKit 5 (runes), Tailwind v4, `--asini-*` CSS tokens, `@nomideusz/svelte-calendar` (composite adapter), `@nomideusz/svelte-scheduler` (toCalendarAdapter), Drizzle ORM.

**Design doc:** `docs/plans/2026-03-07-guide-panel-ux-v2-design.md`

---

## Task 1: Dashboard — Full-width calendar with composite adapter

**Files:**
- Modify: `apps/thebest/src/routes/guide/dashboard/+page.server.ts`
- Modify: `apps/thebest/src/routes/guide/dashboard/+page.svelte`

### Step 1: Update page server to return all tour IDs

The current load function returns only `id`, `name`, `status`. That's sufficient — the composite adapter is built client-side using `createFetchAdapter` + `toCalendarAdapter` per tour.

No server changes needed. Move to step 2.

### Step 2: Rewrite the dashboard page

Replace the entire `+page.svelte` with:

```svelte
<script lang="ts">
  import type { PageData } from "./$types.js";
  import { Calendar, createCompositeAdapter } from "@nomideusz/svelte-calendar";
  import type { TimelineEvent } from "@nomideusz/svelte-calendar";
  import { toCalendarAdapter } from "@nomideusz/svelte-scheduler";
  import { createFetchAdapter } from "$lib/fetch-adapter.js";
  import { goto } from "$app/navigation";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;

  const schedulerAdapter = createFetchAdapter();

  // Build a composite calendar adapter merging all tours
  const calendarAdapter = $derived.by(() => {
    const activeTours = data.tours.filter((t) => t.status === "active");
    if (activeTours.length === 0) return undefined;

    const adapters = activeTours.map((tour) =>
      toCalendarAdapter(schedulerAdapter, tour.id)
    );

    return adapters.length === 1
      ? adapters[0]
      : createCompositeAdapter(adapters);
  });

  function handleEventClick(event: TimelineEvent) {
    const tourId = event.data?.tourId as string | undefined;
    if (tourId) {
      goto(`/guide/tours/${tourId}`);
    }
  }
</script>

<div class="p-2 md:p-3 min-h-full flex flex-col">
  {#if data.tours.length === 0}
    <div
      class="flex flex-col items-center justify-center flex-1 rounded-(--asini-radius) p-12 text-center bg-(--asini-bg) border border-(--asini-border)"
      style="box-shadow: var(--asini-shadow);"
    >
      <div
        class="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style="background: color-mix(in oklch, var(--asini-accent) 10%, transparent); color: var(--asini-accent);"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <p class="text-lg max-w-md" style="color: var(--asini-text-2);">
        {t("guide_dashboard_no_tours")}
      </p>
      <a
        href="/guide/tours/new"
        class="asini-btn asini-btn-primary asini-btn-lg mt-6 rounded-full px-8"
        style="box-shadow: var(--asini-shadow-sm);"
      >{t("guide_create_first_tour")}</a>
    </div>
  {:else if calendarAdapter}
    <div
      class="flex-1 rounded-(--asini-radius) overflow-hidden border border-(--asini-border)"
      style="--dt-sans: 'Geist Sans', system-ui, sans-serif; --dt-mono: 'Geist Mono', monospace;"
    >
      <Calendar
        adapter={calendarAdapter}
        view="week-planner"
        height={0}
        showModePills
        showNavigation
        showDates
        readOnly
        oneventclick={handleEventClick}
      />
    </div>
  {:else}
    <div
      class="flex flex-col items-center justify-center flex-1 rounded-(--asini-radius) p-12 text-center bg-(--asini-bg) border border-(--asini-border)"
      style="box-shadow: var(--asini-shadow);"
    >
      <p class="text-lg" style="color: var(--asini-text-2);">
        {t("guide_dashboard_no_active")}
      </p>
    </div>
  {/if}
</div>
```

**Key decisions:**
- `height={0}` won't work — the calendar needs an explicit height or `'auto'`. We need to calculate viewport height. Use a container with `flex-1` and set the calendar height dynamically via a `$state` variable measuring the container, OR use `height={'auto'}` and let CSS control it. **Best approach:** Use CSS to make the calendar container fill available space, and pass a computed height. Bind the container element, measure its `clientHeight` on mount, and pass that to the Calendar.

**Revised approach for calendar height:**

```svelte
<script lang="ts">
  // ... other imports ...
  import { onMount } from "svelte";

  let containerEl: HTMLDivElement | undefined = $state();
  let calHeight = $state(600);

  onMount(() => {
    if (containerEl) {
      calHeight = containerEl.clientHeight;
      const ro = new ResizeObserver(([entry]) => {
        calHeight = entry.contentRect.height;
      });
      ro.observe(containerEl);
      return () => ro.disconnect();
    }
  });
</script>

<!-- In template, the calendar container: -->
<div bind:this={containerEl} class="flex-1 min-h-0 ...">
  <Calendar ... height={calHeight} />
</div>
```

### Step 3: Add i18n key for "no active tours"

Add to `en.json`:
```json
"guide_dashboard_no_active": "No active tours to display."
```

Add to `pl.json`:
```json
"guide_dashboard_no_active": "Brak aktywnych wycieczek do wyświetlenia."
```

### Step 4: Verify the calendar renders with all tours

Run: `pnpm dev:thebest`

- Log in as a guide with multiple tours
- Dashboard should show a full-width, full-height calendar
- Events from all tours should appear color-coded
- Clicking a slot should navigate to the tour detail page
- Day/week pills should work
- Empty state should render when no tours exist

### Step 5: Commit

```bash
git add apps/thebest/src/routes/guide/dashboard/ apps/thebest/src/lib/messages/
git commit -m "feat(thebest): full-width calendar dashboard with composite adapter"
```

---

## Task 2: Tours listing — Search + status filter pills

**Files:**
- Modify: `apps/thebest/src/routes/guide/tours/+page.svelte`
- Modify: `apps/thebest/src/routes/guide/tours/+page.server.ts`
- Modify: `apps/thebest/src/lib/messages/en.json`
- Modify: `apps/thebest/src/lib/messages/pl.json`

### Step 1: Add booking counts to server load

Current server load returns `id`, `name`, `status`. Add booking count per tour.

```typescript
// +page.server.ts
import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { createDrizzleAdapter } from '$lib/server/scheduler/drizzle-adapter.js';
import { bookings } from '$lib/server/db/schema.js';
import { eq, inArray, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const db = getDb();
	const adapter = createDrizzleAdapter(db);
	const allTours = await adapter.getTours({ guideId: user.id });

	const tourIds = allTours.map((t) => t.id);
	let bookingCounts: Record<string, number> = {};

	if (tourIds.length > 0) {
		const rows = await db
			.select({
				tourId: bookings.tourId,
				count: sql<number>`count(*)::int`,
			})
			.from(bookings)
			.where(inArray(bookings.tourId, tourIds))
			.groupBy(bookings.tourId);

		bookingCounts = Object.fromEntries(rows.map((r) => [r.tourId, r.count]));
	}

	return {
		tours: allTours.map((t) => ({
			id: t.id,
			name: t.name,
			status: t.status,
			duration: t.duration,
			minCapacity: t.minCapacity,
			maxCapacity: t.maxCapacity,
			bookingCount: bookingCounts[t.id] ?? 0,
		})),
	};
};
```

### Step 2: Add i18n keys

Add to `en.json`:
```json
"guide_tours_search": "Search tours...",
"guide_tours_filter_all": "All",
"guide_tours_filter_active": "Active",
"guide_tours_filter_draft": "Draft",
"guide_tours_bookings_count": "{count} bookings"
```

Add to `pl.json`:
```json
"guide_tours_search": "Szukaj wycieczek...",
"guide_tours_filter_all": "Wszystkie",
"guide_tours_filter_active": "Aktywne",
"guide_tours_filter_draft": "Szkice",
"guide_tours_bookings_count": "{count} rezerwacji"
```

### Step 3: Rewrite the tours listing page

```svelte
<script lang="ts">
	import type { PageData } from './$types.js';
	import { i18n } from '$lib/i18n.js';

	let { data }: { data: PageData } = $props();
	const t = i18n.t;

	let search = $state('');
	let statusFilter = $state<'all' | 'active' | 'draft'>('all');

	const filtered = $derived(
		data.tours.filter((tour) => {
			if (statusFilter !== 'all' && tour.status !== statusFilter) return false;
			if (search && !tour.name.toLowerCase().includes(search.toLowerCase())) return false;
			return true;
		})
	);
</script>

<section class="p-6 max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold">{t("guide_my_tours")}</h1>
		<a href="/guide/tours/new" class="asini-btn asini-btn-primary">{t("guide_create_first_tour")}</a>
	</div>

	<!-- Search + filter row -->
	<div class="flex flex-col sm:flex-row gap-3 mb-6">
		<input
			type="text"
			class="asini-input max-w-xs"
			placeholder={t("guide_tours_search")}
			bind:value={search}
		/>
		<div class="inline-flex items-center gap-0.5 p-1 rounded-(--asini-radius) bg-(--asini-surface) border border-(--asini-border)">
			{#each ['all', 'active', 'draft'] as filter}
				<button
					class="px-3 py-1.5 text-xs font-medium rounded-(--asini-radius-sm) cursor-pointer transition-colors {statusFilter === filter ? 'shadow-sm bg-(--asini-bg)' : ''}"
					style="color: {statusFilter === filter ? 'var(--asini-text)' : 'var(--asini-text-2)'};"
					onclick={() => statusFilter = filter as typeof statusFilter}
				>
					{t(`guide_tours_filter_${filter}`)}
				</button>
			{/each}
		</div>
	</div>

	{#if filtered.length === 0}
		<div class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface)">
			<div class="p-5 flex flex-col items-center text-center">
				<p style="color: var(--asini-text-3);">
					{#if data.tours.length === 0}
						No tours yet. Create your first tour to get started.
					{:else}
						No tours match your filter.
					{/if}
				</p>
			</div>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each filtered as tour (tour.id)}
				<a href="/guide/tours/{tour.id}" class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface) hover:bg-(--asini-bg-subtle) transition-colors">
					<div class="flex flex-row items-center justify-between py-4 px-5">
						<div>
							<h2 class="text-lg font-semibold">{tour.name}</h2>
							<p class="text-sm" style="color: var(--asini-text-3);">
								{tour.duration} min &middot; {tour.minCapacity}–{tour.maxCapacity} participants
								{#if tour.bookingCount > 0}
									&middot; {t("guide_tours_bookings_count", { count: tour.bookingCount })}
								{/if}
							</p>
						</div>
						<span
							class="asini-badge"
							class:bg-green-50={tour.status === 'active'}
							class:text-green-700={tour.status === 'active'}
							class:border-green-200={tour.status === 'active'}
							class:bg-transparent={tour.status === 'draft'}
							class:border-transparent={tour.status === 'draft'}
						>
							{tour.status}
						</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</section>
```

### Step 4: Verify

Run: `pnpm dev:thebest`

- Tours page shows search bar + All/Active/Draft pills
- Typing in search filters tours by name in real time
- Clicking pills filters by status
- Booking counts appear on tour cards
- Empty state shows appropriate message

### Step 5: Commit

```bash
git add apps/thebest/src/routes/guide/tours/ apps/thebest/src/lib/messages/
git commit -m "feat(thebest): tours listing with search and status filter pills"
```

---

## Task 3: Bookings table — Search, filter, and row actions

**Files:**
- Modify: `apps/thebest/src/routes/guide/bookings/+page.svelte`
- Modify: `apps/thebest/src/routes/guide/bookings/+page.server.ts`
- Modify: `apps/thebest/src/lib/messages/en.json`
- Modify: `apps/thebest/src/lib/messages/pl.json`

### Step 1: Add cancelBooking server action

Add to `+page.server.ts`:

```typescript
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { bookings, tours } from '$lib/server/db/schema.js';
import { eq, desc, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/login');

	const db = getDb();

	const guideTours = await db
		.select({ id: tours.id, name: tours.name })
		.from(tours)
		.where(eq(tours.guideId, locals.user.id));

	if (guideTours.length === 0) return { bookings: [], tours: guideTours };

	const tourIds = guideTours.map((t) => t.id);

	const rows = await db
		.select()
		.from(bookings)
		.where(inArray(bookings.tourId, tourIds))
		.orderBy(desc(bookings.createdAt))
		.limit(200);

	return { bookings: rows, tours: guideTours };
};

export const actions = {
	cancelBooking: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const form = await request.formData();
		const bookingId = form.get('bookingId')?.toString();
		if (!bookingId) return fail(400, { error: 'Missing booking ID' });

		const db = getDb();

		// Verify the booking belongs to one of this guide's tours
		const [booking] = await db
			.select()
			.from(bookings)
			.where(eq(bookings.id, bookingId));

		if (!booking) return fail(404, { error: 'Booking not found' });

		const [tour] = await db
			.select({ guideId: tours.guideId })
			.from(tours)
			.where(eq(tours.id, booking.tourId));

		if (!tour || tour.guideId !== locals.user.id) {
			return fail(403, { error: 'Forbidden' });
		}

		if (booking.status === 'cancelled') {
			return fail(400, { error: 'Booking is already cancelled' });
		}

		await db
			.update(bookings)
			.set({
				status: 'cancelled',
				cancelledBy: 'guide',
				cancellationReason: 'Cancelled by guide',
			})
			.where(eq(bookings.id, bookingId));

		// TODO: Trigger refund via Stripe if payment was collected
		// TODO: Send cancellation email to guest

		return { cancelled: true, bookingId };
	},
} satisfies Actions;
```

### Step 2: Add i18n keys

Add to `en.json`:
```json
"guide_bookings_search": "Search by name, email, or reference...",
"guide_bookings_filter_all": "All",
"guide_bookings_filter_confirmed": "Confirmed",
"guide_bookings_filter_pending": "Pending",
"guide_bookings_filter_cancelled": "Cancelled",
"guide_bookings_col_actions": "Actions",
"guide_bookings_view": "View details",
"guide_bookings_contact": "Contact guest",
"guide_bookings_cancel": "Cancel booking",
"guide_bookings_cancel_confirm": "Cancel booking {ref}? This will issue a refund.",
"guide_bookings_cancel_yes": "Confirm",
"guide_bookings_cancel_no": "Never mind",
"guide_bookings_cancelled_success": "Booking cancelled.",
"guide_bookings_slot_date": "Slot date",
"guide_bookings_booked_at": "Booked at",
"guide_bookings_special_requests": "Special requests"
```

Add to `pl.json`:
```json
"guide_bookings_search": "Szukaj po nazwisku, emailu lub numerze...",
"guide_bookings_filter_all": "Wszystkie",
"guide_bookings_filter_confirmed": "Potwierdzone",
"guide_bookings_filter_pending": "Oczekujące",
"guide_bookings_filter_cancelled": "Anulowane",
"guide_bookings_col_actions": "Akcje",
"guide_bookings_view": "Szczegóły",
"guide_bookings_contact": "Kontakt z gościem",
"guide_bookings_cancel": "Anuluj rezerwację",
"guide_bookings_cancel_confirm": "Anulować rezerwację {ref}? Zwrot zostanie wystawiony.",
"guide_bookings_cancel_yes": "Potwierdź",
"guide_bookings_cancel_no": "Nie, zostaw",
"guide_bookings_cancelled_success": "Rezerwacja anulowana.",
"guide_bookings_slot_date": "Data terminu",
"guide_bookings_booked_at": "Data rezerwacji",
"guide_bookings_special_requests": "Specjalne prośby"
```

### Step 3: Rewrite the bookings page

```svelte
<script lang="ts">
  import type { ActionData, PageData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const t = i18n.t;

  let search = $state("");
  let statusFilter = $state<"all" | "confirmed" | "pending" | "cancelled">("all");
  let expandedId = $state<string | null>(null);
  let cancellingId = $state<string | null>(null);

  function tourName(tourId: string) {
    return data.tours.find((t) => t.id === tourId)?.name ?? tourId;
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      confirmed: "bg-green-50 text-green-700 border-green-200",
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      cancelled: "bg-red-50 text-red-700 border-red-200",
      completed: "bg-transparent border-transparent",
    };
    return map[status] ?? "";
  }

  const filtered = $derived(
    data.bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          b.guestName.toLowerCase().includes(q) ||
          b.guestEmail.toLowerCase().includes(q) ||
          b.bookingReference.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    })
  );
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-6">{t("guide_bookings_title")}</h1>

  <!-- Feedback -->
  {#if form?.cancelled}
    <div class="flex items-center gap-2 px-3 py-2 text-sm rounded-(--asini-radius) bg-green-50 text-green-700 border border-green-200 mb-4">
      <span>{t("guide_bookings_cancelled_success")}</span>
    </div>
  {/if}
  {#if form?.error}
    <div class="flex items-center gap-2 px-3 py-2 text-sm rounded-(--asini-radius) bg-red-50 text-red-700 border border-red-200 mb-4">
      <span>{form.error}</span>
    </div>
  {/if}

  <!-- Search + filter row -->
  <div class="flex flex-col sm:flex-row gap-3 mb-6">
    <input
      type="text"
      class="asini-input max-w-sm"
      placeholder={t("guide_bookings_search")}
      bind:value={search}
    />
    <div class="inline-flex items-center gap-0.5 p-1 rounded-(--asini-radius) bg-(--asini-surface) border border-(--asini-border)">
      {#each ["all", "confirmed", "pending", "cancelled"] as filter}
        <button
          class="px-3 py-1.5 text-xs font-medium rounded-(--asini-radius-sm) cursor-pointer transition-colors {statusFilter === filter ? 'shadow-sm bg-(--asini-bg)' : ''}"
          style="color: {statusFilter === filter ? 'var(--asini-text)' : 'var(--asini-text-2)'};"
          onclick={() => statusFilter = filter as typeof statusFilter}
        >
          {t(`guide_bookings_filter_${filter}`)}
        </button>
      {/each}
    </div>
  </div>

  {#if data.bookings.length === 0}
    <div style="color: var(--asini-text-3);">{t("guide_bookings_empty")}</div>
  {:else if filtered.length === 0}
    <div style="color: var(--asini-text-3);">No bookings match your filter.</div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-xs font-medium uppercase tracking-wide border-b border-(--asini-border)" style="color: var(--asini-text-3);">
            <th class="text-left py-2 px-3">{t("guide_bookings_col_reference")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_tour")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_guest")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_participants")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_amount")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_status")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_actions")}</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as b (b.id)}
            <!-- Main row -->
            <tr class="border-b border-(--asini-border) hover:bg-(--asini-bg-subtle)">
              <td class="py-2 px-3" style="font-family: var(--asini-font-mono); font-size: 0.75rem;">{b.bookingReference}</td>
              <td class="py-2 px-3">{tourName(b.tourId)}</td>
              <td class="py-2 px-3">
                <div>{b.guestName}</div>
                <div class="text-xs" style="color: var(--asini-text-3);">{b.guestEmail}</div>
              </td>
              <td class="py-2 px-3">{b.participants}</td>
              <td class="py-2 px-3">{(b.totalAmount / 100).toFixed(2)} {b.currency}</td>
              <td class="py-2 px-3">
                <span class="asini-badge {statusBadge(b.status)}">{b.status}</span>
              </td>
              <td class="py-2 px-3">
                <div class="flex items-center gap-1">
                  <!-- View toggle -->
                  <button
                    class="asini-btn asini-btn-ghost asini-btn-sm p-1"
                    title={t("guide_bookings_view")}
                    onclick={() => expandedId = expandedId === b.id ? null : b.id}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <!-- Contact -->
                  <a
                    href="mailto:{b.guestEmail}?subject=Booking {b.bookingReference}"
                    class="asini-btn asini-btn-ghost asini-btn-sm p-1"
                    title={t("guide_bookings_contact")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </a>
                  <!-- Cancel -->
                  {#if b.status !== "cancelled" && b.status !== "completed"}
                    <button
                      class="asini-btn asini-btn-ghost asini-btn-sm p-1"
                      style="color: var(--asini-danger);"
                      title={t("guide_bookings_cancel")}
                      onclick={() => cancellingId = cancellingId === b.id ? null : b.id}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  {/if}
                </div>
              </td>
            </tr>

            <!-- Expanded details row -->
            {#if expandedId === b.id}
              <tr class="bg-(--asini-bg-subtle)">
                <td colspan="7" class="px-3 py-4">
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <dt class="text-xs font-medium" style="color: var(--asini-text-3);">{t("guide_bookings_booked_at")}</dt>
                      <dd>{new Date(b.createdAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-medium" style="color: var(--asini-text-3);">{t("guide_bookings_col_payment")}</dt>
                      <dd><span class="asini-badge">{b.paymentStatus}</span></dd>
                    </div>
                    {#if b.guestPhone}
                      <div>
                        <dt class="text-xs font-medium" style="color: var(--asini-text-3);">Phone</dt>
                        <dd>{b.guestPhone}</dd>
                      </div>
                    {/if}
                    {#if b.specialRequests}
                      <div class="col-span-2">
                        <dt class="text-xs font-medium" style="color: var(--asini-text-3);">{t("guide_bookings_special_requests")}</dt>
                        <dd>{b.specialRequests}</dd>
                      </div>
                    {/if}
                  </div>
                </td>
              </tr>
            {/if}

            <!-- Cancel confirmation row -->
            {#if cancellingId === b.id}
              <tr class="bg-red-50/50">
                <td colspan="7" class="px-3 py-3">
                  <div class="flex items-center gap-3">
                    <span class="text-sm">{t("guide_bookings_cancel_confirm", { ref: b.bookingReference })}</span>
                    <form method="POST" action="?/cancelBooking" class="inline">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <button type="submit" class="asini-btn asini-btn-danger asini-btn-sm">
                        {t("guide_bookings_cancel_yes")}
                      </button>
                    </form>
                    <button
                      class="asini-btn asini-btn-ghost asini-btn-sm"
                      onclick={() => cancellingId = null}
                    >
                      {t("guide_bookings_cancel_no")}
                    </button>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
```

**Note:** The "Date booked" and "Payment" columns from the old table are moved into the expanded row to keep the main table tighter (7 columns instead of 8). Date is in the expanded details, payment status visible on expand.

### Step 4: Verify

Run: `pnpm dev:thebest`

- Search filters by guest name, email, reference
- Status pills filter correctly
- Eye icon expands/collapses a detail row
- Envelope icon opens mailto with pre-filled subject
- X icon shows inline cancel confirmation
- Confirm cancellation updates status in DB
- Cancelled bookings no longer show cancel button
- Success/error feedback shown after cancel

### Step 5: Commit

```bash
git add apps/thebest/src/routes/guide/bookings/ apps/thebest/src/lib/messages/
git commit -m "feat(thebest): bookings table with search, filters, and actions"
```

---

## Task 4: Tour creation form — Progressive disclosure

**Files:**
- Modify: `apps/thebest/src/routes/guide/tours/new/+page.svelte`
- Modify: `apps/thebest/src/routes/guide/tours/new/+page.server.ts`
- Modify: `apps/thebest/src/lib/messages/en.json`
- Modify: `apps/thebest/src/lib/messages/pl.json`

### Step 1: Add i18n keys

Add to `en.json`:
```json
"guide_create_title": "Create Tour",
"guide_create_basics": "Basics",
"guide_create_pricing": "Pricing",
"guide_create_when": "When",
"guide_create_cancellation": "Cancellation policy",
"guide_create_cancellation_summary": "Flexible — full refund 24h before",
"guide_create_extras": "Additional details",
"guide_create_extras_hint": "Languages, included items, requirements",
"guide_create_advanced_pricing": "Advanced pricing",
"guide_create_recurring": "Recurring schedule",
"guide_create_submit": "Create Tour",
"guide_create_cancel": "Cancel"
```

Add to `pl.json`:
```json
"guide_create_title": "Utwórz wycieczkę",
"guide_create_basics": "Podstawy",
"guide_create_pricing": "Cena",
"guide_create_when": "Kiedy",
"guide_create_cancellation": "Polityka anulowania",
"guide_create_cancellation_summary": "Elastyczna — pełny zwrot 24h przed",
"guide_create_extras": "Dodatkowe informacje",
"guide_create_extras_hint": "Języki, co zawiera, wymagania",
"guide_create_advanced_pricing": "Zaawansowana wycena",
"guide_create_recurring": "Harmonogram cykliczny",
"guide_create_submit": "Utwórz wycieczkę",
"guide_create_cancel": "Anuluj"
```

### Step 2: Rewrite the creation form

The form restructure uses `$state` booleans for expanded/collapsed sections. The chevron icon rotates on expand.

```svelte
<script lang="ts">
	import type { ActionData, PageData } from './$types.js';
	import { i18n } from '$lib/i18n.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const t = i18n.t;

	// Section visibility
	let showAdvancedPricing = $state(false);
	let showRecurring = $state(false);
	let showCancellation = $state(false);
	let showExtras = $state(false);

	// Form state
	let pricingModel = $state('per_person');
	let schedulePattern = $state('once');
	let cancellationPolicy = $state('flexible');

	let categoryRows = $state([{ label: 'Adult', price: '20' }, { label: 'Child', price: '10' }]);
	let tierRows = $state([{ min: '1', max: '4', price: '100' }, { min: '5', max: '10', price: '180' }]);

	const DAYS = [
		{ value: 1, label: 'Mon' },
		{ value: 2, label: 'Tue' },
		{ value: 3, label: 'Wed' },
		{ value: 4, label: 'Thu' },
		{ value: 5, label: 'Fri' },
		{ value: 6, label: 'Sat' },
		{ value: 7, label: 'Sun' },
	];

	// Completion indicators
	let nameValue = $state('');
	let priceValue = $state('20');
	let dateValue = $state('');
	let startTimeValue = $state('09:00');

	const basicsComplete = $derived(nameValue.trim().length > 0);
	const pricingComplete = $derived(parseFloat(priceValue) > 0 || showAdvancedPricing);
	const whenComplete = $derived(showRecurring || dateValue.length > 0);
</script>

<section class="p-6 max-w-2xl mx-auto pb-24">
	<h1 class="text-2xl font-bold mb-6">{t("guide_create_title")}</h1>

	{#if form?.error}
		<div class="flex items-center gap-2 px-3 py-2 text-sm rounded-(--asini-radius) bg-red-50 text-red-700 border border-red-200 mb-4">
			<span>{form.error}</span>
		</div>
	{/if}

	<form method="POST" class="space-y-4">

		<!-- ═══ Section 1: Basics ═══ -->
		<fieldset class="space-y-3 bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius) p-4">
			<legend class="text-xs font-medium uppercase tracking-wide mb-1 flex items-center gap-2" style="color: var(--asini-text-2);">
				{t("guide_create_basics")}
				{#if basicsComplete}
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--asini-success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				{/if}
			</legend>

			<label class="text-xs font-medium" for="name" style="color: var(--asini-text-2);">Name</label>
			<input id="name" name="name" type="text" required class="asini-input" placeholder="Walking Tour of Old Town" bind:value={nameValue} />

			<label class="text-xs font-medium mt-3" for="description" style="color: var(--asini-text-2);">Description</label>
			<textarea id="description" name="description" class="asini-input" rows="3" placeholder="Describe your tour..."></textarea>

			<div class="grid grid-cols-3 gap-4 mt-3">
				<div>
					<label class="text-xs font-medium" for="duration" style="color: var(--asini-text-2);">Duration (min)</label>
					<input id="duration" name="duration" type="number" min="15" value="60" class="asini-input" />
				</div>
				<div>
					<label class="text-xs font-medium" for="minCapacity" style="color: var(--asini-text-2);">Min</label>
					<input id="minCapacity" name="minCapacity" type="number" min="1" value="1" class="asini-input" />
				</div>
				<div>
					<label class="text-xs font-medium" for="maxCapacity" style="color: var(--asini-text-2);">Max</label>
					<input id="maxCapacity" name="maxCapacity" type="number" min="1" value="10" class="asini-input" />
				</div>
			</div>
		</fieldset>

		<!-- ═══ Section 2: Pricing ═══ -->
		<fieldset class="space-y-3 bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius) p-4">
			<legend class="text-xs font-medium uppercase tracking-wide mb-1 flex items-center gap-2" style="color: var(--asini-text-2);">
				{t("guide_create_pricing")}
				{#if pricingComplete}
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--asini-success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				{/if}
			</legend>

			{#if !showAdvancedPricing}
				<!-- Simple: just price per person -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="text-xs font-medium" for="basePrice" style="color: var(--asini-text-2);">Price per person</label>
						<input id="basePrice" name="basePrice" type="number" step="0.01" min="0" class="asini-input" bind:value={priceValue} />
					</div>
					<div>
						<label class="text-xs font-medium" for="currency" style="color: var(--asini-text-2);">Currency</label>
						<input id="currency" name="currency" type="text" value="EUR" class="asini-input" />
					</div>
				</div>
				<input type="hidden" name="pricingModel" value="per_person" />
			{:else}
				<!-- Advanced: full pricing model selector -->
				<label class="text-xs font-medium" for="pricingModel" style="color: var(--asini-text-2);">Pricing model</label>
				<select id="pricingModel" name="pricingModel" class="asini-input" bind:value={pricingModel}>
					<option value="per_person">Per person</option>
					<option value="participant_categories">Participant categories</option>
					<option value="group_tiers">Group tiers</option>
					<option value="private_tour">Private tour</option>
				</select>

				<div class="grid grid-cols-2 gap-4 mt-3">
					<div>
						<label class="text-xs font-medium" for="currency" style="color: var(--asini-text-2);">Currency</label>
						<input id="currency" name="currency" type="text" value="EUR" class="asini-input" />
					</div>
					{#if pricingModel === 'per_person'}
						<div>
							<label class="text-xs font-medium" for="basePrice" style="color: var(--asini-text-2);">Price per person</label>
							<input id="basePrice" name="basePrice" type="number" step="0.01" min="0" class="asini-input" bind:value={priceValue} />
						</div>
					{/if}
				</div>

				{#if pricingModel === 'participant_categories'}
					<div class="mt-3 space-y-2">
						<p class="text-sm" style="color: var(--asini-text-3);">Define categories and prices:</p>
						{#each categoryRows as row, i}
							<div class="grid grid-cols-3 gap-2 items-end">
								<input name="catLabel" type="text" bind:value={row.label} class="asini-input py-1 text-xs" placeholder="Category" />
								<input name="catPrice" type="number" step="0.01" bind:value={row.price} class="asini-input py-1 text-xs" placeholder="Price" />
								<button type="button" class="asini-btn asini-btn-ghost asini-btn-sm" onclick={() => categoryRows = categoryRows.filter((_, idx) => idx !== i)}>Remove</button>
							</div>
						{/each}
						<button type="button" class="asini-btn asini-btn-ghost asini-btn-sm" onclick={() => categoryRows = [...categoryRows, { label: '', price: '0' }]}>+ Add category</button>
					</div>
					<input type="hidden" name="basePrice" value="0" />
				{/if}

				{#if pricingModel === 'group_tiers'}
					<div class="mt-3 space-y-2">
						<p class="text-sm" style="color: var(--asini-text-3);">Define group size tiers:</p>
						{#each tierRows as row, i}
							<div class="grid grid-cols-4 gap-2 items-end">
								<input name="tierMin" type="number" bind:value={row.min} class="asini-input py-1 text-xs" placeholder="Min" />
								<input name="tierMax" type="number" bind:value={row.max} class="asini-input py-1 text-xs" placeholder="Max" />
								<input name="tierPrice" type="number" step="0.01" bind:value={row.price} class="asini-input py-1 text-xs" placeholder="Price" />
								<button type="button" class="asini-btn asini-btn-ghost asini-btn-sm" onclick={() => tierRows = tierRows.filter((_, idx) => idx !== i)}>Remove</button>
							</div>
						{/each}
						<button type="button" class="asini-btn asini-btn-ghost asini-btn-sm" onclick={() => tierRows = [...tierRows, { min: '1', max: '1', price: '0' }]}>+ Add tier</button>
					</div>
					<input type="hidden" name="basePrice" value="0" />
				{/if}

				{#if pricingModel === 'private_tour'}
					<div class="mt-3">
						<label class="text-xs font-medium" for="privateFlatPrice" style="color: var(--asini-text-2);">Flat price</label>
						<input id="privateFlatPrice" name="privateFlatPrice" type="number" step="0.01" min="0" value="200" class="asini-input" />
					</div>
					<input type="hidden" name="basePrice" value="0" />
				{/if}
			{/if}

			<button
				type="button"
				class="text-xs font-medium mt-2 cursor-pointer transition-colors"
				style="color: var(--asini-accent); background: none; border: none; padding: 0;"
				onclick={() => showAdvancedPricing = !showAdvancedPricing}
			>
				{showAdvancedPricing ? '← Simple pricing' : t("guide_create_advanced_pricing") + ' →'}
			</button>
		</fieldset>

		<!-- ═══ Section 3: When ═══ -->
		<fieldset class="space-y-3 bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius) p-4">
			<legend class="text-xs font-medium uppercase tracking-wide mb-1 flex items-center gap-2" style="color: var(--asini-text-2);">
				{t("guide_create_when")}
				{#if whenComplete}
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--asini-success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				{/if}
			</legend>

			{#if !showRecurring}
				<!-- Simple: single date + time -->
				<div class="grid grid-cols-3 gap-4">
					<div>
						<label class="text-xs font-medium" for="slotDate" style="color: var(--asini-text-2);">Date</label>
						<input id="slotDate" name="slotDate" type="date" class="asini-input" bind:value={dateValue} />
					</div>
					<div>
						<label class="text-xs font-medium" for="startTime" style="color: var(--asini-text-2);">Start</label>
						<input id="startTime" name="startTime" type="time" value="09:00" class="asini-input" bind:value={startTimeValue} />
					</div>
					<div>
						<label class="text-xs font-medium" for="endTime" style="color: var(--asini-text-2);">End</label>
						<input id="endTime" name="endTime" type="time" value="10:00" class="asini-input" />
					</div>
				</div>
				<input type="hidden" name="schedulePattern" value="once" />
			{:else}
				<!-- Recurring schedule -->
				<input type="hidden" name="schedulePattern" value="weekly" />
				<div>
					<p class="text-xs font-medium" style="color: var(--asini-text-2);">Days of week</p>
					<div class="flex flex-wrap gap-2 mt-1">
						{#each DAYS as day}
							<label class="cursor-pointer flex items-center gap-1">
								<input type="checkbox" name="daysOfWeek" value={day.value} class="size-3.5 accent-(--asini-accent)" />
								<span class="text-sm">{day.label}</span>
							</label>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4 mt-3">
					<div>
						<label class="text-xs font-medium" for="startTime" style="color: var(--asini-text-2);">Start time</label>
						<input id="startTime" name="startTime" type="time" value="09:00" class="asini-input" />
					</div>
					<div>
						<label class="text-xs font-medium" for="endTime" style="color: var(--asini-text-2);">End time</label>
						<input id="endTime" name="endTime" type="time" value="10:00" class="asini-input" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4 mt-3">
					<div>
						<label class="text-xs font-medium" for="validFrom" style="color: var(--asini-text-2);">Valid from</label>
						<input id="validFrom" name="validFrom" type="date" class="asini-input" />
					</div>
					<div>
						<label class="text-xs font-medium" for="validUntil" style="color: var(--asini-text-2);">Valid until (optional)</label>
						<input id="validUntil" name="validUntil" type="date" class="asini-input" />
					</div>
				</div>
			{/if}

			<input type="hidden" name="timezone" value="Europe/Warsaw" />

			<button
				type="button"
				class="text-xs font-medium mt-2 cursor-pointer transition-colors"
				style="color: var(--asini-accent); background: none; border: none; padding: 0;"
				onclick={() => { showRecurring = !showRecurring; schedulePattern = showRecurring ? 'weekly' : 'once'; }}
			>
				{showRecurring ? '← Single date' : t("guide_create_recurring") + ' →'}
			</button>
		</fieldset>

		<!-- ═══ Section 4: Cancellation Policy (collapsed) ═══ -->
		<div class="bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius)">
			<button
				type="button"
				class="w-full flex items-center justify-between p-4 cursor-pointer"
				style="background: none; border: none;"
				onclick={() => showCancellation = !showCancellation}
			>
				<span class="text-xs font-medium uppercase tracking-wide" style="color: var(--asini-text-2);">
					{t("guide_create_cancellation")}
				</span>
				<div class="flex items-center gap-2">
					{#if !showCancellation}
						<span class="text-xs" style="color: var(--asini-text-3);">{t("guide_create_cancellation_summary")}</span>
					{/if}
					<svg
						xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
						fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
						style="color: var(--asini-text-3); transition: transform 150ms; transform: rotate({showCancellation ? '180' : '0'}deg);"
					><polyline points="6 9 12 15 18 9"/></svg>
				</div>
			</button>

			{#if showCancellation}
				<div class="px-4 pb-4 space-y-3">
					<select name="cancellationPolicy" class="asini-input" bind:value={cancellationPolicy}>
						{#each data.cancellationPolicies as policy}
							<option value={policy.key}>{policy.name} — {policy.description}</option>
						{/each}
						<option value="custom">Custom</option>
					</select>

					{#if cancellationPolicy === 'custom'}
						<div class="grid grid-cols-2 gap-4 mt-3">
							<div>
								<label class="text-xs font-medium" for="customHours" style="color: var(--asini-text-2);">Hours before tour</label>
								<input id="customHours" name="customHours" type="number" min="0" value="24" class="asini-input" />
							</div>
							<div>
								<label class="text-xs font-medium" for="customRefund" style="color: var(--asini-text-2);">Refund percentage</label>
								<input id="customRefund" name="customRefund" type="number" min="0" max="100" value="100" class="asini-input" />
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<input type="hidden" name="cancellationPolicy" value="flexible" />
			{/if}
		</div>

		<!-- ═══ Section 5: Extras (collapsed) ═══ -->
		<div class="bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius)">
			<button
				type="button"
				class="w-full flex items-center justify-between p-4 cursor-pointer"
				style="background: none; border: none;"
				onclick={() => showExtras = !showExtras}
			>
				<span class="text-xs font-medium uppercase tracking-wide" style="color: var(--asini-text-2);">
					{t("guide_create_extras")}
				</span>
				<div class="flex items-center gap-2">
					{#if !showExtras}
						<span class="text-xs" style="color: var(--asini-text-3);">{t("guide_create_extras_hint")}</span>
					{/if}
					<svg
						xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
						fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
						style="color: var(--asini-text-3); transition: transform 150ms; transform: rotate({showExtras ? '180' : '0'}deg);"
					><polyline points="6 9 12 15 18 9"/></svg>
				</div>
			</button>

			{#if showExtras}
				<div class="px-4 pb-4 space-y-3">
					<label class="text-xs font-medium" for="languages" style="color: var(--asini-text-2);">Languages (comma-separated)</label>
					<input id="languages" name="languages" type="text" value="en" class="asini-input" placeholder="en, pl, de" />

					<label class="text-xs font-medium mt-3" for="includedItems" style="color: var(--asini-text-2);">Included items (one per line)</label>
					<textarea id="includedItems" name="includedItems" class="asini-input" rows="3" placeholder="Water bottle&#10;Map&#10;Snack"></textarea>

					<label class="text-xs font-medium mt-3" for="requirements" style="color: var(--asini-text-2);">Requirements (one per line)</label>
					<textarea id="requirements" name="requirements" class="asini-input" rows="2" placeholder="Comfortable shoes&#10;Umbrella"></textarea>
				</div>
			{/if}
		</div>
	</form>

	<!-- ═══ Sticky submit bar ═══ -->
	<div
		class="fixed bottom-0 left-0 right-0 lg:left-64 flex items-center gap-3 px-6 py-3 z-30"
		style="background: color-mix(in srgb, var(--asini-bg) 90%, transparent); backdrop-filter: blur(8px); border-top: 1px solid var(--asini-border);"
	>
		<button type="submit" form="create-form" class="asini-btn asini-btn-primary">{t("guide_create_submit")}</button>
		<a href="/guide/tours" class="asini-btn asini-btn-ghost">{t("guide_create_cancel")}</a>
	</div>
</section>
```

**Note:** The `<form>` needs an `id="create-form"` attribute so the sticky submit button (outside the form) can reference it. Add `id="create-form"` to the `<form method="POST" ...>` tag.

### Step 3: Update server action to handle new "When" logic

The current server action creates a tour with schedule rules. When `schedulePattern` is `once` and `slotDate` is provided, create the tour first, then create a manual slot.

Modify the POST action in `+page.server.ts` — after `await adapter.createTour(...)`, check for `slotDate`:

```typescript
// After creating the tour, if single-date mode, create a manual slot
const slotDate = formData.get('slotDate')?.toString();
if (schedulePattern === 'once' && slotDate) {
	const startTimeStr = formData.get('startTime')?.toString() ?? '09:00';
	const endTimeStr = formData.get('endTime')?.toString() ?? '10:00';
	const startTime = new Date(`${slotDate}T${startTimeStr}:00`);
	const endTime = new Date(`${slotDate}T${endTimeStr}:00`);

	if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime()) && endTime > startTime) {
		await adapter.createSlot({
			tourId: tour.id,
			startTime,
			endTime,
			availableSpots: maxCapacity,
			bookedSpots: 0,
			status: 'open',
			isGenerated: false,
		});
	}
}
```

### Step 4: Verify

Run: `pnpm dev:thebest`

- Form shows 3 visible sections: Basics, Pricing (simple), When (single date)
- Cancellation and Extras sections are collapsed with summary text
- "Advanced pricing" toggle reveals full pricing model selector
- "Recurring schedule" toggle switches to weekly mode
- Collapsed sections expand/collapse with chevron rotation
- Checkmarks appear when sections have valid data
- Sticky submit bar stays visible on scroll
- Creating a tour with a single date creates both the tour and a slot

### Step 5: Commit

```bash
git add apps/thebest/src/routes/guide/tours/new/ apps/thebest/src/lib/messages/
git commit -m "feat(thebest): tour creation form with progressive disclosure"
```

---

## Task 5: Final pass — typecheck and verify

### Step 1: Run typecheck

```bash
pnpm check
```

Fix any TypeScript errors.

### Step 2: Run tests

```bash
pnpm test
```

Fix any failing tests.

### Step 3: Manual smoke test

Run `pnpm dev:thebest` and verify all 4 features work together:
1. Dashboard shows full-width calendar with all tours
2. Tours listing has search + filter, shows booking counts
3. Bookings table has search + filter + view/contact/cancel actions
4. Tour creation form has progressive disclosure with sticky submit

### Step 4: Commit any fixes

```bash
git add -A
git commit -m "fix(thebest): typecheck and test fixes for guide panel UX v2"
```
