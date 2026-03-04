import { describe, it, expect } from 'vitest';
import { generateSlots } from './generator.js';
import type { TourDefinition, TourSlot, ScheduleRule } from '../types.js';

// ─── Helpers ────────────────────────────────────────────

function range(start: string, end: string): { start: Date; end: Date } {
	return { start: new Date(start), end: new Date(end) };
}

function makeTour(rules: ScheduleRule[]): TourDefinition {
	return {
		id: 'tour-1',
		name: 'Test Tour',
		description: '',
		duration: 120,
		capacity: 10,
		minCapacity: 2,
		maxCapacity: 10,
		languages: ['en'],
		categories: [],
		includedItems: [],
		requirements: [],
		images: [],
		isPublic: true,
		status: 'active',
		pricing: {
			model: 'per_person',
			basePrice: 50,
			currency: 'PLN',
			guidePaysProcessingFee: false,
		},
		cancellationPolicy: {
			id: 'pol-1',
			name: 'Standard',
			description: '',
			rules: [],
		},
		scheduleRules: rules,
	};
}

function makePersistedSlot(
	overrides: Partial<TourSlot> & { startTime: Date; ruleId?: string }
): TourSlot {
	const { ruleId, startTime, endTime, ...rest } = overrides;
	return {
		id: `slot-${startTime.toISOString()}`,
		tourId: 'tour-1',
		startTime,
		endTime: endTime ?? new Date(startTime.getTime() + 7200_000),
		availableSpots: 10,
		bookedSpots: 0,
		status: 'open',
		isGenerated: true,
		scheduleRuleId: ruleId,
		...rest,
	};
}

const WEEKLY_RULE: ScheduleRule = {
	id: 'rule-mon',
	pattern: 'weekly',
	daysOfWeek: [1], // Monday
	startTime: '09:00',
	endTime: '11:00',
	validFrom: '2024-03-01',
	timezone: 'UTC',
};

// ─── Basic generation ────────────────────────────────────

describe('generateSlots — basic', () => {
	it('generates virtual slots from a weekly rule', () => {
		const tour = makeTour([WEEKLY_RULE]);
		const result = generateSlots(tour, [], range('2024-03-11T00:00:00Z', '2024-03-18T00:00:00Z'));
		// Only Mon Mar 11 is in range (Mar 18 00:00 is range.end, exclusive)
		expect(result).toHaveLength(1);
		expect(result[0].startTime.toISOString()).toBe('2024-03-11T09:00:00.000Z');
		expect(result[0].isGenerated).toBe(true);
		expect(result[0].scheduleRuleId).toBe('rule-mon');
	});

	it('generates multiple slots across two weeks', () => {
		const tour = makeTour([WEEKLY_RULE]);
		const result = generateSlots(tour, [], range('2024-03-11T00:00:00Z', '2024-03-25T00:00:00Z'));
		// Mon Mar 11 and Mon Mar 18
		expect(result).toHaveLength(2);
	});

	it('returns empty when no rules match the range', () => {
		const tour = makeTour([WEEKLY_RULE]);
		const result = generateSlots(
			tour,
			[],
			range('2024-04-02T00:00:00Z', '2024-04-04T00:00:00Z')
		);
		// No Mondays Apr 2–3 (Apr 2 is Tuesday, Apr 3 is Wednesday)
		expect(result).toHaveLength(0);
	});
});

// ─── Merging with persisted slots ────────────────────────

describe('generateSlots — merging persisted slots', () => {
	it('uses persisted slot data when it matches a generated occurrence', () => {
		const tour = makeTour([WEEKLY_RULE]);
		const persisted = makePersistedSlot({
			id: 'persisted-1',
			startTime: new Date('2024-03-11T09:00:00.000Z'),
			ruleId: 'rule-mon',
			bookedSpots: 3,
			status: 'open',
		});

		const result = generateSlots(
			tour,
			[persisted],
			range('2024-03-11T00:00:00Z', '2024-03-18T00:00:00Z')
		);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('persisted-1');
		expect(result[0].bookedSpots).toBe(3);
	});

	it('excludes cancelled persisted slots', () => {
		const tour = makeTour([WEEKLY_RULE]);
		const cancelled = makePersistedSlot({
			id: 'cancelled-1',
			startTime: new Date('2024-03-11T09:00:00.000Z'),
			ruleId: 'rule-mon',
			status: 'cancelled',
		});

		const result = generateSlots(
			tour,
			[cancelled],
			range('2024-03-11T00:00:00Z', '2024-03-18T00:00:00Z')
		);
		expect(result).toHaveLength(0);
	});

	it('includes manual (non-generated) persisted slots within range', () => {
		const tour = makeTour([]);
		const manual = makePersistedSlot({
			id: 'manual-1',
			startTime: new Date('2024-03-15T14:00:00.000Z'),
			isGenerated: false,
		});

		const result = generateSlots(
			tour,
			[manual],
			range('2024-03-14T00:00:00Z', '2024-03-16T00:00:00Z')
		);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('manual-1');
	});

	it('excludes manual persisted slots outside the range', () => {
		const tour = makeTour([]);
		const manual = makePersistedSlot({
			id: 'manual-out',
			startTime: new Date('2024-03-20T14:00:00.000Z'),
			isGenerated: false,
		});

		const result = generateSlots(
			tour,
			[manual],
			range('2024-03-14T00:00:00Z', '2024-03-16T00:00:00Z')
		);
		expect(result).toHaveLength(0);
	});

	it('excludes cancelled manual persisted slots', () => {
		const tour = makeTour([]);
		const manual = makePersistedSlot({
			id: 'manual-cancelled',
			startTime: new Date('2024-03-15T14:00:00.000Z'),
			isGenerated: false,
			status: 'cancelled',
		});

		const result = generateSlots(
			tour,
			[manual],
			range('2024-03-14T00:00:00Z', '2024-03-16T00:00:00Z')
		);
		expect(result).toHaveLength(0);
	});
});

// ─── Sorting ─────────────────────────────────────────────

describe('generateSlots — sorting', () => {
	it('returns slots sorted ascending by startTime', () => {
		// Two rules: Monday and Wednesday
		const monRule: ScheduleRule = { ...WEEKLY_RULE, id: 'mon' };
		const wedRule: ScheduleRule = { ...WEEKLY_RULE, id: 'wed', daysOfWeek: [3] };
		const tour = makeTour([wedRule, monRule]); // intentionally put Wed first

		const result = generateSlots(tour, [], range('2024-03-11T00:00:00Z', '2024-03-15T00:00:00Z'));
		// Mon Mar 11, Wed Mar 13
		expect(result).toHaveLength(2);
		expect(result[0].startTime < result[1].startTime).toBe(true);
		expect(result[0].startTime.toISOString()).toBe('2024-03-11T09:00:00.000Z');
		expect(result[1].startTime.toISOString()).toBe('2024-03-13T09:00:00.000Z');
	});

	it('interleaves virtual and persisted slots correctly', () => {
		const tour = makeTour([WEEKLY_RULE]);
		// A persisted slot for the following Monday with a booking
		const persisted = makePersistedSlot({
			id: 'p1',
			startTime: new Date('2024-03-18T09:00:00.000Z'),
			ruleId: 'rule-mon',
			bookedSpots: 2,
		});

		const result = generateSlots(
			tour,
			[persisted],
			range('2024-03-11T00:00:00Z', '2024-03-25T00:00:00Z')
		);
		expect(result).toHaveLength(2);
		expect(result[0].startTime.toISOString()).toBe('2024-03-11T09:00:00.000Z');
		expect(result[1].id).toBe('p1');
	});
});

// ─── Multiple rules ───────────────────────────────────────

describe('generateSlots — multiple rules', () => {
	it('expands all rules and merges results', () => {
		const monRule: ScheduleRule = { ...WEEKLY_RULE, id: 'mon', daysOfWeek: [1] };
		const friRule: ScheduleRule = { ...WEEKLY_RULE, id: 'fri', daysOfWeek: [5] };
		const tour = makeTour([monRule, friRule]);

		const result = generateSlots(tour, [], range('2024-03-11T00:00:00Z', '2024-03-16T00:00:00Z'));
		// Mon Mar 11 and Fri Mar 15
		expect(result).toHaveLength(2);
	});
});
