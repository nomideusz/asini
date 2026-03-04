/**
 * Reactive view state — tracks which view is active, the current date range,
 * and navigation (prev/next/today).
 *
 * Usage:
 *   const vs = createViewState({ view: 'week-terrain' });
 *   vs.view        — current view id
 *   vs.focusDate   — the center date
 *   vs.range       — { start, end } for the current view window
 *   vs.next()      — advance one period (day/week depending on view)
 *   vs.prev()      — go back one period
 *   vs.goToday()   — jump to today
 */
import { startOfWeek as calcStartOfWeek, addDaysMs, DAY_MS } from '../core/time.js';
import type { DateRange } from '../adapters/types.js';
export type { DateRange };

/**
 * Built-in view IDs. Custom view IDs are also supported — CalendarViewId
 * is typed as `string` so consumers can register any ID.
 */
export type BuiltInViewId =
	| 'day-planner'
	| 'day-agenda'
	| 'week-planner'
	| 'week-agenda';

/**
 * Any view identifier. Use built-in strings like 'day-planner' or your own
 * custom IDs like 'day-kanban', 'week-resource', etc.
 */
export type CalendarViewId = string;

export type ViewMode = 'day' | 'week';

export interface ViewStateOptions {
	view?: CalendarViewId;
	mondayStart?: boolean;
	/** IANA timezone string (e.g. 'America/New_York'). Defaults to local timezone. */
	timezone?: string;
	/** Initial date to focus on (defaults to today). */
	initialDate?: Date;
	/** Number of days shown in week mode (default: 7). E.g. 3 for a 3-day view, 5 for workweek. */
	dayCount?: number;
	/**
	 * Optional resolver for view mode.
	 * Useful for custom IDs that don't follow "day-*" / "week-*" naming.
	 */
	modeForView?: (viewId: CalendarViewId) => ViewMode | undefined;
}


export interface ViewState {
	readonly view: CalendarViewId;
	readonly focusDate: Date;
	readonly range: DateRange;
	readonly mode: ViewMode;
	readonly mondayStart: boolean;
	/** IANA timezone, or undefined for local */
	readonly timezone: string | undefined;
	/** Number of days shown in week mode */
	readonly dayCount: number;

	setView(id: CalendarViewId): void;
	setMondayStart(value: boolean): void;
	setFocusDate(date: Date): void;
	setDayCount(n: number): void;
	next(): void;
	prev(): void;
	goToday(): void;
}

function inferMode(view: CalendarViewId): ViewMode {
	if (view.startsWith('day')) return 'day';
	return 'week';
}

function computeRange(
	focus: Date,
	mode: ViewMode,
	mondayStart: boolean,
	dayCount: number = 7,
): DateRange {
	if (mode === 'day') {
		const start = new Date(focus);
		start.setHours(0, 0, 0, 0);
		const end = new Date(start.getTime() + DAY_MS);
		return { start, end };
	}
	// week / custom period
	if (dayCount === 7) {
		const ws = calcStartOfWeek(focus.getTime(), mondayStart);
		return {
			start: new Date(ws),
			end: new Date(addDaysMs(ws, 7)),
		};
	}
	// Custom day count: start from sod of focus
	const start = new Date(focus);
	start.setHours(0, 0, 0, 0);
	return {
		start,
		end: new Date(start.getTime() + dayCount * DAY_MS),
	};
}

export function createViewState(options: ViewStateOptions = {}): ViewState {
	let view = $state<CalendarViewId>(options.view ?? 'week-planner');
	let focusDate = $state<Date>(options.initialDate ?? new Date());
	let mondayStart = $state(options.mondayStart ?? true);
	let dayCount = $state(options.dayCount ?? 7);
	const timezone = options.timezone;
	const modeResolver = options.modeForView;

	const mode = $derived(modeResolver?.(view) ?? inferMode(view));
	const range = $derived(computeRange(focusDate, mode, mondayStart, dayCount));

	return {
		get view() {
			return view;
		},
		get focusDate() {
			return focusDate;
		},
		get range() {
			return range;
		},
		get mode() {
			return mode;
		},
		get mondayStart() {
			return mondayStart;
		},
		get timezone() {
			return timezone;
		},
		get dayCount() {
			return dayCount;
		},

		setView(id: CalendarViewId) {
			view = id;
		},

		setMondayStart(value: boolean) {
			mondayStart = value;
		},

		setFocusDate(date: Date) {
			focusDate = date;
		},

		setDayCount(n: number) {
			dayCount = n;
		},

		next() {
			const days = mode === 'day' ? 1 : dayCount;
			focusDate = new Date(addDaysMs(focusDate.getTime(), days));
		},

		prev() {
			const days = mode === 'day' ? -1 : -dayCount;
			focusDate = new Date(addDaysMs(focusDate.getTime(), days));
		},

		goToday() {
			focusDate = new Date();
		},
	};
}
