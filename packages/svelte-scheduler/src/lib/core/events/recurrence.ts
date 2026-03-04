/**
 * Recurrence expansion for ScheduleRules.
 *
 * Pure function — no DB, no side effects.
 * Uses Intl.DateTimeFormat for timezone handling — no external deps.
 */

import type { ScheduleRule } from '../types.js';

// DateRange is { start: Date; end: Date } — structurally compatible with
// @nomideusz/svelte-calendar's DateRange (peer dep, imported at the package index level).
type DateRange = { start: Date; end: Date };

/** Milliseconds in a single day. */
const MS_PER_DAY = 86_400_000;

/** A single expanded occurrence: wall-clock start and end as UTC Date objects. */
export interface OccurrencePair {
	startTime: Date;
	endTime: Date;
}

/**
 * Parse an HH:MM time string into { hours, minutes }.
 */
function parseHHMM(hhmm: string): { hours: number; minutes: number } {
	const [h, m] = hhmm.split(':').map(Number);
	return { hours: h, minutes: m };
}

/**
 * Convert a calendar date (year, month 1-based, day) plus HH:MM time
 * into a UTC Date, interpreting the time in the given IANA timezone.
 *
 * Uses Intl.DateTimeFormat with 'en-CA' locale (YYYY-MM-DD output) to
 * determine the UTC offset for any IANA timezone, including DST transitions.
 */
function localToUTC(
	year: number,
	month: number,
	day: number,
	hours: number,
	minutes: number,
	timezone: string
): Date {
	// Build an ISO string for the local datetime and parse it with the timezone offset.
	// We use Intl.DateTimeFormat to determine the UTC offset for this timezone on this date.
	// Strategy: construct a UTC candidate and adjust by the offset of that timezone.
	const isoLocal = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

	// We interpret the local time as UTC first to get a Date, then find the real offset.
	const naiveUTC = new Date(isoLocal + 'Z');

	// Get the local time components for naiveUTC in the target timezone.
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});
	const parts = formatter.formatToParts(naiveUTC);

	const getPart = (type: string): number => {
		const part = parts.find((p) => p.type === type);
		return part ? Number(part.value) : 0;
	};

	const tzYear = getPart('year');
	const tzMonth = getPart('month');
	const tzDay = getPart('day');
	const tzHour = getPart('hour') % 24;
	const tzMinute = getPart('minute');
	const tzSecond = getPart('second');

	// Compute the offset: how far naiveUTC is from actual local time.
	const tzUTC = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
	const offsetMs = naiveUTC.getTime() - tzUTC;

	// The true UTC time is naiveUTC adjusted by the offset.
	return new Date(naiveUTC.getTime() + offsetMs);
}

/**
 * Get the ISO day-of-week (1=Monday … 7=Sunday) for a given UTC Date,
 * interpreted in the specified timezone.
 */
function getISODayOfWeek(date: Date, timezone: string): number {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		weekday: 'long',
	});
	const name = formatter.format(date);
	const map: Record<string, number> = {
		Monday: 1,
		Tuesday: 2,
		Wednesday: 3,
		Thursday: 4,
		Friday: 5,
		Saturday: 6,
		Sunday: 7,
	};
	return map[name] ?? 1;
}

/**
 * Return the local calendar date (year, month 1-based, day) for a UTC Date
 * interpreted in the given timezone.
 */
function getLocalDate(
	date: Date,
	timezone: string
): { year: number; month: number; day: number } {
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
	const [datePart] = formatter.format(date).split(', ');
	const [y, mo, d] = datePart.split('-').map(Number);
	return { year: y, month: mo, day: d };
}

/**
 * Advance a local calendar date by one day, handling month/year boundaries.
 */
function addOneDay(year: number, month: number, day: number): { year: number; month: number; day: number } {
	const d = new Date(Date.UTC(year, month - 1, day + 1));
	return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Expand a ScheduleRule into concrete { startTime, endTime } pairs
 * that fall within the given DateRange.
 *
 * - `pattern: 'once'`   → 0 or 1 occurrence (only if validFrom is in range)
 * - `pattern: 'weekly'` → one per matching weekday within range, respecting validUntil
 * - `pattern: 'custom'` → empty array (TODO: custom recurrence)
 */
export function expandRule(rule: ScheduleRule, range: DateRange): OccurrencePair[] {
	const { timezone, startTime: startHHMM, endTime: endHHMM } = rule;
	const start = parseHHMM(startHHMM);
	const end = parseHHMM(endHHMM);

	if (rule.pattern === 'once') {
		// validFrom is an ISO date string like '2024-03-15' (may include time portion)
		const [y, mo, d] = rule.validFrom.slice(0, 10).split('-').map(Number);
		const slotStart = localToUTC(y, mo, d, start.hours, start.minutes, timezone);
		const slotEnd = localToUTC(y, mo, d, end.hours, end.minutes, timezone);

		// If end is before start (crosses midnight), advance end by one day
		const adjustedEnd = slotEnd <= slotStart ? new Date(slotEnd.getTime() + MS_PER_DAY) : slotEnd;

		if (slotStart >= range.start && slotStart < range.end) {
			return [{ startTime: slotStart, endTime: adjustedEnd }];
		}
		return [];
	}

	if (rule.pattern === 'weekly') {
		const daysOfWeek = rule.daysOfWeek ?? [];
		if (daysOfWeek.length === 0) return [];

		const results: OccurrencePair[] = [];

		// Determine the effective start: the later of range.start and validFrom.
		const [vy, vmo, vd] = rule.validFrom.slice(0, 10).split('-').map(Number);
		const validFromUTC = localToUTC(vy, vmo, vd, 0, 0, timezone);
		const effectiveStart = validFromUTC > range.start ? validFromUTC : range.start;

		// Determine the effective end: the earlier of range.end and validUntil (if set).
		// validUntil is inclusive — we use the start of the next day as the exclusive bound.
		let effectiveEnd = range.end;
		if (rule.validUntil) {
			const [ey, emo, ed] = rule.validUntil.slice(0, 10).split('-').map(Number);
			const { year: ny, month: nm, day: nd } = addOneDay(ey, emo, ed);
			const validUntilExclusive = localToUTC(ny, nm, nd, 0, 0, timezone);
			if (validUntilExclusive < effectiveEnd) {
				effectiveEnd = validUntilExclusive;
			}
		}

		if (effectiveStart >= effectiveEnd) return [];

		// Walk day-by-day in the target timezone from effectiveStart to effectiveEnd.
		let { year, month, day } = getLocalDate(effectiveStart, timezone);

		// Cap iteration at 2 years of daily steps to prevent infinite loops from
		// pathological inputs (e.g. validFrom far in the past, no validUntil).
		const maxIterations = 365 * 2 + 1;
		let iterations = 0;

		while (iterations < maxIterations) {
			const slotStart = localToUTC(year, month, day, start.hours, start.minutes, timezone);

			if (slotStart >= effectiveEnd) break;

			if (slotStart >= effectiveStart) {
				const isoDow = getISODayOfWeek(slotStart, timezone);
				if (daysOfWeek.includes(isoDow)) {
					const slotEnd = localToUTC(year, month, day, end.hours, end.minutes, timezone);
					const adjustedEnd = slotEnd <= slotStart ? new Date(slotEnd.getTime() + MS_PER_DAY) : slotEnd;
					results.push({ startTime: slotStart, endTime: adjustedEnd });
				}
			}

			({ year, month, day } = addOneDay(year, month, day));
			iterations++;
		}

		return results;
	}

	// custom — not yet implemented
	// TODO: custom recurrence
	return [];
}
