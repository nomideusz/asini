/**
 * Timezone utilities — convert between IANA timezones and local time.
 *
 * Uses date-fns-tz under the hood. All functions accept an IANA timezone
 * string (e.g. 'America/New_York', 'Europe/Warsaw', 'Asia/Tokyo').
 *
 * Usage:
 *   import { toZonedTime, fromZonedTime, nowInZone } from '@nomideusz/svelte-calendar';
 *
 *   // Convert a UTC date to display in a specific timezone
 *   const localDate = toZonedTime(utcDate, 'America/New_York');
 *
 *   // Convert a "display" date back to UTC for storage
 *   const utcDate = fromZonedTime(localDate, 'America/New_York');
 *
 *   // Get current time in a timezone
 *   const now = nowInZone('Asia/Tokyo');
 */
import { toZonedTime as dfnsToZoned, fromZonedTime as dfnsFromZoned } from 'date-fns-tz';

/**
 * Convert a Date (assumed UTC or local) to a Date representing
 * the same instant in the target timezone.
 *
 * The returned Date's local getters (getHours, getMinutes, etc.)
 * will return the values as they appear in the target timezone.
 */
export function toZonedTime(date: Date | number, timezone: string): Date {
	return dfnsToZoned(date, timezone);
}

/**
 * Convert a "zoned" Date (whose local getters represent a specific timezone)
 * back to a true UTC Date. Use this before persisting to a backend.
 */
export function fromZonedTime(date: Date | number, timezone: string): Date {
	return dfnsFromZoned(date, timezone);
}

/**
 * Get the current time as it appears in the given timezone.
 */
export function nowInZone(timezone: string): Date {
	return dfnsToZoned(new Date(), timezone);
}

/**
 * Format a Date in a specific timezone using Intl.DateTimeFormat.
 * Returns a locale-aware string.
 */
export function formatInTimeZone(
	date: Date | number,
	timezone: string,
	options: Intl.DateTimeFormatOptions = {},
	locale?: string,
): string {
	const d = typeof date === 'number' ? new Date(date) : date;
	return new Intl.DateTimeFormat(locale ?? 'en-US', {
		...options,
		timeZone: timezone,
	}).format(d);
}
