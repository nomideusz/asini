import { describe, it, expect } from 'vitest';
import { createRecurringAdapter, type RecurringEvent } from './recurring.js';

// ── Shared fixtures ─────────────────────────────────────

const schedule: RecurringEvent[] = [
	{
		id: 'yoga-mon',
		title: 'Morning Yoga',
		dayOfWeek: 1, // Monday
		startTime: '07:00',
		endTime: '08:30',
		color: '#34d399',
	},
	{
		id: 'pilates-wed',
		title: 'Pilates',
		dayOfWeek: 3, // Wednesday
		startTime: '18:00',
		endTime: '19:00',
	},
	{
		id: 'vinyasa-fri',
		title: 'Vinyasa Flow',
		dayOfWeek: 5, // Friday
		startTime: '09:00',
		endTime: '10:30',
		subtitle: 'With Anna',
		tags: ['Intermediate'],
		category: 'yoga',
	},
];

// Helper: Monday 2025-03-03 at midnight
function mondayMs(offset = 0): Date {
	return new Date(2025, 2, 3 + offset * 7); // March 3, 2025 is a Monday
}

// ── Weekly (backward-compatible) ────────────────────────

describe('createRecurringAdapter — weekly (default)', () => {
	it('projects events onto the correct days within a week', async () => {
		const adapter = createRecurringAdapter(schedule);
		const monday = mondayMs();
		const nextMonday = mondayMs(1);
		const events = await adapter.fetchEvents({ start: monday, end: nextMonday });

		expect(events).toHaveLength(3);

		// Monday yoga
		const yoga = events.find((e) => e.title === 'Morning Yoga')!;
		expect(yoga).toBeDefined();
		expect(yoga.start.getDay()).toBe(1); // Monday
		expect(yoga.start.getHours()).toBe(7);
		expect(yoga.start.getMinutes()).toBe(0);
		expect(yoga.end.getHours()).toBe(8);
		expect(yoga.end.getMinutes()).toBe(30);
		expect(yoga.color).toBe('#34d399');

		// Wednesday pilates
		const pilates = events.find((e) => e.title === 'Pilates')!;
		expect(pilates).toBeDefined();
		expect(pilates.start.getDay()).toBe(3); // Wednesday
		expect(pilates.start.getHours()).toBe(18);

		// Friday vinyasa
		const vinyasa = events.find((e) => e.title === 'Vinyasa Flow')!;
		expect(vinyasa).toBeDefined();
		expect(vinyasa.start.getDay()).toBe(5); // Friday
		expect(vinyasa.start.getHours()).toBe(9);
		expect(vinyasa.end.getHours()).toBe(10);
		expect(vinyasa.end.getMinutes()).toBe(30);
	});

	it('projects across multiple weeks', async () => {
		const adapter = createRecurringAdapter(schedule);
		const monday = mondayMs();
		const threeWeeksLater = mondayMs(3);
		const events = await adapter.fetchEvents({ start: monday, end: threeWeeksLater });

		// 3 events per week × 3 weeks = 9
		expect(events).toHaveLength(9);
	});

	it('generates unique IDs per projected instance', async () => {
		const adapter = createRecurringAdapter(schedule);
		const monday = mondayMs();
		const twoWeeksLater = mondayMs(2);
		const events = await adapter.fetchEvents({ start: monday, end: twoWeeksLater });

		const ids = events.map((e) => e.id);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});

	it('includes subtitle and tags in data', async () => {
		const adapter = createRecurringAdapter(schedule);
		const monday = mondayMs();
		const nextMonday = mondayMs(1);
		const events = await adapter.fetchEvents({ start: monday, end: nextMonday });

		const vinyasa = events.find((e) => e.title === 'Vinyasa Flow')!;
		expect(vinyasa.subtitle).toBe('With Anna');
		expect(vinyasa.tags).toEqual(['Intermediate']);
		expect(vinyasa.data?.recurringId).toBe('vinyasa-fri');
	});

	it('only returns events within the requested range', async () => {
		const adapter = createRecurringAdapter(schedule);
		// Query Wednesday only
		const wed = new Date(2025, 2, 5, 0, 0);
		const thu = new Date(2025, 2, 6, 0, 0);
		const events = await adapter.fetchEvents({ start: wed, end: thu });

		expect(events).toHaveLength(1);
		expect(events[0].title).toBe('Pilates');
	});
});

// ── Auto-coloring ───────────────────────────────────────

describe('createRecurringAdapter — auto-coloring', () => {
	it('auto-assigns colors to events without explicit color', async () => {
		const noColorSchedule: RecurringEvent[] = [
			{ id: '1', title: 'A', dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
			{ id: '2', title: 'B', dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
			{ id: '3', title: 'A', dayOfWeek: 3, startTime: '09:00', endTime: '10:00' },
		];
		const adapter = createRecurringAdapter(noColorSchedule);
		const monday = mondayMs();
		const nextMonday = mondayMs(1);
		const events = await adapter.fetchEvents({ start: monday, end: nextMonday });

		// 'A' events should share the same auto-assigned color
		const aEvents = events.filter((e) => e.title === 'A');
		expect(aEvents[0].color).toBe(aEvents[1].color);

		// 'B' should get a different color
		const bEvent = events.find((e) => e.title === 'B')!;
		expect(bEvent.color).not.toBe(aEvents[0].color);
	});

	it('preserves explicit colors', async () => {
		const adapter = createRecurringAdapter(schedule);
		const monday = mondayMs();
		const nextMonday = mondayMs(1);
		const events = await adapter.fetchEvents({ start: monday, end: nextMonday });

		const vinyasa = events.find((e) => e.title === 'Vinyasa Flow')!;
		// Should keep its explicit color from the schedule
		expect(vinyasa.color).toBeTruthy();
	});
});

// ── Read-only ───────────────────────────────────────────

describe('createRecurringAdapter — read-only', () => {
	it('create/update/delete throw', async () => {
		const adapter = createRecurringAdapter(schedule);
		await expect(adapter.createEvent({ title: 'x', start: new Date(), end: new Date() })).rejects.toThrow('read-only');
		await expect(adapter.updateEvent('yoga-mon', { title: 'y' })).rejects.toThrow('read-only');
		await expect(adapter.deleteEvent('yoga-mon')).rejects.toThrow('read-only');
	});
});

// ── parseTime validation ────────────────────────────────

describe('createRecurringAdapter — parseTime validation', () => {
	it('throws for a missing colon separator', async () => {
		const bad: RecurringEvent[] = [
			{ id: '1', title: 'Bad', dayOfWeek: 1, startTime: '0900', endTime: '10:00' },
		];
		const adapter = createRecurringAdapter(bad);
		await expect(
			adapter.fetchEvents({ start: mondayMs(), end: mondayMs(1) }),
		).rejects.toThrow('Invalid time format');
	});

	it('throws for out-of-range hours', async () => {
		const bad: RecurringEvent[] = [
			{ id: '1', title: 'Bad', dayOfWeek: 1, startTime: '25:00', endTime: '26:00' },
		];
		const adapter = createRecurringAdapter(bad);
		await expect(
			adapter.fetchEvents({ start: mondayMs(), end: mondayMs(1) }),
		).rejects.toThrow('Invalid hours');
	});

	it('throws for out-of-range minutes', async () => {
		const bad: RecurringEvent[] = [
			{ id: '1', title: 'Bad', dayOfWeek: 1, startTime: '09:60', endTime: '10:00' },
		];
		const adapter = createRecurringAdapter(bad);
		await expect(
			adapter.fetchEvents({ start: mondayMs(), end: mondayMs(1) }),
		).rejects.toThrow('Invalid minutes');
	});

	it('throws for non-numeric values', async () => {
		const bad: RecurringEvent[] = [
			{ id: '1', title: 'Bad', dayOfWeek: 1, startTime: 'ab:cd', endTime: '10:00' },
		];
		const adapter = createRecurringAdapter(bad);
		await expect(
			adapter.fetchEvents({ start: mondayMs(), end: mondayMs(1) }),
		).rejects.toThrow('Invalid hours');
	});
});

// ── Multiple days of week ───────────────────────────────

describe('createRecurringAdapter — dayOfWeek array', () => {
	it('generates events on every listed weekday', async () => {
		const mwf: RecurringEvent[] = [
			{
				id: 'math',
				title: 'Math',
				dayOfWeek: [1, 3, 5], // Mon, Wed, Fri
				startTime: '09:00',
				endTime: '10:00',
			},
		];
		const adapter = createRecurringAdapter(mwf);
		const events = await adapter.fetchEvents({ start: mondayMs(), end: mondayMs(1) });

		expect(events).toHaveLength(3);
		const days = events.map((e) => e.start.getDay()).sort();
		expect(days).toEqual([1, 3, 5]); // Mon, Wed, Fri
	});

	it('multi-day × 2 weeks = correct total', async () => {
		const mwf: RecurringEvent[] = [
			{
				id: 'math',
				title: 'Math',
				dayOfWeek: [1, 3, 5],
				startTime: '09:00',
				endTime: '10:00',
			},
		];
		const adapter = createRecurringAdapter(mwf);
		const events = await adapter.fetchEvents({ start: mondayMs(), end: mondayMs(2) });
		expect(events).toHaveLength(6); // 3 per week × 2 weeks
	});
});

// ── Interval (biweekly, etc.) ───────────────────────────

describe('createRecurringAdapter — interval', () => {
	it('biweekly (interval: 2) produces events every other week', async () => {
		const biweekly: RecurringEvent[] = [
			{
				id: 'sync',
				title: 'Team Sync',
				frequency: 'weekly',
				interval: 2,
				dayOfWeek: 2, // Tuesday
				startTime: '14:00',
				endTime: '15:00',
				startDate: '2025-03-03', // Mon March 3
			},
		];
		const adapter = createRecurringAdapter(biweekly);

		// Query 4 weeks: Mar 3 – Mar 31
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 3),
			end: new Date(2025, 2, 31),
		});

		// Week 0 (Mar 3): Tue Mar 4 ✓
		// Week 1 (Mar 10): skipped
		// Week 2 (Mar 17): Tue Mar 18 ✓
		// Week 3 (Mar 24): skipped
		expect(events).toHaveLength(2);
		expect(events[0].start.getDate()).toBe(4);
		expect(events[1].start.getDate()).toBe(18);
	});

	it('every-3-weeks produces correct spacing', async () => {
		const triweekly: RecurringEvent[] = [
			{
				id: 'review',
				title: 'Review',
				frequency: 'weekly',
				interval: 3,
				dayOfWeek: 1, // Monday
				startTime: '10:00',
				endTime: '11:00',
				startDate: '2025-03-03',
			},
		];
		const adapter = createRecurringAdapter(triweekly);

		// Query 9 weeks: Mar 3 – May 5
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 3),
			end: new Date(2025, 4, 5),
		});

		// Week 0: Mar 3, Week 3: Mar 24, Week 6: Apr 14
		expect(events).toHaveLength(3);
		expect(events[0].start.getDate()).toBe(3);
		expect(events[0].start.getMonth()).toBe(2); // March
		expect(events[1].start.getDate()).toBe(24);
		expect(events[1].start.getMonth()).toBe(2);
		expect(events[2].start.getDate()).toBe(14);
		expect(events[2].start.getMonth()).toBe(3); // April
	});
});

// ── startDate / until bounds ────────────────────────────

describe('createRecurringAdapter — startDate & until', () => {
	it('startDate excludes events before the start', async () => {
		const bounded: RecurringEvent[] = [
			{
				id: 'class',
				title: 'Class',
				dayOfWeek: 3, // Wednesday
				startTime: '10:00',
				endTime: '11:00',
				startDate: '2025-03-12', // second Wednesday
			},
		];
		const adapter = createRecurringAdapter(bounded);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 3), // Mar 3
			end: new Date(2025, 2, 24), // Mar 24
		});

		// Mar 5 (before startDate) excluded, Mar 12 ✓, Mar 19 ✓
		expect(events).toHaveLength(2);
		expect(events[0].start.getDate()).toBe(12);
		expect(events[1].start.getDate()).toBe(19);
	});

	it('until excludes events after the end', async () => {
		const bounded: RecurringEvent[] = [
			{
				id: 'class',
				title: 'Class',
				dayOfWeek: 3, // Wednesday
				startTime: '10:00',
				endTime: '11:00',
				until: '2025-03-14', // after second Wednesday, before third
			},
		];
		const adapter = createRecurringAdapter(bounded);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 3),
			end: new Date(2025, 2, 24),
		});

		// Mar 5 ✓, Mar 12 ✓, Mar 19 (after until) excluded
		expect(events).toHaveLength(2);
		expect(events[0].start.getDate()).toBe(5);
		expect(events[1].start.getDate()).toBe(12);
	});

	it('startDate + until together restrict to a window', async () => {
		const bounded: RecurringEvent[] = [
			{
				id: 'class',
				title: 'Class',
				dayOfWeek: 3,
				startTime: '10:00',
				endTime: '11:00',
				startDate: '2025-03-10',
				until: '2025-03-16',
			},
		];
		const adapter = createRecurringAdapter(bounded);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 3),
			end: new Date(2025, 2, 31),
		});

		// Only Mar 12 fits
		expect(events).toHaveLength(1);
		expect(events[0].start.getDate()).toBe(12);
	});
});

// ── Count ───────────────────────────────────────────────

describe('createRecurringAdapter — count', () => {
	it('limits weekly occurrences to count', async () => {
		const limited: RecurringEvent[] = [
			{
				id: 'workshop',
				title: 'Workshop',
				dayOfWeek: 6, // Saturday
				startTime: '10:00',
				endTime: '12:00',
				startDate: '2025-03-01', // Saturday
				count: 3,
			},
		];
		const adapter = createRecurringAdapter(limited);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 1),
			end: new Date(2025, 3, 30), // query much wider than count
		});

		expect(events).toHaveLength(3);
		expect(events[0].start.getDate()).toBe(1);
		expect(events[1].start.getDate()).toBe(8);
		expect(events[2].start.getDate()).toBe(15);
	});

	it('count with multi-day produces correct total', async () => {
		const limited: RecurringEvent[] = [
			{
				id: 'class',
				title: 'Class',
				dayOfWeek: [1, 3, 5], // Mon, Wed, Fri
				startTime: '09:00',
				endTime: '10:00',
				startDate: '2025-03-03', // Monday
				count: 5,
			},
		];
		const adapter = createRecurringAdapter(limited);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 3),
			end: new Date(2025, 3, 30),
		});

		// 5 occurrences: Mon 3, Wed 5, Fri 7, Mon 10, Wed 12
		expect(events).toHaveLength(5);
	});

	it('count + until uses the stricter bound', async () => {
		const limited: RecurringEvent[] = [
			{
				id: 'class',
				title: 'Class',
				dayOfWeek: 1, // Monday
				startTime: '09:00',
				endTime: '10:00',
				startDate: '2025-03-03',
				count: 10, // would allow 10 Mondays
				until: '2025-03-17', // but only 3 Mondays fit
			},
		];
		const adapter = createRecurringAdapter(limited);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 3),
			end: new Date(2025, 5, 1),
		});

		// until wins: Mar 3, Mar 10, Mar 17
		expect(events).toHaveLength(3);
	});
});

// ── Daily frequency ─────────────────────────────────────

describe('createRecurringAdapter — daily', () => {
	it('generates an event for every day in range', async () => {
		const daily: RecurringEvent[] = [
			{
				id: 'standup',
				title: 'Standup',
				frequency: 'daily',
				startTime: '09:00',
				endTime: '09:15',
			},
		];
		const adapter = createRecurringAdapter(daily);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 3), // Monday
			end: new Date(2025, 2, 8), // Saturday (exclusive)
		});

		// Mon–Fri = 5 days
		expect(events).toHaveLength(5);
		expect(events[0].start.getDate()).toBe(3);
		expect(events[4].start.getDate()).toBe(7);
	});

	it('daily with interval: 2 produces every-other-day', async () => {
		const daily: RecurringEvent[] = [
			{
				id: 'meds',
				title: 'Medication',
				frequency: 'daily',
				interval: 2,
				startTime: '08:00',
				endTime: '08:05',
				startDate: '2025-03-01',
			},
		];
		const adapter = createRecurringAdapter(daily);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 1),
			end: new Date(2025, 2, 10),
		});

		// Mar 1, 3, 5, 7, 9
		expect(events).toHaveLength(5);
		expect(events.map((e) => e.start.getDate())).toEqual([1, 3, 5, 7, 9]);
	});

	it('daily with startDate and until', async () => {
		const daily: RecurringEvent[] = [
			{
				id: 'standup',
				title: 'Standup',
				frequency: 'daily',
				startTime: '09:00',
				endTime: '09:15',
				startDate: '2025-03-05',
				until: '2025-03-07',
			},
		];
		const adapter = createRecurringAdapter(daily);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 3),
			end: new Date(2025, 2, 10),
		});

		// Only Mar 5, 6, 7
		expect(events).toHaveLength(3);
		expect(events[0].start.getDate()).toBe(5);
		expect(events[2].start.getDate()).toBe(7);
	});

	it('daily with count', async () => {
		const daily: RecurringEvent[] = [
			{
				id: 'course',
				title: 'Course',
				frequency: 'daily',
				startTime: '10:00',
				endTime: '11:00',
				startDate: '2025-03-03',
				count: 4,
			},
		];
		const adapter = createRecurringAdapter(daily);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 1),
			end: new Date(2025, 2, 31),
		});

		expect(events).toHaveLength(4);
		expect(events.map((e) => e.start.getDate())).toEqual([3, 4, 5, 6]);
	});

	it('daily with count + interval', async () => {
		const daily: RecurringEvent[] = [
			{
				id: 'meds',
				title: 'Medication',
				frequency: 'daily',
				interval: 3,
				startTime: '08:00',
				endTime: '08:05',
				startDate: '2025-03-01',
				count: 3,
			},
		];
		const adapter = createRecurringAdapter(daily);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 1),
			end: new Date(2025, 2, 31),
		});

		// Mar 1, 4, 7
		expect(events).toHaveLength(3);
		expect(events.map((e) => e.start.getDate())).toEqual([1, 4, 7]);
	});
});

// ── Monthly frequency ───────────────────────────────────

describe('createRecurringAdapter — monthly', () => {
	it('generates one event per month on dayOfMonth', async () => {
		const monthly: RecurringEvent[] = [
			{
				id: 'review',
				title: 'Monthly Review',
				frequency: 'monthly',
				dayOfMonth: 15,
				startTime: '10:00',
				endTime: '11:00',
			},
		];
		const adapter = createRecurringAdapter(monthly);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 0, 1), // Jan 1
			end: new Date(2025, 3, 1), // Apr 1
		});

		// Jan 15, Feb 15, Mar 15
		expect(events).toHaveLength(3);
		expect(events[0].start.getMonth()).toBe(0);
		expect(events[0].start.getDate()).toBe(15);
		expect(events[1].start.getMonth()).toBe(1);
		expect(events[2].start.getMonth()).toBe(2);
	});

	it('clamps dayOfMonth to last day of short months', async () => {
		const monthly: RecurringEvent[] = [
			{
				id: 'end-of-month',
				title: 'End of Month',
				frequency: 'monthly',
				dayOfMonth: 31,
				startTime: '17:00',
				endTime: '18:00',
			},
		];
		const adapter = createRecurringAdapter(monthly);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 0, 1),
			end: new Date(2025, 3, 1),
		});

		// Jan 31, Feb 28, Mar 31
		expect(events).toHaveLength(3);
		expect(events[0].start.getDate()).toBe(31);
		expect(events[1].start.getDate()).toBe(28); // Feb 2025 is not a leap year
		expect(events[2].start.getDate()).toBe(31);
	});

	it('monthly with interval: 2 produces every other month', async () => {
		const bimonthly: RecurringEvent[] = [
			{
				id: 'check',
				title: 'Bimonthly Check',
				frequency: 'monthly',
				interval: 2,
				dayOfMonth: 10,
				startTime: '14:00',
				endTime: '15:00',
				startDate: '2025-01-01',
			},
		];
		const adapter = createRecurringAdapter(bimonthly);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 0, 1),
			end: new Date(2025, 6, 1), // through June
		});

		// Jan 10, Mar 10, May 10
		expect(events).toHaveLength(3);
		expect(events.map((e) => e.start.getMonth())).toEqual([0, 2, 4]);
	});

	it('monthly with count', async () => {
		const monthly: RecurringEvent[] = [
			{
				id: 'session',
				title: 'Session',
				frequency: 'monthly',
				dayOfMonth: 5,
				startTime: '10:00',
				endTime: '11:00',
				startDate: '2025-01-01',
				count: 4,
			},
		];
		const adapter = createRecurringAdapter(monthly);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 0, 1),
			end: new Date(2025, 11, 31),
		});

		// Jan 5, Feb 5, Mar 5, Apr 5
		expect(events).toHaveLength(4);
		expect(events.map((e) => e.start.getMonth())).toEqual([0, 1, 2, 3]);
	});

	it('monthly with startDate and until', async () => {
		const monthly: RecurringEvent[] = [
			{
				id: 'review',
				title: 'Review',
				frequency: 'monthly',
				dayOfMonth: 15,
				startTime: '10:00',
				endTime: '11:00',
				startDate: '2025-02-01',
				until: '2025-04-30',
			},
		];
		const adapter = createRecurringAdapter(monthly);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 0, 1),
			end: new Date(2025, 6, 1),
		});

		// Feb 15, Mar 15, Apr 15 (May 15 excluded by until)
		expect(events).toHaveLength(3);
		expect(events[0].start.getMonth()).toBe(1);
		expect(events[2].start.getMonth()).toBe(3);
	});
});

// ── Mixed schedule ──────────────────────────────────────

describe('createRecurringAdapter — mixed frequencies', () => {
	it('handles daily + weekly + monthly in one schedule', async () => {
		const mixed: RecurringEvent[] = [
			{
				id: 'standup',
				title: 'Standup',
				frequency: 'daily',
				startTime: '09:00',
				endTime: '09:15',
			},
			{
				id: 'retro',
				title: 'Retro',
				frequency: 'weekly',
				dayOfWeek: 5, // Friday
				startTime: '16:00',
				endTime: '17:00',
			},
			{
				id: 'review',
				title: 'Review',
				frequency: 'monthly',
				dayOfMonth: 10,
				startTime: '10:00',
				endTime: '11:00',
			},
		];
		const adapter = createRecurringAdapter(mixed);
		const events = await adapter.fetchEvents({
			start: new Date(2025, 2, 10), // Mon Mar 10
			end: new Date(2025, 2, 17), // Mon Mar 17 (exclusive)
		});

		// 7 standups + 1 retro (Fri 14) + 1 review (Mar 10) = 9
		const standups = events.filter((e) => e.title === 'Standup');
		const retros = events.filter((e) => e.title === 'Retro');
		const reviews = events.filter((e) => e.title === 'Review');
		expect(standups).toHaveLength(7);
		expect(retros).toHaveLength(1);
		expect(reviews).toHaveLength(1);
	});
});
