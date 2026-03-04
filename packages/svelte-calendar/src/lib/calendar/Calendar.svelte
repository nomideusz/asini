<!--
  Calendar — the unified orchestrator.

  Brings together: adapter → event store → view state + selection → active view.
  Provides context so any descendant view can read the store/state via getContext().

  Usage (minimal):
    <Calendar adapter={myAdapter} theme={neutral} />

  Usage (full control):
    <Calendar
      adapter={myAdapter}
      view="week-planner"
      theme={midnight}
      height={600}
      oneventclick={handleClick}
      oneventcreate={handleCreate}
    />
-->
<script lang="ts">
	import { setContext, untrack, type Component, type Snippet } from 'svelte';
	import type { CalendarAdapter } from '../adapters/types.js';
	import type { CalendarViewId } from '../engine/view-state.svelte.js';
	import { createEventStore, type EventStore } from '../engine/event-store.svelte.js';
	import { createViewState, type ViewState } from '../engine/view-state.svelte.js';
	import { createSelection, type Selection } from '../engine/selection.svelte.js';
	import { createDragState, type DragState } from '../engine/drag.svelte.js';
	import { onMount } from 'svelte';
	import type { TimelineEvent, BlockedSlot } from '../core/types.js';
	import { getLabels } from '../core/locale.js';
	import { auto } from '../theme/presets.js';
	import { probeHostTheme, observeHostTheme } from '../theme/auto.js';
	import type { AutoThemeOptions } from '../theme/auto.js';
	import Planner from '../views/planner/Planner.svelte';
	import Agenda from '../views/agenda/Agenda.svelte';
	import Mobile from '../views/mobile/Mobile.svelte';

	/** Breakpoint (px) at which auto-mobile activates */
	const MOBILE_BREAKPOINT = 768;

	/** One view registration */
	export interface CalendarView {
		id: CalendarViewId;
		label: string;
		/** day or week */
		mode: 'day' | 'week';
		/** The Svelte component to render */
		component: Component<Record<string, unknown>>;
		/** Extra props to pass through (e.g. hourHeight, specialized settings) */
		props?: Record<string, unknown>;
	}

	interface Props {
		/** Data adapter (required) */
		adapter: CalendarAdapter;
		/** Registered views */
		views?: CalendarView[];
		/** Active view ID (defaults to first registered view) */
		view?: CalendarViewId;
		/** CSS theme string (--dt-* inline style) */
		theme?: string;
		/**
		 * Options for the smart auto-theme.
		 * When theme is `auto` (empty string), the calendar probes the host page
		 * and generates matching --dt-* vars automatically.
		 *
		 * Pass `{ mode, accent, font }` to override individual aspects.
		 * Set `autoTheme: false` to disable probing entirely.
		 */
		autoTheme?: AutoThemeOptions | false;
		/** Start week on Monday */
		mondayStart?: boolean;
		/** Total height. Use `'auto'` to let content determine height (ideal for Agenda views). */
		height?: number | 'auto';
		/** Border radius in px (default: 12). Set to 0 for no rounding. */
		borderRadius?: number;
		/** Text direction: 'ltr' (default), 'rtl', or 'auto' */
		dir?: 'ltr' | 'rtl' | 'auto';
		/** BCP 47 locale tag (e.g. 'en-US', 'ar-SA') — sets lang and locale for formatting */
		locale?: string;
		/** Read-only mode: disables drag, resize, empty-slot creation */
		readOnly?: boolean;
		/** Visible hour range: [startHour, endHour). Crops the grid to these hours. */
		visibleHours?: [number, number];
		/** Initial date to focus on (defaults to today) */
		initialDate?: Date;
		/** Drag snap interval in minutes (default: 15) */
		snapInterval?: number;
		/** Show the Day/Week mode pills (default: true) */
		showModePills?: boolean;
		/** Show prev/next/today navigation controls (default: true) */
		showNavigation?: boolean;
		/** Treat all days equally — no past-day dimming or collapsing (default: false) */
		equalDays?: boolean;
		/** Hide date numbers — headers show only day names (Mon, Tue, …). Useful for template/recurring schedules. */
		showDates?: boolean;
		/** ISO weekdays to hide (1=Mon … 7=Sun). E.g. [6, 7] hides weekends. */
		hideDays?: number[];
		/** Controlled current date — drives which date the calendar focuses on. */
		currentDate?: Date;
		/** Blocked/unavailable time slots — rendered as hatched regions, prevent event creation. */
		blockedSlots?: BlockedSlot[];
		/** Number of days shown in week mode (default: 7). E.g. 3 for a 3-day view, 5 for workweek. */
		days?: number;
		/** Minimum event duration in minutes (enforced during drag-create and click-to-create). */
		minDuration?: number;
		/** Maximum event duration in minutes (enforced during drag-create). */
		maxDuration?: number;
		/** Specific dates to disable (greyed-out, no event creation). */
		disabledDates?: Date[];
		/**
		 * Mobile mode.
		 * - `'auto'` (default): detect via viewport width (< 768 px)
		 * - `true`: always use mobile views
		 * - `false`: never use mobile views
		 */
		mobile?: 'auto' | boolean;

		// ── Snippets ──
		/** Custom event rendering snippet */
		event?: Snippet<[TimelineEvent]>;
		/** Content to show when no events are loaded */
		empty?: Snippet;
		/** Custom day header snippet. Receives { date, isToday, dayName }. */
		dayHeader?: Snippet<[{ date: Date; isToday: boolean; dayName: string }]>;

		// ── Callbacks ──
		oneventclick?: (event: TimelineEvent) => void;
		oneventcreate?: (range: { start: Date; end: Date }) => void;
		oneventmove?: (event: TimelineEvent, newStart: Date, newEnd: Date) => void;
		onviewchange?: (viewId: CalendarViewId) => void;
		/** Called when the focused date changes (navigation, drag-scroll, etc.) */
		ondatechange?: (date: Date) => void;
		/** Called when the pointer enters an event (hover). */
		oneventhover?: (event: TimelineEvent) => void;
	}

	// ── Built-in views (used when no custom views are provided) ──
	const DEFAULT_VIEWS: CalendarView[] = [
		{ id: 'day-planner',  label: 'Planner', mode: 'day',  component: Planner },
		{ id: 'week-planner', label: 'Planner', mode: 'week', component: Planner },
		{ id: 'day-agenda',   label: 'Agenda',  mode: 'day',  component: Agenda },
		{ id: 'week-agenda',  label: 'Agenda',  mode: 'week', component: Agenda },
		{ id: 'day-mobile',   label: 'Mobile',  mode: 'day',  component: Mobile },
		{ id: 'week-mobile',  label: 'Mobile',  mode: 'week', component: Mobile },
	];

	let {
		adapter,
		views = DEFAULT_VIEWS,
		view: activeViewId,
		theme = auto,
		autoTheme,
		mondayStart = true,
		height: heightProp = 600,
		borderRadius = 12,
		dir,
		locale,
		readOnly = false,
		visibleHours,
		initialDate,
		snapInterval = 15,
		showModePills = true,
		showNavigation = true,
		equalDays = false,
		showDates = true,
		hideDays,
		currentDate,
		blockedSlots,
		days,
		minDuration,
		maxDuration,
		disabledDates,
		mobile: mobileProp = 'auto',
		event: eventSnippet,
		empty: emptySnippet,
		dayHeader: dayHeaderSnippet,
		oneventclick,
		oneventcreate,
		oneventmove,
		onviewchange,
		ondatechange,
		oneventhover,
	}: Props = $props();

	// In readOnly mode, suppress mutation callbacks
	const effectiveCreate = $derived(readOnly ? undefined : oneventcreate);
	const effectiveMove = $derived(readOnly ? undefined : oneventmove);

	// ── Mobile detection ──
	let isMobileViewport = $state(false);

	onMount(() => {
		if (typeof window === 'undefined') return;
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		isMobileViewport = mql.matches;
		function onChange(e: MediaQueryListEvent) { isMobileViewport = e.matches; }
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	});

	const useMobile = $derived(
		mobileProp === 'auto' ? isMobileViewport : Boolean(mobileProp)
	);

	// ── Smart auto-theme ──
	// When theme is empty (auto preset) and autoTheme is not false,
	// probe the host page on mount and reactively watch for host theme changes.
	let calEl: HTMLElement | undefined = $state();
	let probedTheme = $state('');

	onMount(() => {
		if (!calEl) return;
		// Only probe when using the auto preset (empty string)
		const isAuto = theme === auto && autoTheme !== false;
		if (!isAuto) return;

		const opts: AutoThemeOptions = typeof autoTheme === 'object' ? autoTheme : {};
		return observeHostTheme(calEl, (vars) => { probedTheme = vars; }, opts);
	});

	/** Effective theme: user-provided takes priority, otherwise probed auto. */
	const effectiveTheme = $derived(theme === auto && autoTheme !== false ? probedTheme : theme);

	// ── Create reactive state ──
	const store: EventStore = $derived(createEventStore(adapter));
	const viewState: ViewState = createViewState(untrack(() => ({
		view: activeViewId ?? views[0]?.id,
		mondayStart,
		initialDate,
		dayCount: days,
		modeForView: (viewId) => views.find((v) => v.id === viewId)?.mode,
	})));
	const selection: Selection = createSelection();
	const drag: DragState = createDragState();

	// ── Drag commit handler ──
	// Views call this on pointer-up to process drag results.
	function commitDrag(): void {
		if (readOnly) { drag.cancel(); return; }
		const mode = drag.mode;
		const payload = drag.commit();
		if (!payload) return;

		let { start, end } = payload;

		// Enforce min/max duration for create and resize
		if (mode === 'create' || mode === 'resize-start' || mode === 'resize-end') {
			const durationMs = end.getTime() - start.getTime();
			const durationMin = durationMs / 60_000;
			if (minDuration && durationMin < minDuration) {
				if (mode === 'resize-start') {
					start = new Date(end.getTime() - minDuration * 60_000);
				} else {
					end = new Date(start.getTime() + minDuration * 60_000);
				}
			}
			if (maxDuration && durationMin > maxDuration) {
				if (mode === 'resize-start') {
					start = new Date(end.getTime() - maxDuration * 60_000);
				} else {
					end = new Date(start.getTime() + maxDuration * 60_000);
				}
			}
		}

		// Reject if target lands on a disabled date
		if (disabledDates?.length) {
			const startDay = new Date(start); startDay.setHours(0, 0, 0, 0);
			const endDay = new Date(end.getTime() - 1); endDay.setHours(0, 0, 0, 0);
			for (const dd of disabledDates) {
				const dt = new Date(dd); dt.setHours(0, 0, 0, 0);
				const ts = dt.getTime();
				if (ts >= startDay.getTime() && ts <= endDay.getTime()) return;
			}
		}

		// Reject if target overlaps a blocked slot
		if (blockedSlots?.length) {
			const startH = start.getHours() + start.getMinutes() / 60;
			const endH = end.getHours() + end.getMinutes() / 60 + (end.getDate() !== start.getDate() ? 24 : 0);
			const jsDay = start.getDay();
			const isoDay = jsDay === 0 ? 7 : jsDay;
			for (const slot of blockedSlots) {
				if (slot.day && slot.day !== isoDay) continue;
				if (startH < slot.end && endH > slot.start) return;
			}
		}

		if ((mode === 'move' || mode === 'resize-start' || mode === 'resize-end') && payload.eventId) {
			store.move(payload.eventId, start, end);
			const ev = store.byId(payload.eventId);
			if (ev) effectiveMove?.(ev, start, end);
		} else if (mode === 'create') {
			effectiveCreate?.({ start, end });
		}
	}

	// Context is set once at mount; engine objects hold $state internally
	// so consumers reading from them stay reactive automatically.
	// Wrap store in a getter since it's $derived and may change when adapter changes.
	setContext('calendar:store', { get current() { return store; } });
	setContext('calendar:viewState', viewState);
	setContext('calendar:selection', selection);
	setContext('calendar:drag', drag);
	setContext('calendar:commitDrag', commitDrag);
	// Callbacks: provide a getter-based object so context consumers
	// always see the latest callback references.
	setContext('calendar:callbacks', {
		get oneventclick() { return oneventclick; },
		get oneventcreate() { return effectiveCreate; },
		get oneventmove() { return effectiveMove; },
		get oneventhover() { return oneventhover; },
	});
	setContext('calendar:readOnly', { get current() { return readOnly; } });
	setContext('calendar:visibleHours', { get current() { return visibleHours; } });
	setContext('calendar:snapInterval', { get current() { return snapInterval; } });
	setContext('calendar:eventSnippet', { get current() { return eventSnippet; } });
	setContext('calendar:emptySnippet', { get current() { return emptySnippet; } });
	setContext('calendar:showNavigation', { get current() { return showNavigation; } });
	setContext('calendar:equalDays', { get current() { return equalDays; } });
	setContext('calendar:showDates', { get current() { return showDates; } });
	setContext('calendar:hideDays', { get current() { return hideDays; } });
	setContext('calendar:blockedSlots', { get current() { return blockedSlots; } });
	setContext('calendar:dayHeaderSnippet', { get current() { return dayHeaderSnippet; } });
	setContext('calendar:minDuration', { get current() { return minDuration; } });
	setContext('calendar:maxDuration', { get current() { return maxDuration; } });
	setContext('calendar:disabledDates', { get current() { return disabledDates; } });
	setContext('calendar:mobile', { get current() { return useMobile; } });
	setContext('calendar:autoHeight', { get current() { return heightProp === 'auto'; } });

	// ── Load range signal ──
	// Views can write a wider range here to override the default viewState.range.
	// This lets infinite-scroll views (PlannerWeek, PlannerDay) declare their
	// buffer needs without directly calling store.load().
	let viewLoadRange = $state<{ start: Date; end: Date } | null>(null);
	setContext('calendar:loadRange', {
		get current() { return viewLoadRange; },
		set(range: { start: Date; end: Date } | null) { viewLoadRange = range; },
	});

	// ── Load events when effective range changes ──
	$effect(() => {
		const range = viewLoadRange ?? viewState.range;
		store.load({ start: range.start, end: range.end });
	});

	// Keep active view in sync when external view prop changes after mount.
	$effect(() => {
		if (activeViewId) viewState.setView(activeViewId);
	});

	// Sync controlled currentDate prop → viewState
	$effect(() => {
		if (currentDate) viewState.setFocusDate(currentDate);
	});

	// Sync days prop → viewState.dayCount
	$effect(() => {
		if (days !== undefined && viewState.dayCount !== days) viewState.setDayCount(days);
	});

	// Notify host when focusDate changes
	$effect(() => {
		const d = viewState.focusDate;
		ondatechange?.(d);
	});

	// Keep view state's week-start rule in sync with incoming prop changes.
	$effect(() => {
		if (viewState.mondayStart !== mondayStart) {
			viewState.setMondayStart(mondayStart);
		}
	});

	// Notify host when active view changes (e.g. via mode toggles).
	$effect(() => {
		onviewchange?.(viewState.view);
	});

	// ── Resolve active view ──
	// When mobile is active, Planner views get remapped to Mobile variants.
	// Agenda views stay as Agenda — they're already list-based and will adapt
	// via the 'calendar:mobile' context flag.
	const resolvedView = $derived.by(() => {
		const requested = views.find((v) => v.id === viewState.view) ?? views[0];
		if (!useMobile || !requested) return requested;
		// Already a mobile view? Keep it.
		if (requested.id.endsWith('-mobile')) return requested;
		// Agenda views: keep as-is (they adapt internally via mobile context).
		if (requested.label === 'Agenda') return requested;
		// Planner / other views: remap to mobile variant with the same mode.
		const mobileVariant = views.find(
			(v) => v.id === `${requested.mode}-mobile`
		);
		return mobileVariant ?? requested;
	});

	// Backward-compat alias used in the template.
	const activeView = $derived(resolvedView);

	// Non-mobile views for mode pills (exclude mobile entries).
	const desktopViews = $derived(views.filter((v) => !v.id.endsWith('-mobile')));

	// ── Date label (always visible, centered over views) ──
	const dateLabel = $derived.by(() => {
		if (!showDates) {
			// Template week mode: just show weekday name (day) or nothing (week)
			if (viewState.mode === 'day') {
				return viewState.focusDate.toLocaleDateString(locale, { weekday: 'long' });
			}
			return ''; // week views have their own day headers
		}
		if (viewState.mode === 'day') {
			return viewState.focusDate.toLocaleDateString(locale, {
				weekday: 'long',
				month: 'short',
				day: 'numeric',
			});
		}
		return viewState.focusDate.toLocaleDateString(locale, {
			month: 'long',
			year: 'numeric',
		});
	});

	// Which modes are available?
	const modes = $derived.by(() => {
		const g = new Set(desktopViews.map((v) => v.mode));
		return (['day', 'week'] as const).filter((key) => g.has(key));
	});

	const L = $derived(getLabels());

	/** Switch to a different mode (day/week), preserving the current view label. */
	function switchMode(g: 'day' | 'week') {
		const currentLabel = desktopViews.find((v) => v.id === viewState.view)?.label
			?? activeView?.label;
		const match = desktopViews.find((v) => v.mode === g && v.label === currentLabel);
		const fallback = desktopViews.find((v) => v.mode === g);
		const target = match ?? fallback;
		if (target) viewState.setView(target.id);
	}

	/** True when the current view range already includes today. */
	const viewIncludesToday = $derived.by(() => {
		const now = Date.now();
		const { start, end } = viewState.range;
		return now >= start.getTime() && now < end.getTime();
	});
</script>

<div
	class="cal"
	bind:this={calEl}
	style="{effectiveTheme}; {heightProp === 'auto' ? '' : `--cal-h: ${heightProp}px;`} --cal-r: {borderRadius}px"
	class:cal--auto={heightProp === 'auto'}
	role="region"
	aria-label={L.calendar}
	dir={dir}
	lang={locale}
>
	<!-- ─── Mobile header (flow layout, no absolute) ─── -->
	{#if useMobile}
		<div class="cal-m-hd">
			<div class="cal-m-left">
				{#if showNavigation}
					<button class="cal-m-nav" onclick={() => viewState.prev()} aria-label={viewState.mode === 'day' ? L.previousDay : L.previousWeek}>
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>
					</button>
				{/if}

				{#if showModePills && modes.length > 1}
					<div class="cal-m-pills" role="group" aria-label={L.viewMode}>
						{#each modes as g}
							<button
								class="cal-m-pill"
								class:cal-m-pill--active={viewState.mode === g}
								aria-pressed={viewState.mode === g}
								onclick={() => switchMode(g)}
							>
								{g === 'day' ? L.day : L.week}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<span class="cal-m-title">{dateLabel}</span>

			<div class="cal-m-right">
				{#if showNavigation}
					<button class="cal-m-nav" onclick={() => viewState.next()} aria-label={viewState.mode === 'day' ? L.nextDay : L.nextWeek}>
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- Today pill — floats below header, doesn't affect header flow -->
		{#if showNavigation && !viewIncludesToday}
			<div class="cal-m-today-bar">
				<button class="cal-m-today" onclick={() => viewState.goToday()}>
					{L.today}
				</button>
			</div>
		{/if}
	{/if}

	<!-- Floating mode pills — desktop only (hidden for Agenda views) -->
	{#if !useMobile && showModePills && modes.length > 1 && activeView?.label !== 'Agenda'}
		<div class="cal-pills" role="group" aria-label={L.viewMode}>
			{#each modes as g}
				<button
					class="cal-pill"
					class:cal-pill--active={viewState.mode === g}
					aria-pressed={viewState.mode === g}
					onclick={() => switchMode(g)}
				>
					{g === 'day' ? L.day : L.week}
				</button>
			{/each}
		</div>
	{/if}

	<div class="cal-body">
		{#if activeView}
			{@const Comp = activeView.component}
			<Comp
				events={store.events}
				style={effectiveTheme}
				height={null}
				mode={activeView.mode}
				mondayStart={viewState.mondayStart}
				{locale}
				focusDate={viewState.focusDate}
				oneventclick={oneventclick}
				oneventcreate={effectiveCreate}
				readOnly={readOnly}
				visibleHours={visibleHours}
				selectedEventId={selection.selectedId}
				{...activeView.props ?? {}}
			/>
		{:else}
			<div class="cal-empty">No views registered.</div>
		{/if}
	</div>

	{#if store.loading}
		<div class="cal-loading"></div>
	{/if}
</div>

<style>
	.cal {
		position: relative;
		height: var(--cal-h, 600px);
		background: var(--dt-bg, #0b0e14);
		border-radius: var(--cal-r, 12px);
		overflow: clip;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--dt-border, rgba(148, 163, 184, 0.07));
	}
	.cal--auto {
		height: auto;
		overflow: visible;
	}

	/* ── Floating pills ── */
	.cal-pills {
		position: absolute;
		top: 22px;
		bottom: auto;
		left: 10px;
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

	.cal-pill {
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
	}

	.cal-pill:hover {
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
	}

	.cal-pill--active {
		background: var(--dt-accent, #ef4444);
		color: var(--dt-btn-text, #fff);
	}

	.cal-pill:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--dt-accent, #ef4444) 55%, transparent);
		outline-offset: 2px;
	}

	.cal-body {
		flex: 1;
		min-height: 0;
		position: relative;
		overflow: hidden;
	}
	.cal--auto .cal-body {
		overflow: visible;
	}

	.cal-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font: 400 13px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-text-3, rgba(100, 116, 139, 0.55));
	}

	.cal-loading {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			var(--dt-accent, #ef4444) 50%,
			transparent 100%
		);
		animation: cal-slide 1.2s ease-in-out infinite;
	}

	@keyframes cal-slide {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}

	/* ── Mobile header (flow layout) ── */
	.cal-m-hd {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 8px 8px 6px;
		border-bottom: 1px solid var(--dt-border, rgba(148, 163, 184, 0.07));
		flex-shrink: 0;
		min-height: 44px;
	}

	.cal-m-left,
	.cal-m-right {
		display: flex;
		align-items: center;
		gap: 2px;
		flex-shrink: 0;
	}

	.cal-m-right {
		justify-content: flex-end;
	}

	.cal-m-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: var(--dt-text-2, rgba(148, 163, 184, 0.55));
		border-radius: 50%;
		cursor: pointer;
		transition: background 120ms, color 120ms;
		-webkit-tap-highlight-color: transparent;
		flex-shrink: 0;
	}
	.cal-m-nav:hover {
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
		background: color-mix(in srgb, var(--dt-text, rgba(226, 232, 240, 0.85)) 8%, transparent);
	}
	.cal-m-nav:active {
		background: var(--dt-accent-dim, rgba(239, 68, 68, 0.12));
	}
	.cal-m-nav:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--dt-accent, #ef4444) 55%, transparent);
		outline-offset: 2px;
	}

	.cal-m-pills {
		display: flex;
		gap: 2px;
		background: color-mix(in srgb, var(--dt-surface, #10141c) 85%, transparent);
		border-radius: 8px;
		padding: 2px;
		border: 1px solid var(--dt-border, rgba(148, 163, 184, 0.07));
		flex-shrink: 0;
	}
	.cal-m-pill {
		border: none;
		background: transparent;
		color: var(--dt-text-2, rgba(148, 163, 184, 0.55));
		cursor: pointer;
		font: 600 11px / 1 var(--dt-sans, system-ui, sans-serif);
		padding: 5px 10px;
		border-radius: 6px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition: background 100ms, color 100ms;
		-webkit-tap-highlight-color: transparent;
	}
	.cal-m-pill:hover {
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
	}
	.cal-m-pill--active {
		background: var(--dt-accent, #ef4444);
		color: var(--dt-btn-text, #fff);
	}

	.cal-m-title {
		flex: 1;
		text-align: center;
		font: 600 14px / 1.2 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.cal-m-today-bar {
		display: flex;
		justify-content: center;
		padding: 12px 8px 6px;
		flex-shrink: 0;
	}

	.cal-m-today {
		font: 600 11px / 1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-accent, #ef4444);
		background: color-mix(in srgb, var(--dt-accent, #ef4444) 10%, transparent);
		border: none;
		padding: 5px 10px;
		border-radius: 6px;
		cursor: pointer;
		white-space: nowrap;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition: background 120ms, color 120ms;
		-webkit-tap-highlight-color: transparent;
		flex-shrink: 0;
	}
	.cal-m-today:hover {
		background: color-mix(in srgb, var(--dt-accent, #ef4444) 18%, transparent);
	}
	.cal-m-today:active {
		background: color-mix(in srgb, var(--dt-accent, #ef4444) 25%, transparent);
	}
	.cal-m-today:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--dt-accent, #ef4444) 55%, transparent);
		outline-offset: 2px;
	}
</style>
