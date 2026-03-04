/**
 * Recurring event adapter — projects recurring schedules onto concrete dates
 * for whatever range the calendar is viewing.
 *
 * Supports daily, weekly, and monthly recurrence with optional interval,
 * start/end bounds, and occurrence count limits.
 *
 * Usage:
 *   import { createRecurringAdapter } from '@nomideusz/svelte-calendar';
 *
 *   const adapter = createRecurringAdapter([
 *     // Weekly yoga every Monday (default frequency)
 *     { id: '1', title: 'Yoga', dayOfWeek: 1, startTime: '07:00', endTime: '08:30' },
 *
 *     // Biweekly team sync
 *     { id: '2', title: 'Sync', frequency: 'weekly', interval: 2,
 *       dayOfWeek: 2, startTime: '14:00', endTime: '15:00',
 *       startDate: '2025-03-01' },
 *
 *     // Daily standup, March only
 *     { id: '3', title: 'Standup', frequency: 'daily',
 *       startTime: '09:00', endTime: '09:15',
 *       startDate: '2025-03-01', until: '2025-03-31' },
 *
 *     // Workshop — 8 Saturday sessions
 *     { id: '4', title: 'Workshop', dayOfWeek: 6,
 *       startTime: '10:00', endTime: '12:00',
 *       startDate: '2025-03-01', count: 8 },
 *
 *     // Mon/Wed/Fri class during semester
 *     { id: '5', title: 'Math', dayOfWeek: [1, 3, 5],
 *       startTime: '09:00', endTime: '10:00',
 *       startDate: '2025-09-01', until: '2025-12-15' },
 *
 *     // Monthly review on the 15th
 *     { id: '6', title: 'Review', frequency: 'monthly', dayOfMonth: 15,
 *       startTime: '10:00', endTime: '11:00' },
 *   ]);
 */
import type { TimelineEvent } from '../core/types.js';
import type { CalendarAdapter, DateRange } from './types.js';
import { startOfWeek, DAY_MS } from '../core/time.js';
import { VIVID_PALETTE } from '../core/palette.js';

// ── Types ───────────────────────────────────────────────

/**
 * A recurring event definition.
 *
 * Backward-compatible: the only required fields are `id`, `title`,
 * `startTime`, `endTime`, and `dayOfWeek` (for weekly, the default).
 */
export interface RecurringEvent {
	id: string;
	title: string;
	/** Start time in "HH:MM" 24-hour format */
	startTime: string;
	/** End time in "HH:MM" 24-hour format */
	endTime: string;

	// ── Recurrence rule ──

	/** Recurrence frequency (default: `'weekly'`) */
	frequency?: 'daily' | 'weekly' | 'monthly';
	/**
	 * Repeat every N periods — e.g. `2` with `weekly` = biweekly.
	 * Requires `startDate` when > 1 so the adapter knows the anchor.
	 * @default 1
	 */
	interval?: number;
	/**
	 * ISO weekday(s): 1 = Monday … 7 = Sunday.
	 * Required for `weekly` frequency. Pass an array for multiple days
	 * (e.g. `[1, 3, 5]` for Mon/Wed/Fri).
	 */
	dayOfWeek?: number | number[];
	/**
	 * Day of month (1–31). Required for `monthly` frequency.
	 * Clamped to the last day of shorter months (e.g. 31 → 28 in Feb).
	 * @default 1
	 */
	dayOfMonth?: number;

	// ── Bounds ──

	/**
	 * First possible occurrence in `"YYYY-MM-DD"` format.
	 * Events before this date are excluded. Required when using
	 * `interval > 1` or `count`.
	 */
	startDate?: string;
	/**
	 * Last possible occurrence in `"YYYY-MM-DD"` format.
	 * No events are generated after this date.
	 */
	until?: string;
	/**
	 * Maximum number of occurrences, counted from `startDate`.
	 * Alternative to `until` — if both are set the stricter bound wins.
	 * Requires `startDate`.
	 */
	count?: number;

	// ── Event fields ──

	/** Accent color */
	color?: string;
	/** Optional subtitle displayed below the title */
	subtitle?: string;
	/** Optional tags displayed as small pills */
	tags?: string[];
	/** Category for grouping */
	category?: string;
	/** Location or room name */
	location?: string;
	/** Resource ID for multi-resource views */
	resourceId?: string;
	/** Arbitrary payload */
	data?: Record<string, unknown>;
}

export interface RecurringAdapterOptions {
	/** Start weeks on Monday (default: true) */
	mondayStart?: boolean;
	/**
	 * Custom color palette for auto-coloring events.
	 * Pass `generatePalette('#yourAccent')` to get theme-harmonious colors,
	 * or provide your own array of hex strings.
	 * Defaults to the built-in vivid palette.
	 */
	palette?: string[];
}

// ── Helpers ─────────────────────────────────────────────

/** Parse "HH:MM" into [hours, minutes] */
function parseTime(time: string): [number, number] {
	const parts = time.split(':');
	if (parts.length < 2) {
		throw new Error(`Invalid time format "${time}": expected "HH:MM"`);
	}
	const h = Number(parts[0]);
	const m = Number(parts[1]);
	if (!Number.isInteger(h) || h < 0 || h > 23) {
		throw new Error(`Invalid hours in time "${time}": expected 0–23`);
	}
	if (!Number.isInteger(m) || m < 0 || m > 59) {
		throw new Error(`Invalid minutes in time "${time}": expected 0–59`);
	}
	return [h, m];
}

/** Parse "YYYY-MM-DD" to a midnight Date */
function parseDate(str: string): Date {
	const parts = str.split('-');
	if (parts.length !== 3) throw new Error(`Invalid date "${str}": expected "YYYY-MM-DD"`);
	const y = Number(parts[0]);
	const m = Number(parts[1]) - 1;
	const d = Number(parts[2]);
	const date = new Date(y, m, d);
	if (Number.isNaN(date.getTime())) throw new Error(`Invalid date "${str}"`);
	return date;
}

/** ISO weekday offset from Monday: 1→0, 2→1, … 7→6 */
function isoWeekdayToOffset(dayOfWeek: number): number {
	return dayOfWeek - 1;
}

/** Normalize `dayOfWeek` to a sorted array */
function normalizeDays(value: number | number[] | undefined): number[] {
	if (value == null) return [];
	const arr = Array.isArray(value) ? [...value] : [value];
	return arr.sort((a, b) => a - b);
}

/** Clamp day to last day of month (e.g. 31 → 28 in Feb) */
function clampDayOfMonth(year: number, month: number, day: number): Date {
	const lastDay = new Date(year, month + 1, 0).getDate();
	return new Date(year, month, Math.min(day, lastDay));
}

/** Format a Date as a compact "YYYYMMDD" key for stable instance IDs. */
function dateKey(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}${m}${day}`;
}

/** Create a concrete TimelineEvent from a recurring def + occurrence date */
function createConcreteEvent(
	rec: RecurringEvent,
	date: Date,
): TimelineEvent {
	const [sh, sm] = parseTime(rec.startTime);
	const [eh, em] = parseTime(rec.endTime);
	const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), sh, sm);
	const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), eh, em);
	return {
		id: `${rec.id}--${dateKey(date)}`,
		title: rec.title,
		start,
		end,
		color: rec.color,
		category: rec.category,
		subtitle: rec.subtitle,
		tags: rec.tags,
		location: rec.location,
		resourceId: rec.resourceId,
		data: { ...rec.data, recurringId: rec.id },
	};
}

// ── Count → until resolution ────────────────────────────

/**
 * When `count` is set, compute the date of the last occurrence so the
 * projection loop only needs to check date bounds.
 */
function computeUntilFromCount(
	rec: RecurringEvent,
	startDateObj: Date,
	mondayStart: boolean,
): Date | undefined {
	const count = rec.count;
	if (count == null || count <= 0) return undefined;

	const freq = rec.frequency ?? 'weekly';
	const interval = rec.interval ?? 1;

	switch (freq) {
		case 'daily': {
			const d = new Date(startDateObj);
			d.setDate(d.getDate() + (count - 1) * interval);
			return d;
		}
		case 'weekly': {
			const days = normalizeDays(rec.dayOfWeek);
			if (days.length === 0) return undefined;
			const startMs = startDateObj.getTime();
			let weekMs = startOfWeek(startMs, mondayStart);
			let remaining = count;
			const maxCycles = Math.ceil(count / days.length) + 2;

			for (let c = 0; c < maxCycles; c++) {
				for (const day of days) {
					const dayMs = weekMs + isoWeekdayToOffset(day) * DAY_MS;
					if (dayMs >= startMs) {
						remaining--;
						if (remaining === 0) return new Date(dayMs);
					}
				}
				weekMs += interval * 7 * DAY_MS;
			}
			return undefined;
		}
		case 'monthly': {
			const totalMonths =
				startDateObj.getFullYear() * 12 +
				startDateObj.getMonth() +
				(count - 1) * interval;
			const y = Math.floor(totalMonths / 12);
			const m = totalMonths % 12;
			return clampDayOfMonth(y, m, rec.dayOfMonth ?? 1);
		}
	}
}

// ── Projection functions ────────────────────────────────

function projectDaily(
	rec: RecurringEvent,
	range: DateRange,
	startDate: Date | undefined,
	effectiveUntil: Date | undefined,
	out: TimelineEvent[],
): void {
	const interval = rec.interval ?? 1;

	// Anchor at startDate or range.start (midnight)
	const anchor = new Date(startDate ?? range.start);
	anchor.setHours(0, 0, 0, 0);

	const rangeStart = new Date(range.start);
	rangeStart.setHours(0, 0, 0, 0);

	// Skip ahead to first occurrence at or after range.start
	const cursor = new Date(anchor);
	if (cursor < rangeStart) {
		const daysBetween = Math.round((rangeStart.getTime() - cursor.getTime()) / DAY_MS);
		const skip = Math.floor(daysBetween / interval);
		cursor.setDate(cursor.getDate() + skip * interval);
		if (cursor < rangeStart) cursor.setDate(cursor.getDate() + interval);
	}

	while (cursor < range.end) {
		if (effectiveUntil && cursor > effectiveUntil) break;

		const ev = createConcreteEvent(rec, cursor);
		if (ev.start < range.end && ev.end > range.start) {
			out.push(ev);
		}
		cursor.setDate(cursor.getDate() + interval);
	}
}

function projectWeekly(
	rec: RecurringEvent,
	range: DateRange,
	startDate: Date | undefined,
	effectiveUntil: Date | undefined,
	mondayStart: boolean,
	out: TimelineEvent[],
): void {
	const interval = rec.interval ?? 1;
	const days = normalizeDays(rec.dayOfWeek);
	if (days.length === 0) return;

	const startDateMs = startDate?.getTime();
	const rangeStartMs = range.start.getTime();
	const rangeEndMs = range.end.getTime();

	// Anchor week: week containing startDate, or range.start if none
	const anchorMs = startDateMs ?? rangeStartMs;
	const anchorWeekMs = startOfWeek(anchorMs, mondayStart);

	// Jump to first interval-aligned week that could overlap the range
	let weekMs: number;
	if (anchorWeekMs >= rangeStartMs) {
		weekMs = anchorWeekMs;
	} else {
		const weeksBetween = Math.floor((rangeStartMs - anchorWeekMs) / (7 * DAY_MS));
		const skip = Math.floor(weeksBetween / interval);
		weekMs = anchorWeekMs + skip * interval * 7 * DAY_MS;
		if (weekMs + 7 * DAY_MS <= rangeStartMs) {
			weekMs += interval * 7 * DAY_MS;
		}
	}

	while (weekMs < rangeEndMs) {
		for (const day of days) {
			const dayMs = weekMs + isoWeekdayToOffset(day) * DAY_MS;
			if (startDateMs != null && dayMs < startDateMs) continue;
			if (dayMs >= rangeEndMs) break;
			if (effectiveUntil && dayMs > effectiveUntil.getTime()) return;

			const dayDate = new Date(dayMs);
			const ev = createConcreteEvent(rec, dayDate);
			if (ev.start < range.end && ev.end > range.start) {
				out.push(ev);
			}
		}
		weekMs += interval * 7 * DAY_MS;
	}
}

function projectMonthly(
	rec: RecurringEvent,
	range: DateRange,
	startDate: Date | undefined,
	effectiveUntil: Date | undefined,
	out: TimelineEvent[],
): void {
	const interval = rec.interval ?? 1;
	const dayOfMonth = rec.dayOfMonth ?? 1;

	const anchor = startDate ?? range.start;
	let totalMonths = anchor.getFullYear() * 12 + anchor.getMonth();

	// Skip ahead to first interval-aligned month at or near range.start
	if (startDate && startDate < range.start) {
		const rangeMonths = range.start.getFullYear() * 12 + range.start.getMonth();
		const gap = rangeMonths - totalMonths;
		const skip = Math.floor(gap / interval);
		totalMonths += skip * interval;
	}

	for (let i = 0; i < 120; i++) {
		const y = Math.floor(totalMonths / 12);
		const m = totalMonths % 12;
		const date = clampDayOfMonth(y, m, dayOfMonth);

		if (date >= range.end) break;
		if (effectiveUntil && date > effectiveUntil) break;

		if (date >= range.start && (!startDate || date >= startDate)) {
			const ev = createConcreteEvent(rec, date);
			if (ev.start < range.end && ev.end > range.start) {
				out.push(ev);
			}
		}

		totalMonths += interval;
	}
}

// ── Adapter factory ─────────────────────────────────────

/** Default palette for auto-coloring */
const PALETTE = VIVID_PALETTE;

/**
 * Create a CalendarAdapter that projects recurring events onto concrete
 * dates for whatever range the calendar requests.
 *
 * Events without a `color` are auto-assigned one from a vivid palette,
 * grouped by `category` or `title` so related events share a color.
 *
 * Read-only by default — create/update/delete throw.
 */
export function createRecurringAdapter(
	schedule: RecurringEvent[],
	options: RecurringAdapterOptions = {},
): CalendarAdapter {
	const { mondayStart = true, palette } = options;
	const colors = palette?.length ? palette : PALETTE;

	// Auto-color: assign from palette by category/title
	const colorAssignments = new Map<string, string>();
	let colorIndex = 0;
	for (const rec of schedule) {
		if (rec.color) continue;
		const key = rec.category ?? rec.title;
		if (!colorAssignments.has(key)) {
			colorAssignments.set(key, colors[colorIndex % colors.length]);
			colorIndex++;
		}
	}

	function resolveColor(rec: RecurringEvent): string | undefined {
		if (rec.color) return rec.color;
		const key = rec.category ?? rec.title;
		return colorAssignments.get(key);
	}

	return {
		async fetchEvents(range: DateRange): Promise<TimelineEvent[]> {
			const events: TimelineEvent[] = [];

			for (const rec of schedule) {
				const colored = { ...rec, color: resolveColor(rec) };
				const freq = rec.frequency ?? 'weekly';

				// Parse bounds
				const sd = rec.startDate ? parseDate(rec.startDate) : undefined;
				const untilDate = rec.until ? parseDate(rec.until) : undefined;
				const countUntil = sd
					? computeUntilFromCount(rec, sd, mondayStart)
					: undefined;

				// Effective until = tighter of the two bounds
				let effectiveUntil: Date | undefined = untilDate;
				if (countUntil) {
					effectiveUntil = effectiveUntil
						? countUntil < effectiveUntil ? countUntil : effectiveUntil
						: countUntil;
				}

				switch (freq) {
					case 'daily':
						projectDaily(colored, range, sd, effectiveUntil, events);
						break;
					case 'weekly':
						projectWeekly(colored, range, sd, effectiveUntil, mondayStart, events);
						break;
					case 'monthly':
						projectMonthly(colored, range, sd, effectiveUntil, events);
						break;
				}
			}

			return events;
		},

		async createEvent(): Promise<TimelineEvent> {
			throw new Error('createRecurringAdapter is read-only. Use a memory or REST adapter for mutations.');
		},

		async updateEvent(): Promise<TimelineEvent> {
			throw new Error('createRecurringAdapter is read-only. Use a memory or REST adapter for mutations.');
		},

		async deleteEvent(): Promise<void> {
			throw new Error('createRecurringAdapter is read-only. Use a memory or REST adapter for mutations.');
		},
	};
}
