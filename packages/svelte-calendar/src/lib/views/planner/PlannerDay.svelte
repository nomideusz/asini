<!--
  Planner day mode — horizontal filmstrip timeline.

  Time flows left → right. Past on the left, future on the right.
  The now-line tracks the current time. Drag to scroll through days.
  Events are positioned as horizontal cards with overlap support.
-->
<script lang="ts">
	import { getContext, onMount, tick, untrack, type Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import { createClock } from '../../core/clock.svelte.js';
	import type { TimelineEvent, BlockedSlot } from '../../core/types.js';
	import type { DragState } from '../../engine/drag.svelte.js';
	import type { ViewState } from '../../engine/view-state.svelte.js';
	import { DAY_MS, HOUR_MS, sod } from '../../core/time.js';
	import { isAllDay, isMultiDay, segmentForDay } from '../../core/time.js';
	import type { DaySegment } from '../../core/time.js';
	import { fmtH, fmtTime, weekdayShort } from '../../core/locale.js';
	import { getLabels } from '../../core/locale.js';

	const L = $derived(getLabels());

	interface Props {
		/** Total height (null = fill parent) */
		height?: number | null;
		/** Events to render */
		events?: TimelineEvent[];
		/** Inline style for CSS variable overrides (theme) */
		style?: string;
		/** The date to centre this view on */
		focusDate?: Date;
		/** Locale for labels */
		locale?: string;
		/** Called when the user clicks an event */
		oneventclick?: (event: TimelineEvent) => void;
		/** Called when the user clicks an empty time slot */
		oneventcreate?: (range: { start: Date; end: Date }) => void;
		/** Currently selected event ID (for highlight) */
		selectedEventId?: string | null;
		/** Read-only mode */
		readOnly?: boolean;
		/** Visible hour range [startHour, endHour) */
		visibleHours?: [number, number];
		[key: string]: unknown;
	}

	let {
		height = 520,
		events = [],
		style = '',
		locale,
		focusDate,
		oneventclick,
		oneventcreate,
		selectedEventId = null,
		readOnly = false,
		visibleHours,
	}: Props = $props();

	// ── Context (available when inside Calendar) ──
	const drag = getContext<DragState>('calendar:drag') as DragState | undefined;
	const commitDragCtx = getContext<() => void>('calendar:commitDrag') as (() => void) | undefined;
	const snapIntervalCtx = getContext<{ current: number }>('calendar:snapInterval');
	const viewState = getContext<ViewState>('calendar:viewState') as ViewState | undefined;
	const loadRangeCtx = getContext<{ current: { start: Date; end: Date } | null; set: (r: { start: Date; end: Date } | null) => void }>('calendar:loadRange') as { current: { start: Date; end: Date } | null; set: (r: { start: Date; end: Date } | null) => void } | undefined;

	const clock = createClock();
	const showNavCtx = getContext<{ current: boolean }>('calendar:showNavigation') as { current: boolean } | undefined;
	const showDatesCtx = getContext<{ current: boolean }>('calendar:showDates') as { current: boolean } | undefined;
	const showNav = $derived(showNavCtx?.current ?? true);
	const showDates = $derived(showDatesCtx?.current ?? true);

	// ── New feature contexts ──
	const blockedSlotsCtx = getContext<{ current: BlockedSlot[] | undefined }>('calendar:blockedSlots') as { current: BlockedSlot[] | undefined } | undefined;
	const dayHeaderSnippetCtx = getContext<{ current: Snippet<[{ date: Date; isToday: boolean; dayName: string }]> | undefined }>('calendar:dayHeaderSnippet') as { current: Snippet<[{ date: Date; isToday: boolean; dayName: string }]> | undefined } | undefined;
	const minDurationCtx = getContext<{ current: number | undefined }>('calendar:minDuration') as { current: number | undefined } | undefined;
	const callbacksCtx = getContext<{ oneventhover?: (event: TimelineEvent) => void }>('calendar:callbacks') as { oneventhover?: (event: TimelineEvent) => void } | undefined;
	const disabledDatesCtx = getContext<{ current: Date[] | undefined }>('calendar:disabledDates') as { current: Date[] | undefined } | undefined;
	const autoHeightCtx = getContext<{ current: boolean }>('calendar:autoHeight') as { current: boolean } | undefined;

	const blockedSlots = $derived(blockedSlotsCtx?.current);
	const dayHeaderSnippet = $derived(dayHeaderSnippetCtx?.current);
	const minDuration = $derived(minDurationCtx?.current);
	const autoHeight = $derived(autoHeightCtx?.current ?? false);
	const oneventhover = $derived(callbacksCtx?.oneventhover);
	const disabledDates = $derived(disabledDatesCtx?.current);
	const disabledSet = $derived(new Set(disabledDates?.map(d => sod(d.getTime())) ?? []));

	// ─── State ──────────────────────────────────────────
	let following = $state(true);
	let scrollDragging = $state(false);
	let wasDragging = false;
	let el: HTMLDivElement;
	let containerW = $state(0);
	let containerH = $state(520);
	let dragStartX = 0;
	let dragScrollStart = 0;
	let rafId = 0;

	// ─── Infinite-scroll config ────────────────────────
	const BUFFER_DAYS = 7;      // days rendered on each side of centre
	const EDGE_DAYS = 2;        // rebase when this close to an edge
	const SHIFT_DAYS = 5;       // days to shift per rebase

	// Internal centre drives layout; syncs bidirectionally with focusDate.
	const _initMs = untrack(() => sod(focusDate?.getTime() ?? Date.now()));
	let internalCenterMs = $state(_initMs);
	let lastExternalMs = _initMs;
	let rebasing = false;
	let visibleDayMs = $state(_initMs);

	// ─── Derived Config ─────────────────────────────────
	const startHour = $derived(visibleHours?.[0] ?? 0);
	const endHour = $derived(visibleHours?.[1] ?? 24);
	const hourCount = $derived(Math.max(1, endHour - startHour));
	const SNAP_MS = $derived((snapIntervalCtx?.current ?? 15) * 60_000);
	const DAY_GAP = 2;

	const dateLabel = $derived(
		showDates
			? new Date(visibleDayMs).toLocaleDateString(locale ?? 'en-US', {
				weekday: 'long',
				month: 'long',
				day: 'numeric',
			})
			: new Date(visibleDayMs).toLocaleDateString(locale ?? 'en-US', {
				weekday: 'long',
			})
	);

	const count = 1 + 2 * BUFFER_DAYS;
	const origin = $derived(internalCenterMs - BUFFER_DAYS * DAY_MS);

	// ─── Declare load range for entire visible buffer ────────
	$effect(() => {
		if (!loadRangeCtx) return;
		const rangeStart = new Date(internalCenterMs - BUFFER_DAYS * DAY_MS);
		const rangeEnd = new Date(internalCenterMs + (BUFFER_DAYS + 1) * DAY_MS);
		loadRangeCtx.set({ start: rangeStart, end: rangeEnd });
		return () => loadRangeCtx.set(null);
	});

	// Auto-calculate hourWidth — minimum 60px so hours stay readable.
	// When 24h × 60px exceeds the container, the timeline scrolls horizontally.
	const MIN_HOUR_W = 60;
	const hourWidth = $derived(containerW > 0 ? Math.max(MIN_HOUR_W, containerW / hourCount) : 110);
	const dayWidth = $derived(hourCount * hourWidth);
	const totalWidth = $derived(count * (dayWidth + DAY_GAP));

	// ─── Day Layouts ────────────────────────────────────
	interface DayLayout {
		ms: number;
		today: boolean;
		past: boolean;
		x: number;
	}

	const days = $derived.by(() => {
		const result: DayLayout[] = [];
		for (let i = 0; i < count; i++) {
			const ms = origin + i * DAY_MS;
			result.push({
				ms,
				today: ms === clock.today,
				past: ms < clock.today,
				x: i * (dayWidth + DAY_GAP),
			});
		}
		return result;
	});

	// ─── Coordinate Conversion ──────────────────────────
	function timeToPx(ms: number): number {
		const elapsed = ms - origin;
		const dayIndex = Math.floor(elapsed / DAY_MS);
		const hourInDay = (elapsed - dayIndex * DAY_MS) / HOUR_MS;
		const hourOffset = hourInDay - startHour;
		return dayIndex * (dayWidth + DAY_GAP) + hourOffset * hourWidth;
	}

	function pxToTime(px: number): number {
		const dayStride = dayWidth + DAY_GAP;
		const dayIndex = Math.max(0, Math.min(count - 1, Math.floor(px / dayStride)));
		const localPx = px - dayIndex * dayStride;
		const hour = startHour + localPx / hourWidth;
		return origin + dayIndex * DAY_MS + hour * HOUR_MS;
	}

	const nowPx = $derived(timeToPx(clock.tick));

	// ─── Separate all-day from timed events ────────────
	const timedEvents = $derived(events.filter((ev) => !isAllDay(ev) && !isMultiDay(ev)));
	const allDayEvents = $derived.by(() => {
		const segs: DaySegment[] = [];
		for (const ev of events) {
			if (!isAllDay(ev) && !isMultiDay(ev)) continue;
			const seg = segmentForDay(ev, visibleDayMs);
			if (seg) segs.push(seg);
		}
		return segs;
	});

	// ─── Event Layout ───────────────────────────────────
	const CONTENT_TOP = 56;
	const ALLDAY_H = 24;
	const contentTop = $derived(CONTENT_TOP + (allDayEvents.length > 0 ? ALLDAY_H + 4 : 0));
	const EVENT_GAP = 5;
	const MIN_EVENT_H = 32;

	interface PositionedEvent {
		ev: TimelineEvent;
		x: number;
		width: number;
		row: number;
		groupMaxRow: number;
		topPx: number;
		heightPx: number;
		isCurrent: boolean;
		isNext: boolean;
		isDragged: boolean;
	}

	const positionedEvents = $derived.by(() => {
		const now = clock.tick;
		const dragP = drag?.active && drag.mode === 'move' ? drag.payload : null;

		const staticEvents: typeof timedEvents = [];
		let draggedEv: TimelineEvent | null = null;
		for (const ev of timedEvents) {
			if (dragP?.eventId === ev.id) draggedEv = ev;
			else staticEvents.push(ev);
		}

		const sorted = [...staticEvents].sort((a, b) => a.start.getTime() - b.start.getTime());

		// Find the earliest future event on today to mark as "next"
		const todayStart = sod(now);
		const todayEnd = todayStart + DAY_MS;
		let nextEventId: string | null = null;
		for (const ev of sorted) {
			const s = ev.start.getTime();
			const e = ev.end.getTime();
			// Must be today, start in the future, and not currently running
			if (s >= todayStart && s < todayEnd && s > now && !(s <= now && e > now)) {
				nextEventId = ev.id;
				break;
			}
		}

		const infos = sorted.map((ev) => {
			const s = ev.start.getTime();
			const e = ev.end.getTime();
			const x = timeToPx(s);
			const xEnd = timeToPx(e);
			return {
				ev, x, width: Math.max(xEnd - x, 28), row: 0, groupMaxRow: 1,
				isCurrent: s <= now && e > now, isNext: ev.id === nextEventId, isDragged: false, startMs: s, endMs: e,
			};
		});

		// Union-find overlap groups
		const par = infos.map((_, i) => i);
		function find(i: number): number {
			while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; }
			return i;
		}
		for (let i = 0; i < infos.length; i++) {
			for (let j = i + 1; j < infos.length; j++) {
				if (infos[j].startMs < infos[i].endMs) par[find(i)] = find(j);
				else break;
			}
		}

		const groups = new Map<number, number[]>();
		for (let i = 0; i < infos.length; i++) {
			const root = find(i);
			if (!groups.has(root)) groups.set(root, []);
			groups.get(root)!.push(i);
		}

		for (const [, indices] of groups) {
			const rows: number[] = [];
			for (const idx of indices) {
				const inf = infos[idx];
				let row = 0;
				for (let r = 0; r < rows.length; r++) {
					if (rows[r] <= inf.startMs) { row = r; rows[r] = inf.endMs; break; }
					row = r + 1;
				}
				if (row >= rows.length) rows.push(inf.endMs);
				infos[idx].row = row;
			}
			for (const idx of indices) infos[idx].groupMaxRow = rows.length;
		}

		const availH = containerH - contentTop - 8;
		const result: PositionedEvent[] = infos.map(({ startMs: _s, endMs: _e, ...info }) => {
			const laneH = Math.max(MIN_EVENT_H, availH / info.groupMaxRow - EVENT_GAP);
			const topPx = contentTop + info.row * (availH / info.groupMaxRow);
			return { ...info, topPx, heightPx: laneH, isNext: info.isNext };
		});

		if (draggedEv && dragP) {
			const x = timeToPx(dragP.start.getTime());
			const xEnd = timeToPx(dragP.end.getTime());
			result.push({
				ev: draggedEv, x, width: Math.max(xEnd - x, 28),
				row: 0, groupMaxRow: 1,
				topPx: contentTop,
				heightPx: Math.max(MIN_EVENT_H, availH - EVENT_GAP),
				isCurrent: draggedEv.start.getTime() <= now && draggedEv.end.getTime() > now,
				isNext: false,
				isDragged: true,
			});
		}

		return result;
	});

	// ─── Infinite-scroll helpers ────────────────────────

	/** Detect external focusDate changes (from nav arrows). */
	$effect(() => {
		const ext = focusDate ? sod(focusDate.getTime()) : clock.today;
		if (ext !== lastExternalMs && !rebasing) {
			lastExternalMs = ext;
			internalCenterMs = ext;
			visibleDayMs = ext;
			following = false;
			// After DOM update, recenter scroll on focus day.
			tick().then(() => {
				if (el) {
					const focusX = BUFFER_DAYS * (dayWidth + DAY_GAP);
					el.scrollLeft = focusX + dayWidth / 2 - el.clientWidth / 2;
				}
			});
		}
	});

	/** Check if viewport is near an edge; if so, rebase the window. */
	function checkEdges() {
		if (!el || !viewState || rebasing) return;
		const stride = dayWidth + DAY_GAP;
		const threshold = stride * EDGE_DAYS;
		const maxScroll = el.scrollWidth - el.clientWidth;

		if (el.scrollLeft < threshold) {
			rebase(-1);
		} else if (maxScroll > 0 && maxScroll - el.scrollLeft < threshold) {
			rebase(1);
		}
	}

	/** Shift the rendered window by SHIFT_DAYS in the given direction. */
	function rebase(direction: number) {
		if (rebasing) return;
		rebasing = true;

		const shift = SHIFT_DAYS * direction;
		const stride = dayWidth + DAY_GAP;
		const adj = -shift * stride;

		// Pre-compensate scroll so the viewport stays visually stable.
		if (el) el.scrollLeft += adj;
		dragScrollStart += adj;

		internalCenterMs += shift * DAY_MS;
		lastExternalMs = internalCenterMs;
		viewState?.setFocusDate(new Date(internalCenterMs));

		tick().then(() => { rebasing = false; });
	}

	/** Push the currently visible centre day to viewState (updates Calendar date label). */
	function syncFocusFromScroll() {
		if (!el || !viewState || following || rebasing) return;
		const centerX = el.scrollLeft + el.clientWidth / 2;
		const centerDayMs = sod(pxToTime(centerX));
		visibleDayMs = centerDayMs;
		if (centerDayMs !== lastExternalMs) {
			lastExternalMs = centerDayMs;
			viewState.setFocusDate(new Date(centerDayMs));
		}
	}

	// ─── Lifecycle ──────────────────────────────────────
	onMount(() => {
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerW = entry.contentRect.width;
				containerH = entry.contentRect.height;
			}
		});
		ro.observe(el);

		function frame() {
			if (following && el && !scrollDragging) {
				// Ensure today is in the strip.
				if (internalCenterMs !== clock.today) {
					internalCenterMs = clock.today;
					lastExternalMs = clock.today;
					viewState?.goToday();
				}
				visibleDayMs = clock.today;
				const todayD = days.find((d) => d.today);
				if (todayD) {
					el.scrollLeft = todayD.x + dayWidth / 2 - el.clientWidth / 2;
				}
			} else if (el && !rebasing) {
				checkEdges();
				syncFocusFromScroll();
			}
			rafId = requestAnimationFrame(frame);
		}
		rafId = requestAnimationFrame(frame);
		return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
	});

	// ─── Drag-to-scroll ─────────────────────────────────
	const SCROLL_THRESHOLD = 3;

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		if (!readOnly) return; // drag-to-scroll only in read-only mode
		if ((e.target as HTMLElement).closest('.fs-event')) return;
		dragStartX = e.clientX;
		dragScrollStart = el.scrollLeft;
		window.addEventListener('pointermove', onScrollMove);
		window.addEventListener('pointerup', onScrollUp, { once: true });
		window.addEventListener('pointercancel', onScrollUp, { once: true });
	}

	function onScrollMove(e: PointerEvent) {
		const dx = e.clientX - dragStartX;
		if (!scrollDragging && Math.abs(dx) >= SCROLL_THRESHOLD) {
			scrollDragging = true;
			wasDragging = true;
			following = false;
		}
		if (scrollDragging) el.scrollLeft = dragScrollStart - dx;
	}

	function onScrollUp() {
		window.removeEventListener('pointermove', onScrollMove);
		window.removeEventListener('pointerup', onScrollUp);
		window.removeEventListener('pointercancel', onScrollUp);
		scrollDragging = false;
	}

	// ─── Click-to-create ────────────────────────────────
	function isBlockedAt(dayMs: number, hour: number): boolean {
		if (!blockedSlots?.length) return false;
		const jsDay = new Date(dayMs).getDay();
		const isoDay = jsDay === 0 ? 7 : jsDay;
		return blockedSlots.some(slot => {
			if (slot.day && slot.day !== isoDay) return false;
			return hour >= slot.start && hour < slot.end;
		});
	}
	function handleTrackClick(e: MouseEvent) {
		if (wasDragging) { wasDragging = false; return; }
		if (!oneventcreate || readOnly) return;
		if ((e.target as HTMLElement).closest('.fs-event')) return;

		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const clickX = e.clientX - rect.left + el.scrollLeft;

		for (const d of days) {
			if (clickX >= d.x && clickX < d.x + dayWidth) {
				// Check disabled dates
				if (disabledSet.has(d.ms)) return;
				const frac = (clickX - d.x) / dayWidth;
				const clickHour = startHour + frac * hourCount;
				// Check blocked slots
				if (isBlockedAt(d.ms, clickHour)) return;
				const hour = Math.floor(clickHour);
				const durMin = minDuration ? Math.max(60, minDuration) : 60;
				const start = new Date(d.ms + hour * HOUR_MS);
				const end = new Date(start.getTime() + durMin * 60_000);
				oneventcreate({ start, end });
				return;
			}
		}
	}

	// ─── Event drag-to-move ─────────────────────────────
	const DRAG_THRESHOLD = 5;
	let evDragStartX = 0;
	let evDragOriginPx = 0;
	let evDragStarted = false;
	let evDragging = $state(false);
	let evDragId = $state<string | null>(null);
	let evDragEvent: TimelineEvent | null = null;

	function onEventPointerDown(e: PointerEvent, ev: TimelineEvent) {
		if (e.button !== 0 || !drag || readOnly) return;
		e.stopPropagation();
		evDragStartX = e.clientX;
		evDragOriginPx = timeToPx(ev.start.getTime());
		evDragStarted = false;
		evDragId = ev.id;
		evDragEvent = ev;
		window.addEventListener('pointermove', onEvMove);
		window.addEventListener('pointerup', onEvUp, { once: true });
		window.addEventListener('pointercancel', onEvCancel, { once: true });
	}

	function onEvMove(e: PointerEvent) {
		const ev = evDragEvent;
		if (!drag || !ev || evDragId !== ev.id) return;
		const dx = e.clientX - evDragStartX;
		if (!evDragStarted && Math.abs(dx) < DRAG_THRESHOLD) return;

		if (!evDragStarted) {
			evDragStarted = true;
			evDragging = true;
			drag.beginMove(ev.id, ev.start, ev.end);
		}

		const duration = ev.end.getTime() - ev.start.getTime();
		const raw = pxToTime(evDragOriginPx + dx);
		const snapped = Math.round(raw / SNAP_MS) * SNAP_MS;
		drag.updatePointer(new Date(snapped), new Date(snapped + duration));
	}

	function cleanupEvDrag() {
		window.removeEventListener('pointermove', onEvMove);
		window.removeEventListener('pointerup', onEvUp);
		window.removeEventListener('pointercancel', onEvCancel);
		evDragStarted = false;
		evDragging = false;
		evDragId = null;
		evDragEvent = null;
	}

	function onEvUp() {
		if (!drag) { cleanupEvDrag(); return; }
		if (!evDragStarted && evDragEvent) oneventclick?.(evDragEvent);
		else if (evDragStarted) commitDragCtx?.();
		cleanupEvDrag();
	}

	function onEvCancel() {
		if (drag && evDragStarted) drag.cancel();
		cleanupEvDrag();
	}
</script>

<div class="fs" class:fs--auto={autoHeight} style={style || undefined} style:height={autoHeight ? undefined : (height ? `${height}px` : '100%')} role="region" aria-label={L.dayPlanner}>
	<div
		class="fs-scroll"
		class:fs-grabbing={scrollDragging}
		class:fs-readonly={readOnly}
		bind:this={el}
		onwheel={(e) => { e.preventDefault(); el.scrollLeft += e.deltaY || e.deltaX; following = false; }}
		onpointerdown={onPointerDown}
		role="application"
		aria-label={L.scrollableDayPlanner}
	>
		<div class="fs-track" style:width="{totalWidth}px" onclick={handleTrackClick} role="none">
			{#each days as d (d.ms)}
				<div
					class="fs-day"
					class:fs-today={d.today}
					class:fs-past={d.past}
					class:fs-disabled={disabledSet.has(d.ms)}
					style:left="{d.x}px"
					style:width="{dayWidth}px"
				>
					{#each { length: hourCount } as _, h}
						{@const hour = startHour + h}
						{@const x = h * hourWidth}
						<div class="fs-tick" style:left="{x}px">
							<span class="fs-tick-lb">{fmtH(hour, locale)}</span>
						</div>
						<div class="fs-tick fs-tick--half" style:left="{x + hourWidth * 0.5}px"></div>
					{/each}

					<!-- Blocked slot overlays -->
					{#if blockedSlots?.length}
						{@const jsDay = new Date(d.ms).getDay()}
						{@const isoDay = jsDay === 0 ? 7 : jsDay}
						{#each blockedSlots as slot}
							{#if !slot.day || slot.day === isoDay}
								{@const s = Math.max(slot.start, startHour)}
								{@const e = Math.min(slot.end, endHour)}
								{#if e > s}
									<div
										class="fs-blocked"
										style:left="{(s - startHour) * hourWidth}px"
										style:width="{(e - s) * hourWidth}px"
										aria-label={slot.label || 'Unavailable'}
									>
										{#if slot.label}
											<span class="fs-blocked-label">{slot.label}</span>
										{/if}
									</div>
								{/if}
							{/if}
						{/each}
					{/if}

					<!-- Custom day header snippet -->
					{#if dayHeaderSnippet}
						<div class="fs-day-header-custom">
							{@render dayHeaderSnippet({ date: new Date(d.ms), isToday: d.today, dayName: weekdayShort(d.ms, locale) })}
						</div>
					{/if}
				</div>
			{/each}

			<!-- Now line -->
			<div class="fs-now" style:left="{nowPx}px">
				<span class="fs-now-tag">{clock.hm}<span class="fs-now-sec">{clock.s}</span></span>
				<div class="fs-now-line"></div>
			</div>

			<!-- Events -->
			{#each positionedEvents as p (p.ev.id)}
				<div
					class="fs-event"
					class:fs-event--selected={selectedEventId === p.ev.id}
					class:fs-event--current={p.isCurrent}
					class:fs-event--next={p.isNext}
					class:fs-event--dragging={p.isDragged}
					class:fs-event--cancelled={p.ev.status === 'cancelled'}
					class:fs-event--tentative={p.ev.status === 'tentative'}
					style:left="{p.x}px"
					style:width="{p.width}px"
					style:top="{p.topPx}px"
					style:height="{p.heightPx}px"
					style:--ev-color={p.ev.color ?? 'var(--dt-accent)'}
					role="button"
					tabindex="0"
					aria-label="{p.ev.title}{p.ev.status === 'cancelled' ? ' (cancelled)' : ''}{p.ev.status === 'tentative' ? ' (tentative)' : ''}{p.isCurrent ? ` (${L.inProgress})` : ''}{p.isNext ? ` (${L.upNext})` : ''}"
					onpointerdown={(e) => onEventPointerDown(e, p.ev)}
					onpointerenter={() => oneventhover?.(p.ev)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); oneventclick?.(p.ev); } }}
				>
					<div class="fs-ev-inner">
						{#if p.isCurrent}
							<span class="fs-ev-live" aria-hidden="true"></span>
						{:else if p.isNext}
							<span class="fs-ev-next-badge" aria-hidden="true">{L.upNext}</span>
						{/if}
						{#if p.heightPx > 64}
							<span class="fs-ev-time">{fmtTime(p.ev.start, locale)} – {fmtTime(p.ev.end, locale)}</span>
						{/if}
						<span class="fs-ev-title">{p.ev.title}</span>
						{#if p.ev.subtitle && p.heightPx > 48}
							<span class="fs-ev-sub">{p.ev.subtitle}</span>
						{/if}
						{#if p.ev.location && p.heightPx > 56}
							<span class="fs-ev-loc">{p.ev.location}</span>
						{/if}
						{#if p.ev.tags?.length && p.heightPx > 72}
							<span class="fs-ev-tags">
								{#each p.ev.tags as tag}
									<span class="fs-ev-tag">{tag}</span>
								{/each}
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- All-day events banner (outside scroll so it stays in viewport) -->
	{#if allDayEvents.length > 0}
		<div class="fs-allday" style:top="{CONTENT_TOP}px">
			{#each allDayEvents as seg (seg.ev.id)}
				<div
					class="fs-ad"
					class:fs-ad--start={seg.isStart}
					class:fs-ad--selected={selectedEventId === seg.ev.id}
					style:--ev-color={seg.ev.color ?? 'var(--dt-accent)'}
					role="button"
					tabindex="0"
					aria-label="{seg.ev.title}{seg.totalDays > 1 ? `, ${L.dayNOfTotal(seg.dayIndex, seg.totalDays)}` : `, ${L.allDay}`}"
					onclick={() => oneventclick?.(seg.ev)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); oneventclick?.(seg.ev); } }}
				>
					<span class="fs-ad-dot" aria-hidden="true"></span>
					<span class="fs-ad-title">{seg.ev.title}</span>
					{#if seg.totalDays > 1}
						<span class="fs-ad-span">{L.day} {seg.dayIndex}/{seg.totalDays}</span>
					{:else}
						<span class="fs-ad-span">{L.allDay}</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div class="fs-date-label">{dateLabel}</div>

	{#if showNav}
	<nav class="fs-nav" aria-label={L.dayNavigation}>
		<button
			class="fs-nav-pill fs-nav-today"
			class:fs-nav-today--hidden={following}
			onclick={() => { internalCenterMs = clock.today; lastExternalMs = clock.today; viewState?.goToday(); following = true; }}
			aria-label={L.goToToday}
			tabindex={following ? -1 : 0}
		>
			{L.today}
		</button>
		<button
			class="fs-nav-pill"
			onclick={() => { const prev = internalCenterMs - DAY_MS; internalCenterMs = prev; lastExternalMs = prev; viewState?.prev(); following = false; }}
			aria-label={L.previousDay}
		>
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>
		</button>
		<button
			class="fs-nav-pill"
			onclick={() => { const next = internalCenterMs + DAY_MS; internalCenterMs = next; lastExternalMs = next; viewState?.next(); following = false; }}
			aria-label={L.nextDay}
		>
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
		</button>
	</nav>
	{/if}
</div>

<style>
	/* ─── Container ──────────────────────────────────── */
	.fs {
		position: relative;
		overflow: hidden;
		user-select: none;
		font-variant-numeric: tabular-nums;
	}
	.fs--auto { overflow: visible; }

	/* ─── Horizontal scroll ──────────────────────────── */
	.fs-scroll {
		width: 100%;
		height: 100%;
		overflow-x: auto;
		overflow-y: hidden;
		touch-action: pan-x;
		cursor: default;
		scrollbar-width: thin;
		scrollbar-color: var(--dt-scrollbar, rgba(0, 0, 0, 0.08)) transparent;
	}
	.fs--auto .fs-scroll { height: auto; overflow: visible; }
	.fs-scroll::-webkit-scrollbar { height: 5px; }
	.fs-scroll::-webkit-scrollbar-thumb {
		background: var(--dt-scrollbar, rgba(0, 0, 0, 0.08));
		border-radius: 4px;
	}
	.fs-scroll::-webkit-scrollbar-track { background: transparent; }
	.fs-readonly { cursor: grab; }
	.fs-grabbing { cursor: grabbing; }

	.fs-track {
		position: relative;
		height: 100%;
	}

	/* ─── Day block ──────────────────────────────────── */
	.fs-day {
		position: absolute;
		top: 0;
		height: 100%;
		border-left: 1px solid var(--dt-border-day, rgba(148, 163, 184, 0.14));
		box-sizing: border-box;
	}
	.fs-day:first-of-type { border-left: none; }
	.fs-today { background: var(--dt-today-bg, rgba(239, 68, 68, 0.025)); }
	.fs-past { opacity: 0.7; }

	/* ─── Disabled day ───────────────────────────────── */
	.fs-disabled {
		opacity: 0.35;
		background: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 6px,
			var(--dt-border, rgba(148, 163, 184, 0.07)) 6px,
			var(--dt-border, rgba(148, 163, 184, 0.07)) 7px
		) !important;
	}

	/* ─── Blocked slot overlay ───────────────────────── */
	.fs-blocked {
		position: absolute;
		top: 18px;
		bottom: 0;
		z-index: 3;
		background: repeating-linear-gradient(
			-45deg,
			color-mix(in srgb, var(--dt-text, rgba(148, 163, 184, 0.85)) 4%, transparent),
			color-mix(in srgb, var(--dt-text, rgba(148, 163, 184, 0.85)) 4%, transparent) 4px,
			transparent 4px,
			transparent 8px
		);
		border-radius: 4px;
		pointer-events: none;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 6px;
	}

	.fs-blocked-label {
		font: 500 9px/1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text-3, rgba(100, 116, 139, 0.55));
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}

	/* ─── Custom day header ──────────────────────────── */
	.fs-day-header-custom {
		position: absolute;
		top: 16px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 4;
		pointer-events: auto;
		white-space: nowrap;
	}

	/* ─── Hour ticks ─────────────────────────────────── */
	.fs-tick {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 0;
	}
	.fs-tick::before {
		content: '';
		position: absolute;
		top: 18px;
		bottom: 0;
		width: 1px;
		background: var(--dt-border, rgba(148, 163, 184, 0.07));
	}
	.fs-tick-lb {
		position: absolute;
		top: 2px;
		left: 5px;
		font: 500 10px/1 var(--dt-mono, ui-monospace, monospace);
		color: var(--dt-text-3, rgba(100, 116, 139, 0.7));
		white-space: nowrap;
		pointer-events: none;
	}
	.fs-tick--half { bottom: auto; height: calc(18px + 8px); }
	.fs-tick--half::before {
		top: 18px;
		height: 6px;
		bottom: auto;
		opacity: 0.4;
	}

	/* ─── Now-line ────────────────────────────────────── */
	.fs-now {
		position: absolute;
		top: 0;
		bottom: 0;
		z-index: 10;
		pointer-events: none;
		transform: translateX(-1px);
	}
	.fs-now-line {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 2px;
		background: var(--dt-accent, #ef4444);
		box-shadow: 0 0 8px var(--dt-glow, rgba(239, 68, 68, 0.35));
	}
	.fs-now-tag {
		position: absolute;
		top: 8px;
		left: 8px;
		font: 700 11px/1 var(--dt-mono, ui-monospace, monospace);
		color: var(--dt-accent, #ef4444);
		background: color-mix(in srgb, var(--dt-bg, #0b0e14) 92%, var(--dt-accent, #ef4444));
		border: 1px solid var(--dt-accent-dim, rgba(239, 68, 68, 0.18));
		padding: 3px 6px;
		border-radius: 4px;
		white-space: nowrap;
		z-index: 1;
	}
	.fs-now-sec {
		font-weight: 400;
		opacity: 0.5;
		font-size: 10px;
	}

	/* ─── Floating date label ────────────────────────── */
	.fs-date-label {
		position: absolute;
		top: 22px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
		font: 600 11px/1 var(--dt-sans, system-ui, sans-serif);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
		background: color-mix(in srgb, var(--dt-surface, #10141c) 85%, transparent);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid var(--dt-border, rgba(148, 163, 184, 0.07));
		pointer-events: none;
		white-space: nowrap;
	}

	/* ─── Navigation pills ────────────────────────────── */
	.fs-nav {
		position: absolute;
		top: 22px;
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
	.fs-nav-pill {
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
	.fs-nav-pill:hover {
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
	}
	.fs-nav-today {
		max-width: 60px;
		overflow: hidden;
		white-space: nowrap;
		transition: max-width 250ms ease, padding 250ms ease, opacity 200ms ease;
	}
	.fs-nav-today--hidden {
		max-width: 0;
		padding-left: 0;
		padding-right: 0;
		opacity: 0;
		pointer-events: none;
	}
	.fs-nav-pill:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--dt-accent, #ef4444) 55%, transparent);
		outline-offset: 2px;
	}

	/* ─── All-day strip ─────────────────────────────── */
	.fs-allday {
		position: absolute;
		left: 0;
		right: 0;
		display: flex;
		gap: 6px;
		padding: 0 8px;
		z-index: 7;
		overflow-x: auto;
		scrollbar-width: none;
		pointer-events: auto;
	}
	.fs-allday::-webkit-scrollbar { display: none; }

	.fs-ad {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 4px;
		background: color-mix(in srgb, var(--ev-color) 18%, var(--dt-surface, #10141c));
		border-left: 3px solid var(--ev-color);
		white-space: nowrap;
		flex-shrink: 0;
		cursor: pointer;
		transition: background 0.15s;
	}
	.fs-ad:hover {
		background: color-mix(in srgb, var(--ev-color) 28%, var(--dt-surface, #10141c));
	}
	.fs-ad:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--dt-accent, #ef4444) 55%, transparent);
		outline-offset: 2px;
	}
	.fs-ad--selected {
		background: color-mix(in srgb, var(--ev-color) 30%, var(--dt-surface, #10141c));
		border-left-width: 4px;
	}

	.fs-ad-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--ev-color);
		flex-shrink: 0;
	}

	.fs-ad-title {
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--dt-text, #e2e8f0);
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fs-ad-span {
		font-size: 0.6rem;
		color: var(--dt-text-2, rgba(148, 163, 184, 0.55));
		flex-shrink: 0;
	}

	/* ─── Events ─────────────────────────────────────── */
	.fs-event {
		position: absolute;
		z-index: 6;
		border-radius: 6px;
		cursor: pointer;
		background: color-mix(in srgb, var(--ev-color) 15%, var(--dt-surface, #10141c));
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: box-shadow 120ms, background 120ms;
	}
	.fs-event:hover {
		background: color-mix(in srgb, var(--ev-color) 25%, var(--dt-surface, #10141c));
		box-shadow: 0 2px 12px color-mix(in srgb, var(--ev-color) 25%, transparent);
	}
	.fs-event--selected {
		box-shadow: 0 0 0 2px var(--ev-color), 0 2px 14px color-mix(in srgb, var(--ev-color) 35%, transparent);
	}
	.fs-event--current {
		background: color-mix(in srgb, var(--ev-color) 22%, var(--dt-surface, #10141c));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ev-color) 20%, transparent);
	}
	.fs-event--next {
		background: color-mix(in srgb, var(--ev-color) 12%, var(--dt-surface, #10141c));
		border: 1px dashed color-mix(in srgb, var(--ev-color) 35%, transparent);
	}
	.fs-event--dragging {
		opacity: 0.85;
		z-index: 50;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
		cursor: grabbing;
		transition: none;
	}
	.fs-event--cancelled {
		opacity: 0.5;
	}
	.fs-event--cancelled .fs-ev-title {
		text-decoration: line-through;
	}
	.fs-event--tentative {
		opacity: 0.65;
		border: 1px dashed color-mix(in srgb, var(--ev-color) 40%, transparent);
	}

	/* Event inner (vertical text, bottom-to-top reading) */
	.fs-ev-inner {
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		display: flex;
		align-items: center;
		gap: 6px;
		max-height: 100%;
		overflow: hidden;
		padding: 8px 4px;
	}
	.fs-ev-live {
		flex-shrink: 0;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--ev-color);
	}
	.fs-ev-next-badge {
		flex-shrink: 0;
		font: 600 8px/1 var(--dt-sans, system-ui, sans-serif);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--ev-color, var(--dt-accent));
		background: color-mix(in srgb, var(--ev-color, var(--dt-accent)) 15%, transparent);
		padding: 2px 5px;
		border-radius: 3px;
		white-space: nowrap;
	}
	.fs-ev-title {
		font: 600 13px/1.15 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text, rgba(226, 232, 240, 0.92));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fs-ev-time {
		font: 400 10px/1 var(--dt-mono, ui-monospace, monospace);
		color: var(--dt-text-2, rgba(148, 163, 184, 0.72));
		opacity: 0.7;
		white-space: nowrap;
	}
	.fs-ev-sub {
		font: 400 11px/1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text-2, rgba(148, 163, 184, 0.72));
		opacity: 0.6;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.fs-ev-loc {
		font: 400 10px/1 var(--dt-sans, system-ui, sans-serif);
		color: var(--dt-text-3, rgba(148, 163, 184, 0.5));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.fs-ev-tags { display: flex; gap: 4px; }
	.fs-ev-tag {
		font: 500 8px/1 var(--dt-sans, system-ui, sans-serif);
		color: var(--ev-color, var(--dt-accent));
		background: color-mix(in srgb, var(--ev-color, var(--dt-accent)) 18%, transparent);
		padding: 1px 4px;
		border-radius: 3px;
		white-space: nowrap;
	}

	/* ─── Focus-visible ──────────────────────────────── */
	.fs-event:focus-visible {
		outline: 2px solid var(--dt-accent, #ef4444);
		outline-offset: 2px;
	}
</style>


