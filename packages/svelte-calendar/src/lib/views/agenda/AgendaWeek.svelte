<script lang="ts">
	/**
	 * AgendaWeek — rolling N-day agenda view.
	 *
	 * "The Week Ahead":
	 *   Today + tomorrow expanded with time slots/countdowns.
	 *   Future days compact (dot + time + title).
	 *   Past days dimmed.
	 *
	 * Answers: "What's coming up and when do I need to be ready?"
	 */
	import { getContext, type Snippet } from 'svelte';
	import { createClock } from '../../core/clock.svelte.js';
	import type { TimelineEvent } from '../../core/types.js';
	import { sod, DAY_MS, startOfWeek, dayNum, isAllDay, isMultiDay } from '../../core/time.js';
	import { weekdayLong, monthLong, fmtTime as _fmtTime, fmtDuration, getLabels } from '../../core/locale.js';
	import type { ViewState } from '../../engine/view-state.svelte.js';

	const L = $derived(getLabels());

	interface Props {
		mondayStart?: boolean;
		locale?: string;
		height?: number;
		events?: TimelineEvent[];
		style?: string;
		focusDate?: Date;
		oneventclick?: (event: TimelineEvent) => void;
		selectedEventId?: string | null;
		[key: string]: unknown;
	}

	let {
		mondayStart = true,
		locale,
		height = 520,
		events = [],
		style = '',
		focusDate,
		oneventclick,
		selectedEventId = null,
	}: Props = $props();

	const clock = createClock();
	const viewState = getContext<ViewState>('calendar:viewState') as ViewState | undefined;
	const showNavCtx = getContext<{ current: boolean }>('calendar:showNavigation') as { current: boolean } | undefined;
	const equalDaysCtx = getContext<{ current: boolean }>('calendar:equalDays') as { current: boolean } | undefined;
	const showDatesCtx = getContext<{ current: boolean }>('calendar:showDates') as { current: boolean } | undefined;
	const hideDaysCtx = getContext<{ current: number[] | undefined }>('calendar:hideDays') as { current: number[] | undefined } | undefined;
	const mobileCtx = getContext<{ current: boolean }>('calendar:mobile') as { current: boolean } | undefined;
	const autoHeightCtx = getContext<{ current: boolean }>('calendar:autoHeight') as { current: boolean } | undefined;
	const showNav = $derived(showNavCtx?.current ?? true);
	const equalDays = $derived(equalDaysCtx?.current ?? false);
	const showDates = $derived(showDatesCtx?.current ?? true);
	const hideDays = $derived(hideDaysCtx?.current);
	const isMobile = $derived(mobileCtx?.current ?? false);
	const autoHeight = $derived(autoHeightCtx?.current ?? false);

	// ── Swipe navigation (mobile) ──────────────────────
	let swipeStartX = 0;
	let swipeStartY = 0;
	const SWIPE_THRESHOLD = 50;

	function onPointerDown(e: PointerEvent) {
		if (!isMobile) return;
		swipeStartX = e.clientX;
		swipeStartY = e.clientY;
	}

	function onPointerUp(e: PointerEvent) {
		if (!isMobile) return;
		const dx = e.clientX - swipeStartX;
		const dy = e.clientY - swipeStartY;
		if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.4) {
			if (dx > 0) viewState?.prev();
			else viewState?.next();
		}
	}

	// ── New feature contexts ──
	const dayHeaderSnippetCtx = getContext<{ current: Snippet<[{ date: Date; isToday: boolean; dayName: string }]> | undefined }>('calendar:dayHeaderSnippet') as { current: Snippet<[{ date: Date; isToday: boolean; dayName: string }]> | undefined } | undefined;
	const callbacksCtx = getContext<{ oneventhover?: (event: TimelineEvent) => void }>('calendar:callbacks') as { oneventhover?: (event: TimelineEvent) => void } | undefined;
	const disabledDatesCtx = getContext<{ current: Date[] | undefined }>('calendar:disabledDates') as { current: Date[] | undefined } | undefined;

	const dayHeaderSnippet = $derived(dayHeaderSnippetCtx?.current);
	const oneventhover = $derived(callbacksCtx?.oneventhover);
	const disabledDates = $derived(disabledDatesCtx?.current);
	const disabledSet = $derived(new Set(disabledDates?.map(d => sod(d.getTime())) ?? []));

	// ── Format helpers ──────────────────────────────────
	function fmtTime(d: Date): string {
		return _fmtTime(d, locale);
	}

	function duration(ev: TimelineEvent): string {
		return fmtDuration(ev.start, ev.end);
	}

	function timeUntilMs(ms: number): string {
		const diff = ms - clock.tick;
		if (diff <= 0) return L.now;
		const tMins = Math.floor(diff / 60000);
		if (tMins < 60) return `in ${tMins}m`;
		const hrs = Math.floor(tMins / 60);
		const rm = tMins % 60;
		if (hrs < 24) return rm > 0 ? `in ${hrs}h ${rm}m` : `in ${hrs}h`;
		const days = Math.floor(hrs / 24);
		return `in ${days}d`;
	}

	function progress(ev: TimelineEvent): number {
		const s = ev.start.getTime();
		const e = ev.end.getTime();
		return Math.min(1, Math.max(0, (clock.tick - s) / (e - s)));
	}

	// ── Overlap grouping ────────────────────────────────
	interface TimeSlot {
		startMs: number;
		endMs: number;
		events: TimelineEvent[];
	}

	function groupIntoSlots(evts: TimelineEvent[]): TimeSlot[] {
		const sorted = [...evts].sort((a, b) => a.start.getTime() - b.start.getTime());
		const slots: TimeSlot[] = [];
		for (const ev of sorted) {
			const last = slots[slots.length - 1];
			if (last && ev.start.getTime() < last.endMs) {
				last.events.push(ev);
				last.endMs = Math.max(last.endMs, ev.end.getTime());
			} else {
				slots.push({
					startMs: ev.start.getTime(),
					endMs: ev.end.getTime(),
					events: [ev],
				});
			}
		}
		return slots;
	}

	// ── Event handlers ──────────────────────────────────
	function handleClick(ev: TimelineEvent): void {
		oneventclick?.(ev);
	}

	function handleKeydown(e: KeyboardEvent, ev: TimelineEvent): void {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			oneventclick?.(ev);
		}
	}

	// ── Week derivations ────────────────────────────────
	type DayTier = 'today' | 'tomorrow' | 'upcoming' | 'past';

	interface DayGroup {
		ms: number;
		dayName: string;
		dateLabel: string;
		tier: DayTier;
		events: TimelineEvent[];
		allDayEvents: TimelineEvent[];
		timedEvents: TimelineEvent[];
		pastEvents: TimelineEvent[];
		currentEvents: TimelineEvent[];
		upcomingEvents: TimelineEvent[];
		totalHours: number;
	}

	const weekStartMs = $derived(
		focusDate
			? (viewState?.dayCount === 7
				? startOfWeek(sod(focusDate.getTime()), mondayStart)
				: sod(focusDate.getTime()))
			: (viewState?.dayCount === 7
				? startOfWeek(clock.today, mondayStart)
				: clock.today),
	);

	const customDays = $derived(viewState?.dayCount ?? 7);

	const isThisWeek = $derived(
		customDays === 7
			? weekStartMs === startOfWeek(clock.today, mondayStart)
			: clock.today >= weekStartMs && clock.today < weekStartMs + customDays * DAY_MS,
	);

	const weekDays = $derived.by((): DayGroup[] => {
		const now = clock.tick;
		const todayMs = clock.today;
		const tomorrowMs = todayMs + DAY_MS;
		const out: DayGroup[] = [];
		for (let i = 0; i < customDays; i++) {
			const ms = weekStartMs + i * DAY_MS;
			const dEnd = ms + DAY_MS;
			const dayEvts = events
				.filter((ev) => ev.start.getTime() < dEnd && ev.end.getTime() > ms)
				.sort((a, b) => a.start.getTime() - b.start.getTime());
			const allDayEvts = dayEvts.filter((ev) => isAllDay(ev) || isMultiDay(ev));
			const timedEvts = dayEvts.filter((ev) => !isAllDay(ev) && !isMultiDay(ev));
			const totalMinutes = timedEvts.reduce((sum, ev) => {
				const s = Math.max(ev.start.getTime(), ms);
				const e = Math.min(ev.end.getTime(), dEnd);
				return sum + (e - s) / 60000;
			}, 0);
			const pastEvents: TimelineEvent[] = [];
			const currentEvents: TimelineEvent[] = [];
			const upcomingEvents: TimelineEvent[] = [];
			for (const ev of timedEvts) {
				if (ev.end.getTime() <= now) pastEvents.push(ev);
				else if (ev.start.getTime() <= now && ev.end.getTime() > now) currentEvents.push(ev);
				else upcomingEvents.push(ev);
			}
			let tier: DayTier;
			if (equalDays) {
				tier = 'upcoming';
			} else if (ms === todayMs) {
				tier = 'today';
			} else if (ms === tomorrowMs) {
				tier = 'tomorrow';
			} else if (ms < todayMs) {
				tier = 'past';
			} else {
				tier = 'upcoming';
			}

			out.push({
				ms,
				dayName: weekdayLong(ms, locale),
				dateLabel: `${monthLong(ms, locale)} ${dayNum(ms)}`,
				tier,
				events: dayEvts,
				allDayEvents: allDayEvts,
				timedEvents: timedEvts,
				pastEvents,
				currentEvents,
				upcomingEvents,
				totalHours: Math.round((totalMinutes / 60) * 10) / 10,
			});
		}

		// Filter hidden days if hideDays is set
		if (hideDays?.length) {
			return out.filter((d) => {
				const jsDay = new Date(d.ms).getDay();
				const iso = jsDay === 0 ? 7 : jsDay;
				return !hideDays.includes(iso);
			});
		}

		return out;
	});
</script>

<!-- ═══ Shared event card snippet ═══ -->
{#snippet eventCard(ev: TimelineEvent, isNow: boolean, eta?: string)}
	<div
		class="ag-card"
		class:ag-card--selected={selectedEventId === ev.id}
		class:ag-card--cancelled={ev.status === 'cancelled'}
		class:ag-card--tentative={ev.status === 'tentative'}
		style:--ev-color={ev.color || 'var(--dt-accent)'}
		role="button"
		tabindex="0"
		aria-label="{ev.title}{ev.status === 'cancelled' ? ' (cancelled)' : ''}{ev.status === 'tentative' ? ' (tentative)' : ''}, {fmtTime(ev.start)} to {fmtTime(ev.end)}, {duration(ev)}"
		onclick={() => handleClick(ev)}
		onpointerenter={() => oneventhover?.(ev)}
		onkeydown={(e) => handleKeydown(e, ev)}
	>
		<div class="ag-card-body">
			<span class="ag-card-title">{ev.title}</span>
			{#if ev.subtitle}
				<span class="ag-card-sub">{ev.subtitle}</span>
			{/if}
			{#if ev.location}
				<span class="ag-card-loc">{ev.location}</span>
			{/if}
			<span class="ag-card-meta">
				{#if isNow}
					{L.until} {fmtTime(ev.end)}
				{:else}
					{fmtTime(ev.start)} – {fmtTime(ev.end)}
				{/if}
				<span class="ag-card-dur">{duration(ev)}</span>
				{#if eta}
					<span class="ag-card-eta">{eta}</span>
				{/if}
			</span>
			{#if ev.tags?.length}
				<div class="ag-card-tags">
					{#each ev.tags as tag}
						<span class="ag-card-tag">{tag}</span>
					{/each}
				</div>
			{/if}
			{#if isNow}
				<div class="ag-card-progress">
					<div class="ag-card-progress-fill" style:width="{progress(ev) * 100}%"></div>
				</div>
			{/if}
		</div>
	</div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="ag ag--week"
	class:ag--mobile={isMobile}
	class:ag--auto={autoHeight}
	style={style || undefined}
	onpointerdown={onPointerDown}
	onpointerup={onPointerUp}
>
	<div class="ag-body" role="list" aria-label={L.weekAhead}>
		{#each weekDays as day (day.ms)}
			{@const expanded = day.tier === 'today' || day.tier === 'tomorrow'}
			{#if day.tier === 'past'}
				<!-- Past day: single collapsed line -->
				<div class="ag-wday ag-wday--past" class:ag-wday--disabled={disabledSet.has(day.ms)} role="listitem">
					<div class="ag-wday-head">
						<div class="ag-wday-head-left">
							<span class="ag-wday-name">{day.dayName}</span>
						{#if showDates}<span class="ag-wday-date">{day.dateLabel}</span>{/if}
						</div>
						{#if dayHeaderSnippet}
							<div class="ag-wday-custom-header">
								{@render dayHeaderSnippet({ date: new Date(day.ms), isToday: false, dayName: day.dayName })}
							</div>
						{/if}
					</div>
				</div>
			{:else}
			<div
				class="ag-wday"
				class:ag-wday--today={day.tier === 'today'}
				class:ag-wday--tomorrow={day.tier === 'tomorrow'}
				class:ag-wday--equal={equalDays}
				class:ag-wday--disabled={disabledSet.has(day.ms)}
				role="listitem"
			>
				<!-- Day header -->
				<div class="ag-wday-head">
					<div class="ag-wday-head-left">
						{#if day.tier === 'today'}
						<span class="ag-wday-badge">{L.today}</span>
					{:else if day.tier === 'tomorrow'}
						<span class="ag-wday-badge ag-wday-badge--muted">{L.tomorrow}</span>
						{/if}
						<span class="ag-wday-name">{day.dayName}</span>
						{#if showDates}<span class="ag-wday-date">{day.dateLabel}</span>{/if}
					</div>
					{#if dayHeaderSnippet}
						<div class="ag-wday-custom-header">
							{@render dayHeaderSnippet({ date: new Date(day.ms), isToday: day.tier === 'today', dayName: day.dayName })}
						</div>
					{/if}
				</div>

				{#if day.allDayEvents.length > 0}
					<div class="ag-allday">
						{#each day.allDayEvents as ev (ev.id)}
							<div
								class="ag-allday-chip"
								class:ag-allday-chip--selected={selectedEventId === ev.id}
								style:--ev-color={ev.color || 'var(--dt-accent)'}
								role="button"
								tabindex="0"
								aria-label="{ev.title}, {L.allDay}"
								onclick={() => handleClick(ev)}
								onpointerenter={() => oneventhover?.(ev)}
								onkeydown={(e) => handleKeydown(e, ev)}
							>
								<span class="ag-allday-dot"></span>
								<span class="ag-allday-title">{ev.title}</span>
							</div>
						{/each}
					</div>
				{/if}

				{#if day.events.length === 0}
					<div class="ag-wday-empty">{L.noEvents}</div>
				{:else if equalDays}
					<!-- Equal days: card layout for all days, no time-relative badges -->
					<div class="ag-wday-expanded">
						{#each groupIntoSlots(day.timedEvents) as slot (slot.startMs)}
							<div class="ag-wslot">

								<div class="ag-wslot-cards" class:ag-wslot-cards--multi={slot.events.length > 1}>
									{#each slot.events as ev (ev.id)}
										{@render eventCard(ev, false)}
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{:else if expanded}
					<!-- Expanded: today/tomorrow get full slot treatment -->
					<div class="ag-wday-expanded">
						{#if day.currentEvents.length > 0}
							{#each day.currentEvents as ev (ev.id)}
								<div class="ag-wslot">
									<div class="ag-wslot-header">
									<span class="ag-wslot-now">{L.now}</span>
									</div>
									{@render eventCard(ev, true)}
								</div>
							{/each}
						{/if}
						{#each groupIntoSlots(day.upcomingEvents) as slot (slot.startMs)}
							<div class="ag-wslot">

								<div class="ag-wslot-cards" class:ag-wslot-cards--multi={slot.events.length > 1}>
									{#each slot.events as ev (ev.id)}
										{@render eventCard(ev, false, day.tier === 'today' ? timeUntilMs(ev.start.getTime()) : undefined)}
									{/each}
								</div>
							</div>
						{/each}
						{#if day.pastEvents.length > 0}
							<div class="ag-wday-past-line">✓ {L.nCompleted(day.pastEvents.length)}</div>
						{/if}
					</div>
				{:else}
					<!-- Compact: future days get minimal rows -->
					<div class="ag-wday-compact">
						{#each day.timedEvents.slice(0, 4) as ev (ev.id)}
							<div
								class="ag-compact"
								class:ag-compact--selected={selectedEventId === ev.id}
								class:ag-compact--cancelled={ev.status === 'cancelled'}
								class:ag-compact--tentative={ev.status === 'tentative'}
								style:--ev-color={ev.color || 'var(--dt-accent)'}
								role="button"
								tabindex="0"
								aria-label="{ev.title}, {fmtTime(ev.start)}, {duration(ev)}"
								onclick={() => handleClick(ev)}							onpointerenter={() => oneventhover?.(ev)}								onkeydown={(e) => handleKeydown(e, ev)}
							>
								<span class="ag-compact-dot"></span>
								<span class="ag-compact-time">{fmtTime(ev.start)}</span>
								<span class="ag-compact-title">{ev.title}</span>
								{#if ev.location}
									<span class="ag-compact-loc">{ev.location}</span>
								{/if}
								{#if ev.subtitle}
									<span class="ag-compact-sub">{ev.subtitle}</span>
								{/if}
								{#if ev.tags?.length}
									{#each ev.tags as tag}
										<span class="ag-compact-tag">{tag}</span>
									{/each}
								{/if}
								<span class="ag-compact-dur">{duration(ev)}</span>
							</div>
						{/each}
						{#if day.timedEvents.length > 4}
							<div class="ag-compact-more">{L.nMore(day.timedEvents.length - 4)}</div>
						{/if}
					</div>
				{/if}
			</div>
			{/if}
		{/each}
	</div>

	<!-- ── Floating nav pills (desktop only — mobile uses Calendar header) ── -->
	{#if showNav && !isMobile}
	<nav class="ag-nav" aria-label={L.weekNavigation}>
		<button
			class="ag-nav-pill ag-nav-today"
			class:ag-nav-today--hidden={isThisWeek}
			onclick={() => viewState?.goToday()}
			aria-label={L.goToToday}
			tabindex={isThisWeek ? -1 : 0}
		>
			{L.today}
		</button>
		<button
			class="ag-nav-pill"
			onclick={() => viewState?.prev()}
			aria-label={L.previousWeek}
		>
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>
		</button>
		<button
			class="ag-nav-pill"
			onclick={() => viewState?.next()}
			aria-label={L.nextWeek}
		>
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
		</button>
	</nav>
	{/if}
</div>

<style>
	/* ═══ Floating nav pills ═══ */
	.ag-nav {
		position: absolute;
		top: 10px;
		right: 14px;
		z-index: 20;
		display: flex;
		gap: 2px;
		background: color-mix(in srgb, var(--dt-surface, #10141c) 85%, transparent);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		border-radius: 8px;
		padding: 2px;
		border: 1px solid var(--dt-border, rgba(148, 163, 184, 0.07));
	}
	.ag-nav-pill {
		border: none;
		background: transparent;
		color: var(--dt-text-2, rgba(148, 163, 184, 0.55));
		cursor: pointer;
		font: 600 11px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		padding: 6px 12px;
		border-radius: 6px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition: background 100ms, color 100ms;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.ag-nav-pill:hover {
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
	}
	.ag-nav-today {
		max-width: 60px;
		overflow: hidden;
		white-space: nowrap;
		transition: max-width 250ms ease, padding 250ms ease, opacity 200ms ease;
	}
	.ag-nav-today--hidden {
		max-width: 0;
		padding-left: 0;
		padding-right: 0;
		opacity: 0;
		pointer-events: none;
	}
	.ag-nav-pill:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--dt-accent, #ef4444) 55%, transparent);
		outline-offset: 2px;
	}

	/* ═══ Container ═══ */
	.ag {
		position: relative;
		overflow: hidden;
		user-select: none;
		display: flex;
		flex-direction: column;
		height: 100%;
		color: var(--dt-text, rgba(255, 255, 255, 0.92));
		font-family: var(--dt-sans, system-ui, sans-serif);
	}
	.ag--auto {
		height: auto;
		overflow: visible;
	}

	/* ═══ Body ═══ */
	.ag-body {
		flex: 1;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--dt-border) transparent;
	}
	.ag--auto .ag-body {
		overflow-y: visible;
	}
	.ag-body::-webkit-scrollbar {
		width: 4px;
	}
	.ag-body::-webkit-scrollbar-thumb {
		background: var(--dt-border);
		border-radius: 2px;
	}

	/* ═══ All-day chips ═══ */
	.ag-allday {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 4px 14px 6px;
	}
	.ag-allday-chip {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 5px;
		background: color-mix(in srgb, var(--ev-color) 12%, var(--dt-surface, #10141c));
		border: 1px solid color-mix(in srgb, var(--ev-color) 18%, transparent);
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}
	.ag-allday-chip:hover {
		background: color-mix(in srgb, var(--ev-color) 22%, var(--dt-surface, #10141c));
		border-color: color-mix(in srgb, var(--ev-color) 30%, transparent);
	}
	.ag-allday-chip:focus-visible {
		outline: 2px solid var(--dt-accent, #ff6b4a);
		outline-offset: 2px;
	}
	.ag-allday-chip--selected {
		border-color: var(--ev-color);
		background: color-mix(in srgb, var(--ev-color) 18%, var(--dt-surface, #10141c));
	}
	.ag-allday-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ev-color);
		flex-shrink: 0;
	}
	.ag-allday-title {
		font: 500 0.7rem/1.2 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
		white-space: nowrap;
	}

	/* ═══ Shared: event card ═══ */
	.ag-card {
		display: flex;
		align-items: stretch;
		border-radius: 6px;
		background: color-mix(in srgb, var(--ev-color) 12%, var(--dt-surface, #191919));
		border: 1px solid color-mix(in srgb, var(--ev-color) 8%, var(--dt-border, rgba(255, 255, 255, 0.06)));
		overflow: hidden;
		cursor: pointer;
		transition: background 150ms, border-color 150ms;
	}
	.ag-card:hover {
		background: color-mix(in srgb, var(--ev-color) 20%, var(--dt-surface, #191919));
		border-color: color-mix(in srgb, var(--ev-color) 30%, transparent);
	}
	.ag-card:focus-visible {
		outline: 2px solid var(--dt-accent, #ff6b4a);
		outline-offset: 2px;
	}
	.ag-card--selected {
		border-color: var(--ev-color);
		background: color-mix(in srgb, var(--ev-color) 20%, var(--dt-surface, #191919));
	}
	.ag-card--cancelled {
		opacity: 0.5;
	}
	.ag-card--cancelled .ag-card-title {
		text-decoration: line-through;
	}
	.ag-card--tentative {
		opacity: 0.65;
		border-style: dashed;
	}
	.ag-card-body {
		padding: 7px 10px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}
	.ag-card-title {
		font-size: 13px;
		font-weight: 600;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
	}
	.ag-card-meta {
		display: flex;
		align-items: center;
		font-size: 11px;
		color: var(--dt-text-2, rgba(255, 255, 255, 0.5));
		font-family: var(--dt-mono, monospace);
		line-height: 1;
	}
	.ag-card-dur {
		margin-left: 6px;
		color: var(--dt-text-3, rgba(255, 255, 255, 0.3));
	}
	.ag-card-eta {
		margin-left: auto;
		font-size: 10px;
		font-weight: 600;
		color: color-mix(in srgb, var(--ev-color) 80%, var(--dt-text));
		opacity: 0.85;
		letter-spacing: 0.02em;
	}
	.ag-card-sub {
		font-size: 11px;
		color: var(--dt-text-2, rgba(255, 255, 255, 0.45));
		line-height: 1;
	}
	.ag-card-loc {
		font-size: 10px;
		color: var(--dt-text-3, rgba(255, 255, 255, 0.35));
		line-height: 1;
	}
	.ag-card-tags {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}
	.ag-card-tag {
		font: 500 9px / 1 var(--dt-sans, system-ui, sans-serif);
		color: var(--ev-color, var(--dt-accent));
		background: color-mix(in srgb, var(--ev-color, var(--dt-accent)) 15%, transparent);
		padding: 2px 5px;
		border-radius: 3px;
		white-space: nowrap;
	}
	.ag-card-progress {
		height: 3px;
		background: var(--dt-border, rgba(255, 255, 255, 0.06));
		border-radius: 2px;
		overflow: hidden;
		margin-top: 2px;
	}
	.ag-card-progress-fill {
		height: 100%;
		background: var(--ev-color, var(--dt-accent));
		border-radius: 2px;
		transition: width 1s linear;
	}

	/* ═══ Week day groups ═══ */
	.ag-wday {
		border-bottom: 1px solid var(--dt-border, rgba(255, 255, 255, 0.06));
	}
	.ag-wday--today {
		background: color-mix(in srgb, var(--dt-accent, #ff6b4a) 2%, transparent);
	}
	.ag-wday--tomorrow .ag-card {
		opacity: 0.82;
	}
	.ag-wday--past {
		opacity: 0.4;
	}
	.ag-wday--past .ag-wday-head {
		padding: 8px 20px;
	}
	.ag-wday--disabled {
		opacity: 0.35;
		pointer-events: none;
		position: relative;
	}
	.ag-wday--disabled::after {
		content: '';
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			135deg,
			transparent,
			transparent 4px,
			rgba(128, 128, 128, 0.08) 4px,
			rgba(128, 128, 128, 0.08) 8px
		);
		pointer-events: none;
	}
	.ag-wday-custom-header {
		padding: 2px 0 4px;
	}

	.ag-wday-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 20px;
	}
	.ag-wday-head-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.ag-wday-badge {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--dt-accent, #ff6b4a);
		background: color-mix(in srgb, var(--dt-accent, #ff6b4a) 12%, transparent);
		padding: 2px 7px;
		border-radius: 3px;
	}
	.ag-wday-badge--muted {
		color: var(--dt-text-2, rgba(255, 255, 255, 0.5));
		background: color-mix(
			in srgb,
			var(--dt-text-2, rgba(255, 255, 255, 0.5)) 10%,
			transparent
		);
	}
	.ag-wday-name {
		font-size: 13px;
		font-weight: 600;
	}
	.ag-wday-date {
		font-size: 11px;
		font-family: var(--dt-mono, monospace);
		color: var(--dt-text-3, rgba(255, 255, 255, 0.3));
	}

	.ag-wday-empty {
		padding: 2px 20px 10px;
		font-size: 11px;
		color: var(--dt-text-3, rgba(255, 255, 255, 0.2));
		font-style: italic;
	}

	/* Expanded day */
	.ag-wday-expanded {
		padding: 0 20px 10px;
	}
	.ag-wslot {
		margin-bottom: 4px;
	}
	.ag-wslot-header {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 2px 0;
	}
	.ag-wslot-now {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--dt-accent, #ff6b4a);
	}
	.ag-wslot-cards {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.ag-wslot-cards--multi {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 4px;
	}
	.ag-wday-past-line {
		font-size: 10px;
		color: var(--dt-text-3, rgba(255, 255, 255, 0.3));
		padding: 6px 0 0;
		opacity: 0.5;
	}

	/* Compact day events */
	.ag-wday-compact {
		padding: 0 20px 10px;
	}
	.ag-compact {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
		cursor: pointer;
	}
	.ag-compact--selected {
		background: color-mix(in srgb, var(--ev-color) 10%, transparent);
		border-radius: 4px;
		padding-left: 6px;
		padding-right: 6px;
	}
	.ag-compact:hover .ag-compact-title {
		color: var(--dt-text);
	}
	.ag-compact:focus-visible {
		outline: 2px solid var(--dt-accent, #ff6b4a);
		outline-offset: 2px;
	}
	.ag-compact-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ev-color, var(--dt-accent));
		flex-shrink: 0;
	}
	.ag-compact-time {
		font-size: 11px;
		font-family: var(--dt-mono, monospace);
		color: var(--dt-text-2, rgba(255, 255, 255, 0.5));
		min-width: 64px;
		flex-shrink: 0;
	}
	.ag-compact-title {
		font-size: 12px;
		font-weight: 500;
		color: var(--dt-text-2, rgba(255, 255, 255, 0.5));
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 150ms;
	}
	.ag-compact-dur {
		font-size: 10px;
		font-family: var(--dt-mono, monospace);
		color: var(--dt-text-3, rgba(255, 255, 255, 0.3));
		flex-shrink: 0;
	}
	.ag-compact-sub {
		font-size: 10px;
		color: var(--dt-text-3, rgba(255, 255, 255, 0.35));
		flex-shrink: 0;
	}
	.ag-compact-loc {
		font-size: 9px;
		color: var(--dt-text-3, rgba(255, 255, 255, 0.3));
		flex-shrink: 0;
		white-space: nowrap;
	}
	.ag-compact--cancelled {
		opacity: 0.5;
	}
	.ag-compact--cancelled .ag-compact-title {
		text-decoration: line-through;
	}
	.ag-compact--tentative {
		opacity: 0.65;
	}
	.ag-compact-tag {
		font: 500 8px / 1 var(--dt-sans, system-ui, sans-serif);
		color: var(--ev-color, var(--dt-accent));
		background: color-mix(in srgb, var(--ev-color, var(--dt-accent)) 12%, transparent);
		padding: 1px 4px;
		border-radius: 3px;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.ag-compact-more {
		font-size: 11px;
		color: var(--dt-text-3);
		padding: 2px 0 0 13px;
	}

	/* ═══ Mobile adaptations ═══ */
	.ag--mobile .ag-wday-head {
		padding: 12px 16px;
	}
	.ag--mobile .ag-wday-expanded {
		padding: 0 16px 12px;
	}
	.ag--mobile .ag-wday-compact {
		padding: 0 16px 12px;
	}
	.ag--mobile .ag-card-body {
		padding: 12px 14px;
	}
	.ag--mobile .ag-card-title {
		font-size: 14px;
	}
	.ag--mobile .ag-compact {
		padding: 8px 0;
	}
	.ag--mobile .ag-compact-title {
		font-size: 14px;
	}
	.ag--mobile .ag-compact-time {
		font-size: 12px;
	}
	.ag--mobile .ag-nav-pill {
		padding: 10px 16px;
	}
	.ag--mobile .ag-wslot-cards--multi {
		grid-template-columns: 1fr;
	}
</style>
