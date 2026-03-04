// ─── Core barrel export ─────────────────────────────────

// Clock
export { createClock } from './clock.svelte.js';
export type { Clock } from './clock.svelte.js';

// Time constants & math
export {
	DAY_MS,
	HOUR_MS,
	HOURS,
	sod,
	startOfWeek,
	addDaysMs,
	diffDays,
	pad,
	fractionalHour,
	fmtHM,
	fmtS,
	dayNum,
	dayOfWeek,
	isMultiDay,
	isAllDay,
	segmentForDay,
} from './time.js';
export type { DaySegment } from './time.js';

// Locale-aware formatting
export {
	setDefaultLocale,
	getDefaultLocale,
	is24HourLocale,
	fmtH,
	fmtTime,
	fmtDuration,
	weekdayShort,
	weekdayLong,
	monthShort,
	monthLong,
	dateShort,
	dateWithWeekday,
	fmtDay,
	fmtWeekRange,
	defaultLabels,
	setLabels,
	resetLabels,
	getLabels,
} from './locale.js';
export type { CalendarLabels } from './locale.js';

// Timezone utilities
export {
	toZonedTime,
	fromZonedTime,
	nowInZone,
	formatInTimeZone,
} from './timezone.js';

// Types
export type {
	TimelineEvent,
	BlockedSlot,
	EventStatus,
} from './types.js';

// Palette
export { generatePalette, extractAccent, VIVID_PALETTE } from './palette.js';
