<!--
  MobileWeek — touch-first 7-day overview.

  Compact week grid with day columns. Each day shows a condensed
  list of events. Tap a day to drill into MobileDay. Swipe
  left/right to navigate weeks.
-->
<script lang="ts">
	import { getContext } from 'svelte';
	import { createClock } from '../../core/clock.svelte.js';
	import type { TimelineEvent } from '../../core/types.js';
	import type { ViewState } from '../../engine/view-state.svelte.js';
	import { DAY_MS, sod, isAllDay, isMultiDay } from '../../core/time.js';
	import { startOfWeek as sowFn } from '../../core/time.js';
	import { fmtTime as _fmtTime, weekdayShort, getLabels } from '../../core/locale.js';

	const L = $derived(getLabels());

	interface Props {
		mondayStart?: boolean;
		locale?: string;
		height?: number | null;
		events?: TimelineEvent[];
		style?: string;
		focusDate?: Date;
		oneventclick?: (event: TimelineEvent) => void;
		oneventcreate?: (range: { start: Date; end: Date }) => void;
		selectedEventId?: string | null;
		readOnly?: boolean;
		[key: string]: unknown;
	}

	let {
		mondayStart = true,
		locale,
		height = null,
		events = [],
		style = '',
		focusDate,
		oneventclick,
		oneventcreate,
		selectedEventId = null,
		readOnly = false,
	}: Props = $props();

	// ── Context ────────────────────────────────────────
	const viewState = getContext<ViewState>('calendar:viewState') as ViewState | undefined;
	const loadRangeCtx = getContext<{ current: { start: Date; end: Date } | null; set: (r: { start: Date; end: Date } | null) => void }>('calendar:loadRange') as { current: { start: Date; end: Date } | null; set: (r: { start: Date; end: Date } | null) => void } | undefined;
	const equalDaysCtx = getContext<{ current: boolean }>('calendar:equalDays') as { current: boolean } | undefined;
	const showDatesCtx = getContext<{ current: boolean }>('calendar:showDates') as { current: boolean } | undefined;
	const hideDaysCtx = getContext<{ current: number[] | undefined }>('calendar:hideDays') as { current: number[] | undefined } | undefined;
	const callbacksCtx = getContext<{ oneventhover?: (event: TimelineEvent) => void }>('calendar:callbacks') as { oneventhover?: (event: TimelineEvent) => void } | undefined;
	const disabledDatesCtx = getContext<{ current: Date[] | undefined }>('calendar:disabledDates') as { current: Date[] | undefined } | undefined;
	const autoHeightCtx = getContext<{ current: boolean }>('calendar:autoHeight') as { current: boolean } | undefined;

	const equalDays = $derived(equalDaysCtx?.current ?? false);
	const autoHeight = $derived(autoHeightCtx?.current ?? false);
	const showDates = $derived(showDatesCtx?.current ?? true);
	const hideDays = $derived(hideDaysCtx?.current);
	const oneventhover = $derived(callbacksCtx?.oneventhover);
	const disabledDates = $derived(disabledDatesCtx?.current);
	const disabledSet = $derived(new Set(disabledDates?.map(d => sod(d.getTime())) ?? []));

	const clock = createClock();

	// ── Config ─────────────────────────────────────────
	const MAX_EVENTS = 3;
	const customDays = $derived(viewState?.dayCount ?? 7);

	// ── Derived week data ──────────────────────────────
	const todayMs = $derived(clock.today);
	const focusMs = $derived(focusDate ? sod(focusDate.getTime()) : todayMs);

	const weekStart = $derived(
		customDays === 7
			? sowFn(focusMs, mondayStart)
			: sod(focusMs)
	);

	// ── Load range ─────────────────────────────────────
	$effect(() => {
		if (!loadRangeCtx) return;
		const rangeStart = new Date(weekStart - 7 * DAY_MS);
		const rangeEnd = new Date(weekStart + (customDays + 7) * DAY_MS);
		loadRangeCtx.set({ start: rangeStart, end: rangeEnd });
		return () => loadRangeCtx.set(null);
	});

	// ── Day cells ──────────────────────────────────────
	interface DayCell {
		ms: number;
		dayNum: number;
		dayName: string;
		isToday: boolean;
		isPast: boolean;
		isDisabled: boolean;
		isWeekend: boolean;
		events: TimelineEvent[];
		allDayCount: number;
		totalCount: number;
	}

	const dayCells = $derived.by(() => {
		const result: DayCell[] = [];
		const hideSet = new Set(hideDays ?? []);

		for (let i = 0; i < customDays; i++) {
			const ms = weekStart + i * DAY_MS;
			const d = new Date(ms);
			const jsDay = d.getDay();
			const isoDay = jsDay === 0 ? 7 : jsDay;

			if (hideSet.has(isoDay)) continue;

			const isToday = ms === todayMs;
			const isPast = equalDays ? false : ms < todayMs;
			const isWeekend = jsDay === 0 || jsDay === 6;
			const isDisabled = disabledSet.has(ms);
			const dayEnd = ms + DAY_MS;

			const dayEvents = events
				.filter(ev => ev.start.getTime() < dayEnd && ev.end.getTime() > ms)
				.sort((a, b) => a.start.getTime() - b.start.getTime());

			const allDayCount = dayEvents.filter(ev => isAllDay(ev) || isMultiDay(ev)).length;

			result.push({
				ms,
				dayNum: d.getDate(),
				dayName: weekdayShort(ms, locale),
				isToday,
				isPast,
				isDisabled,
				isWeekend,
				events: dayEvents,
				allDayCount,
				totalCount: dayEvents.length,
			});
		}
		return result;
	});

	// ── Format helpers ─────────────────────────────────
	function fmtTime(d: Date): string {
		return _fmtTime(d, locale);
	}

	// ── Touch swipe ────────────────────────────────────
	let touchStartX = 0;
	let touchStartY = 0;
	let swiping = false;
	let swipeOffset = $state(0);
	const SWIPE_THRESHOLD = 60;

	function onTouchStart(e: TouchEvent) {
		const t = e.touches[0];
		touchStartX = t.clientX;
		touchStartY = t.clientY;
		swiping = true;
		swipeOffset = 0;
	}

	function onTouchMove(e: TouchEvent) {
		if (!swiping) return;
		const t = e.touches[0];
		const dx = t.clientX - touchStartX;
		const dy = t.clientY - touchStartY;
		if (Math.abs(dy) > Math.abs(dx) * 0.8) { swiping = false; return; }
		swipeOffset = dx;
	}

	function onTouchEnd() {
		if (!swiping) { swipeOffset = 0; return; }
		if (Math.abs(swipeOffset) > SWIPE_THRESHOLD) {
			if (swipeOffset > 0) {
				viewState?.prev();
			} else {
				viewState?.next();
			}
		}
		swipeOffset = 0;
		swiping = false;
	}

	// ── Day tap → switch to day mode ───────────────────
	function handleDayTap(dayMs: number) {
		if (viewState) {
			viewState.setFocusDate(new Date(dayMs));
			// Switch to day-mobile view if available
			const currentView = viewState.view;
			const dayView = currentView.replace('week', 'day');
			viewState.setView(dayView);
		}
	}
</script>

<div
	class="mw"
	class:mw--auto={autoHeight}
	style={style || undefined}
	style:height={autoHeight ? undefined : (height ? `${height}px` : '100%')}
	role="region"
	aria-label={L.weekAhead}
	ontouchstart={onTouchStart}
	ontouchmove={onTouchMove}
	ontouchend={onTouchEnd}
>
	<!-- Vertical day list -->
	<div class="mw-list" role="list">
		{#each dayCells as cell (cell.ms)}
			<button
				class="mw-row"
				class:mw-row--today={cell.isToday}
				class:mw-row--past={cell.isPast}
				class:mw-row--weekend={cell.isWeekend}
				class:mw-row--disabled={cell.isDisabled}
				onclick={() => handleDayTap(cell.ms)}
				aria-label="{cell.dayName} {cell.dayNum}"
			>
				<!-- Date column -->
				<div class="mw-date">
					<span class="mw-day-name" class:mw-day-name--today={cell.isToday}>{cell.dayName}</span>
					{#if showDates}
						<span class="mw-day-num" class:mw-day-num--today={cell.isToday}>{cell.dayNum}</span>
					{/if}
				</div>

				<!-- Events column -->
				<div class="mw-events">
					{#if cell.events.length === 0}
						<span class="mw-empty">{L.noEvents}</span>
					{:else}
						{#each cell.events.slice(0, MAX_EVENTS) as ev (ev.id)}
							<div
								class="mw-ev"
								class:mw-ev--selected={selectedEventId === ev.id}
								class:mw-ev--allday={isAllDay(ev) || isMultiDay(ev)}
								class:mw-ev--current={!isAllDay(ev) && !isMultiDay(ev) && ev.start.getTime() <= clock.tick && ev.end.getTime() > clock.tick}
								class:mw-ev--cancelled={ev.status === 'cancelled'}
								class:mw-ev--tentative={ev.status === 'tentative'}
								style:--ev-color={ev.color ?? 'var(--dt-accent)'}
								role="button"
								tabindex="0"
								onclick={(e) => { e.stopPropagation(); oneventclick?.(ev); }}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); oneventclick?.(ev); } }}
								onpointerenter={() => oneventhover?.(ev)}
							>
								<span class="mw-ev-stripe"></span>
								<div class="mw-ev-body">
									<span class="mw-ev-title">{ev.title}</span>
									{#if isAllDay(ev) || isMultiDay(ev)}
										<span class="mw-ev-time">{L.allDay}</span>
									{:else}
										<span class="mw-ev-time">{fmtTime(ev.start)}</span>
									{/if}
								</div>
							</div>
						{/each}
						{#if cell.totalCount > MAX_EVENTS}
							<span class="mw-ev-more">{L.nMore(cell.totalCount - MAX_EVENTS)}</span>
						{/if}
					{/if}
				</div>

				<!-- Chevron -->
				<svg class="mw-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
			</button>
		{/each}
	</div>
</div>

<style>
	/* ─── Container ──────────────────────────────────── */
	.mw {
		position: relative;
		display: flex;
		flex-direction: column;
		user-select: none;
		font-variant-numeric: tabular-nums;
		overflow: hidden;
		background: var(--dt-bg, #fff);
		-webkit-tap-highlight-color: transparent;
	}
	.mw--auto { overflow: visible; }

	/* ─── Scrollable day list ────────────────────────── */
	.mw-list {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: thin;
		scrollbar-color: var(--dt-scrollbar, rgba(0, 0, 0, 0.08)) transparent;
	}
	.mw--auto .mw-list { overflow-y: visible; }

	/* ─── Day row ────────────────────────────────────── */
	.mw-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: background 120ms;
		text-align: left;
		width: 100%;
		-webkit-tap-highlight-color: transparent;
		border-bottom: 1px solid var(--dt-border, rgba(0, 0, 0, 0.06));
		min-height: 56px;
	}
	.mw-row:last-child {
		border-bottom: none;
	}
	.mw-row:active {
		background: color-mix(in srgb, var(--dt-accent, #2563eb) 6%, transparent);
	}
	.mw-row--today {
		background: color-mix(in srgb, var(--dt-accent, #2563eb) 4%, transparent);
	}
	.mw-row--past {
		opacity: 0.5;
	}
	.mw-row--disabled {
		opacity: 0.3;
		pointer-events: none;
	}

	/* ─── Date column ────────────────────────────────── */
	.mw-date {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 40px;
		flex-shrink: 0;
		gap: 2px;
	}

	.mw-day-name {
		font: 600 10px/1 var(--dt-sans, system-ui, sans-serif);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--dt-text-3, rgba(0, 0, 0, 0.38));
	}
	.mw-day-name--today {
		color: var(--dt-accent, #2563eb);
	}

	.mw-day-num {
		font: 700 18px/1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text, rgba(0, 0, 0, 0.87));
	}
	.mw-day-num--today {
		background: var(--dt-accent, #2563eb);
		color: var(--dt-btn-text, #fff);
		width: 30px;
		height: 30px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		font-size: 15px;
	}

	/* ─── Events column ──────────────────────────────── */
	.mw-events {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.mw-empty {
		font: 400 12px/1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text-3, rgba(0, 0, 0, 0.25));
		font-style: italic;
	}

	/* ─── Event chip ─────────────────────────────────── */
	.mw-ev {
		display: flex;
		align-items: center;
		gap: 0;
		border-radius: 6px;
		background: color-mix(in srgb, var(--ev-color) 10%, var(--dt-surface, #f9fafb));
		overflow: hidden;
		cursor: pointer;
		transition: background 120ms;
		-webkit-tap-highlight-color: transparent;
		border: none;
		text-align: left;
		padding: 0;
	}
	.mw-ev:active {
		background: color-mix(in srgb, var(--ev-color) 20%, var(--dt-surface, #f9fafb));
	}
	.mw-ev--selected {
		box-shadow: 0 0 0 1.5px var(--ev-color);
	}
	.mw-ev--current {
		background: color-mix(in srgb, var(--ev-color) 16%, var(--dt-surface, #f9fafb));
	}
	.mw-ev--allday {
		background: color-mix(in srgb, var(--ev-color) 14%, var(--dt-surface, #f9fafb));
	}
	.mw-ev--cancelled {
		opacity: 0.5;
	}
	.mw-ev--cancelled .mw-ev-title {
		text-decoration: line-through;
	}
	.mw-ev--tentative {
		opacity: 0.65;
		border: 1px dashed color-mix(in srgb, var(--ev-color) 35%, transparent);
	}

	.mw-ev-stripe {
		width: 3px;
		align-self: stretch;
		background: var(--ev-color, var(--dt-accent));
		flex-shrink: 0;
		border-radius: 6px 0 0 6px;
	}

	.mw-ev-body {
		flex: 1;
		min-width: 0;
		padding: 5px 8px;
		display: flex;
		align-items: baseline;
		gap: 6px;
	}

	.mw-ev-title {
		font: 500 12px/1.2 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text, rgba(0, 0, 0, 0.87));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
		min-width: 0;
	}

	.mw-ev-time {
		font: 400 11px/1 var(--dt-mono, ui-monospace, monospace);
		color: var(--dt-text-3, rgba(0, 0, 0, 0.38));
		white-space: nowrap;
		flex-shrink: 0;
	}

	.mw-ev-more {
		font: 400 11px/1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text-3, rgba(0, 0, 0, 0.38));
		padding: 2px 0;
	}

	/* ─── Chevron ────────────────────────────────────── */
	.mw-chevron {
		flex-shrink: 0;
		color: var(--dt-text-3, rgba(0, 0, 0, 0.2));
	}

	/* ─── Focus ──────────────────────────────────────── */
	.mw-row:focus-visible {
		outline: 2px solid var(--dt-accent, #2563eb);
		outline-offset: -2px;
	}
	.mw-ev:focus-visible {
		outline: 2px solid var(--ev-color, var(--dt-accent));
		outline-offset: 1px;
	}
</style>
