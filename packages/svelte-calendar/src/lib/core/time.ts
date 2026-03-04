/**
 * Core time constants and pure date-math utilities.
 *
 * Uses date-fns for reliable calendar operations (DST-safe, tree-shakeable).
 * Re-exports commonly used date-fns functions so consumers have a single import.
 */
import {
	startOfDay,
	startOfWeek as dfnsStartOfWeek,
	addDays,
	differenceInCalendarDays,
	getDay,
	getDate,
	getHours,
	getMinutes,
	getSeconds,
} from 'date-fns';

// ─── Constants ──────────────────────────────────────────
/** Milliseconds in one day */
export const DAY_MS = 86_400_000;

/** Milliseconds in one hour */
export const HOUR_MS = 3_600_000;

/** Array [0..23] for iterating over hour slots */
export const HOURS: readonly number[] = Array.from({ length: 24 }, (_, i) => i);

// ─── Pure date helpers ──────────────────────────────────

/** Start-of-day timestamp (midnight, local time) */
export function sod(ms: number): number {
	return startOfDay(ms).getTime();
}

/**
 * Start-of-week timestamp.
 * @param ms       Any timestamp within the target week
 * @param mondayStart  true → weeks begin Monday; false → Sunday
 */
export function startOfWeek(ms: number, mondayStart = true): number {
	return dfnsStartOfWeek(ms, { weekStartsOn: mondayStart ? 1 : 0 }).getTime();
}

/** Add `n` days to a timestamp and return the new timestamp */
export function addDaysMs(ms: number, n: number): number {
	return addDays(ms, n).getTime();
}

/** Calendar-day difference between two timestamps */
export function diffDays(a: number, b: number): number {
	return differenceInCalendarDays(a, b);
}

/** Zero-pad a number to 2 digits */
export function pad(n: number): string {
	return n < 10 ? '0' + n : '' + n;
}

/**
 * Fractional hours elapsed since midnight for a given timestamp.
 * e.g. 14:30:00 → 14.5
 */
export function fractionalHour(ms: number): number {
	const d = new Date(ms);
	return getHours(d) + getMinutes(d) / 60 + getSeconds(d) / 3600;
}

/**
 * Format hours + minutes from a timestamp: "14:30"
 */
export function fmtHM(ms: number): string {
	const d = new Date(ms);
	return pad(getHours(d)) + ':' + pad(getMinutes(d));
}

/**
 * Format seconds from a timestamp: ":05"
 */
export function fmtS(ms: number): string {
	return ':' + pad(getSeconds(new Date(ms)));
}

/** Day-of-month number for a timestamp */
export function dayNum(ms: number): number {
	return getDate(new Date(ms));
}

/** Day-of-week index (0 = Sun … 6 = Sat) */
export function dayOfWeek(ms: number): number {
	return getDay(new Date(ms));
}

// ─── Multi-day event helpers ────────────────────────────

import type { TimelineEvent } from './types.js';

/** Does an event span more than one calendar day? */
export function isMultiDay(ev: TimelineEvent): boolean {
	return sod(ev.start.getTime()) !== sod(ev.end.getTime() - 1);
}

/** Is an event effectively all-day? (allDay flag, or spans ≥24h with midnight boundaries) */
export function isAllDay(ev: TimelineEvent): boolean {
	if (ev.allDay) return true;
	const duration = ev.end.getTime() - ev.start.getTime();
	if (duration < DAY_MS) return false;
	const s = ev.start;
	return s.getHours() === 0 && s.getMinutes() === 0 && s.getSeconds() === 0;
}

/**
 * Describes how an event appears on a specific day.
 */
export interface DaySegment {
	ev: TimelineEvent;
	/** Effective start for this day (clamped to day start) */
	start: Date;
	/** Effective end for this day (clamped to day end) */
	end: Date;
	/** Is this the first day of the event? */
	isStart: boolean;
	/** Is this the last day of the event? */
	isEnd: boolean;
	/** 1-based day index within the span */
	dayIndex: number;
	/** Total number of days the event spans */
	totalDays: number;
	/** Is this an all-day event? */
	allDay: boolean;
}

/**
 * Compute how an event appears on a specific day.
 * Returns null if the event doesn't overlap the day.
 */
export function segmentForDay(ev: TimelineEvent, dayMs: number): DaySegment | null {
	const dayStart = sod(dayMs);
	const dayEnd = dayStart + DAY_MS;
	const evStart = ev.start.getTime();
	const evEnd = ev.end.getTime();

	// No overlap
	if (evStart >= dayEnd || evEnd <= dayStart) return null;

	const firstDayMs = sod(evStart);
	// For end time: if event ends exactly at midnight, last day is the day before
	const lastDayMs = sod(evEnd - 1);
	const totalDays = Math.floor((lastDayMs - firstDayMs) / DAY_MS) + 1;
	const dayIndex = Math.floor((dayStart - firstDayMs) / DAY_MS) + 1;

	return {
		ev,
		start: new Date(Math.max(evStart, dayStart)),
		end: new Date(Math.min(evEnd, dayEnd)),
		isStart: dayStart === firstDayMs,
		isEnd: dayStart === lastDayMs,
		dayIndex,
		totalDays,
		allDay: isAllDay(ev),
	};
}
