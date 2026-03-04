/**
 * Auto-updating demo events — always relative to "today".
 *
 * Showcases every feature of the calendar:
 *   - subtitle, location, tags, category
 *   - status (confirmed / cancelled / tentative)
 *   - allDay & multi-day spans
 *   - overlapping time slots
 *   - past, present, and future events
 *
 * Recurring events are provided separately as RecurringEvent[]
 * so the demo can use a composite adapter (memory + recurring).
 *
 * Import and use:
 *   import { createDemoEvents, createDemoRecurring } from './demo-events';
 */
import type { TimelineEvent } from '$lib/core/types.js';
import type { RecurringEvent } from '$lib/adapters/recurring.js';

// ── Helpers ─────────────────────────────────────────────

/** Midnight of the given date */
function sod(d: Date): Date {
	const r = new Date(d);
	r.setHours(0, 0, 0, 0);
	return r;
}

/** Monday of the week containing `d` */
function mondayOf(d: Date): Date {
	const day = d.getDay(); // 0=Sun … 6=Sat
	const diff = day === 0 ? -6 : 1 - day;
	const m = sod(d);
	m.setDate(m.getDate() + diff);
	return m;
}

/** Create a Date at `dayOffset` from anchor + hours/minutes */
function at(anchor: Date, dayOffset: number, h: number, m = 0): Date {
	const d = new Date(anchor.getTime() + dayOffset * 86_400_000);
	d.setHours(h, m, 0, 0);
	return d;
}

let _counter = 0;
function uid(): string {
	return `demo-${++_counter}`;
}

type Def = Omit<TimelineEvent, 'id'>;

// ── Event factory ───────────────────────────────────────

/**
/**
 * Generate one-off demo events anchored around `today`.
 * Events span Mon-1 … Sun+1 of the current week.
 * Weekly recurring classes are in createDemoRecurring() instead.
 */
export function createDemoEvents(today: Date = new Date()): TimelineEvent[] {
	_counter = 0;
	const mon = mondayOf(today);

	// dayOffset: 0=Mon, 1=Tue, … 6=Sun, -1=prevSun, 7=nextMon
	const defs: Def[] = [
		// ──────────────────────────────────────────────────
		// MONDAY (day 0) — overlapping yoga + work
		// ──────────────────────────────────────────────────
		{
			title: 'NeuroJoga',
			start: at(mon, 0, 7, 0),
			end: at(mon, 0, 8, 15),
			category: 'yoga',
			subtitle: 'Asia Tarkowska',
			location: 'Studio B',
			tags: ['All Levels'],
		},
		{
			title: 'Sprint Planning',
			start: at(mon, 0, 10, 0),
			end: at(mon, 0, 11, 30),
			category: 'work',
			location: 'Room 4B',
			subtitle: 'Engineering',
			tags: ['Remote OK'],
		},
		{
			title: 'Power Vinyasa',
			start: at(mon, 0, 14, 0),
			end: at(mon, 0, 15, 15),
			category: 'yoga',
			subtitle: 'Denis Kolokol',
			location: 'Studio A',
			tags: ['Advanced'],
		},

		// ──────────────────────────────────────────────────
		// TUESDAY (day 1) — mixed work + wellness
		// ──────────────────────────────────────────────────
		{
			title: '1:1 Check-in',
			start: at(mon, 1, 10, 0),
			end: at(mon, 1, 10, 30),
			category: 'work',
			subtitle: 'Manager',
			location: 'Room 2A',
		},
		{
			title: 'Guided Nidra',
			start: at(mon, 1, 13, 0),
			end: at(mon, 1, 13, 45),
			category: 'wellness',
			subtitle: 'Asia Tarkowska',
			location: 'Studio B',
		},

		// ──────────────────────────────────────────────────
		// WEDNESDAY (day 2) — a cancelled class
		// ──────────────────────────────────────────────────
		{
			title: 'Dynamic Flow',
			start: at(mon, 2, 8, 0),
			end: at(mon, 2, 9, 15),
			category: 'yoga',
			location: 'Studio B',
			status: 'cancelled',
			subtitle: 'Instructor unavailable',
		},
		{
			title: 'Design Review',
			start: at(mon, 2, 11, 0),
			end: at(mon, 2, 12, 0),
			category: 'work',
			location: 'Room 4B',
			subtitle: 'Product Team',
		},
		{
			title: 'Sound Bath',
			start: at(mon, 2, 18, 30),
			end: at(mon, 2, 19, 30),
			category: 'wellness',
			subtitle: 'Live gongs & bowls',
			location: 'Hall',
		},

		// ──────────────────────────────────────────────────
		// THURSDAY (day 3) — tentative event
		// ──────────────────────────────────────────────────
		{
			title: 'Vinyasa Krama',
			start: at(mon, 3, 9, 0),
			end: at(mon, 3, 10, 15),
			category: 'yoga',
			subtitle: 'Monika Jaglarz',
			location: 'Studio B',
		},
		{
			title: 'All-Hands',
			start: at(mon, 3, 10, 30),
			end: at(mon, 3, 11, 30),
			category: 'work',
			location: 'Main Hall',
			tags: ['Mandatory'],
		},
		{
			title: 'Guest Workshop',
			start: at(mon, 3, 15, 0),
			end: at(mon, 3, 17, 0),
			category: 'yoga',
			status: 'tentative',
			subtitle: 'TBC — awaiting confirmation',
			location: 'Studio A',
			tags: ['Special'],
		},

		// ──────────────────────────────────────────────────
		// FRIDAY (day 4) — lighter schedule
		// ──────────────────────────────────────────────────
		{
			title: 'Rocket Yoga',
			start: at(mon, 4, 7, 30),
			end: at(mon, 4, 8, 45),
			category: 'yoga',
			tags: ['Advanced'],
			location: 'Studio A',
		},
		{
			title: 'Retro',
			start: at(mon, 4, 14, 0),
			end: at(mon, 4, 15, 0),
			category: 'work',
			subtitle: 'Engineering',
			location: 'Room 4B',
		},

		// ──────────────────────────────────────────────────
		// SATURDAY (day 5) — weekend workshops
		// ──────────────────────────────────────────────────
		{
			title: 'Arm Balance Workshop',
			start: at(mon, 5, 14, 0),
			end: at(mon, 5, 16, 30),
			category: 'yoga',
			subtitle: 'Denis Kolokol',
			location: 'Studio A',
			tags: ['Advanced', 'Workshop'],
		},

		// ──────────────────────────────────────────────────
		// SUNDAY (day 6) — rest day
		// ──────────────────────────────────────────────────
		{
			title: 'Restorative Yoga',
			start: at(mon, 6, 16, 0),
			end: at(mon, 6, 17, 15),
			category: 'wellness',
			location: 'Studio A',
			tags: ['All Levels'],
		},

		// ──────────────────────────────────────────────────
		// PREVIOUS WEEK — so "yesterday" has content
		// ──────────────────────────────────────────────────
		{
			title: 'Gentle Morning',
			start: at(mon, -1, 9, 30),
			end: at(mon, -1, 10, 30),
			category: 'yoga',
			location: 'Studio B',
		},

		// ──────────────────────────────────────────────────
		// ALL-DAY & MULTI-DAY
		// ──────────────────────────────────────────────────
		{
			title: 'Yoga Retreat',
			start: at(mon, 0, 0),
			end: at(mon, 2, 0),
			allDay: true,
			category: 'wellness',
			subtitle: 'Mountain Lodge',
			location: 'Zakopane',
		},
		{
			title: 'Teacher Training',
			start: at(mon, 5, 0),
			end: at(mon, 6, 0),
			allDay: true,
			category: 'yoga',
			location: 'Studio A',
		},
		{
			title: 'Studio Closed',
			start: at(mon, -2, 0),
			end: at(mon, -1, 0),
			allDay: true,
			category: 'admin',
			status: 'cancelled',
		},
	];

	return defs.map((d) => ({ ...d, id: uid() }));
}

// ── Recurring event definitions ─────────────────────────

/**
 * Weekly recurring events — classes that repeat on the same day/time
 * every week. These get projected into concrete occurrences by the
 * recurring adapter.
 */
export function createDemoRecurring(): RecurringEvent[] {
	return [
		// ── Weekly yoga classes ──
		{
			id: 'rec-morning-flow',
			title: 'Morning Flow',
			dayOfWeek: 1, // Monday
			startTime: '07:00',
			endTime: '08:15',
			category: 'yoga',
			subtitle: 'Anna Szlęk',
			location: 'Studio A',
			tags: ['Beginner'],
		},
		{
			id: 'rec-breathwork',
			title: 'Breathwork',
			dayOfWeek: 1, // Monday
			startTime: '08:30',
			endTime: '09:15',
			category: 'wellness',
			subtitle: 'Piotr Szewczyk',
			location: 'Studio A',
		},
		{
			id: 'rec-yin',
			title: 'Yin Yoga',
			dayOfWeek: 1, // Monday
			startTime: '16:00',
			endTime: '17:00',
			category: 'yoga',
			subtitle: 'Monika Jaglarz',
			location: 'Studio B',
		},
		{
			id: 'rec-sunrise',
			title: 'Sunrise Salutation',
			dayOfWeek: 2, // Tuesday
			startTime: '06:30',
			endTime: '07:30',
			category: 'yoga',
			subtitle: 'Anna Szlęk',
			location: 'Rooftop',
		},
		{
			id: 'rec-core',
			title: 'Core Strength',
			dayOfWeek: 2, // Tuesday
			startTime: '09:00',
			endTime: '10:00',
			category: 'yoga',
			subtitle: 'Marta Sawiuk',
			location: 'Studio A',
			tags: ['Intermediate'],
		},
		{
			id: 'rec-ashtanga',
			title: 'Ashtanga',
			dayOfWeek: 2, // Tuesday
			startTime: '17:00',
			endTime: '18:30',
			category: 'yoga',
			tags: ['Advanced'],
			location: 'Studio A',
		},
		{
			id: 'rec-hatha',
			title: 'Hatha Basics',
			dayOfWeek: 3, // Wednesday
			startTime: '07:00',
			endTime: '08:00',
			category: 'yoga',
			subtitle: 'Denis Kolokol',
			location: 'Studio A',
		},
		{
			id: 'rec-pranayama',
			title: 'Pranayama',
			dayOfWeek: 3, // Wednesday
			startTime: '14:00',
			endTime: '15:00',
			category: 'wellness',
			location: 'Studio A',
		},
		{
			id: 'rec-mobility',
			title: 'Mobility Lab',
			dayOfWeek: 4, // Thursday
			startTime: '07:30',
			endTime: '08:30',
			category: 'wellness',
			subtitle: 'Piotr Szewczyk',
			location: 'Studio A',
		},
		{
			id: 'rec-stretch',
			title: 'Stretch & Release',
			dayOfWeek: 5, // Friday
			startTime: '12:00',
			endTime: '12:45',
			category: 'wellness',
			location: 'Studio B',
		},
		{
			id: 'rec-friday-flow',
			title: 'Friday Flow',
			dayOfWeek: 5, // Friday
			startTime: '16:00',
			endTime: '17:15',
			category: 'yoga',
			subtitle: 'Anna Szlęk',
			location: 'Studio A',
		},
		{
			id: 'rec-weekend-flow',
			title: 'Weekend Flow',
			dayOfWeek: 6, // Saturday
			startTime: '09:00',
			endTime: '10:15',
			category: 'yoga',
			subtitle: 'Marta Sawiuk',
			location: 'Studio A',
		},
		{
			id: 'rec-meditation',
			title: 'Meditation Circle',
			dayOfWeek: 6, // Saturday
			startTime: '11:00',
			endTime: '11:45',
			category: 'wellness',
			location: 'Garden',
			tags: ['Free'],
		},
		{
			id: 'rec-slow',
			title: 'Slow Flow',
			dayOfWeek: 7, // Sunday
			startTime: '10:00',
			endTime: '11:00',
			category: 'yoga',
			subtitle: 'Monika Jaglarz',
			location: 'Studio B',
		},

		// ── Biweekly deep dive ──
		{
			id: 'rec-deep-stretch',
			title: 'Deep Stretch',
			frequency: 'weekly',
			interval: 2,
			dayOfWeek: 4, // every other Thursday
			startTime: '18:00',
			endTime: '19:15',
			category: 'yoga',
			subtitle: 'Denis Kolokol',
			location: 'Studio B',
			tags: ['All Levels'],
			startDate: '2025-01-06',
		},

		// ── Monthly review ──
		{
			id: 'rec-monthly-review',
			title: 'Studio Review',
			frequency: 'monthly',
			dayOfMonth: 15,
			startTime: '10:00',
			endTime: '11:00',
			category: 'admin',
			location: 'Main Hall',
			tags: ['Staff Only'],
		},
	];
}
