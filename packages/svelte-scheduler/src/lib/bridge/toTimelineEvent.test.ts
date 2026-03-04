import { describe, it, expect } from 'vitest';
import { toTimelineEvent } from './toTimelineEvent.js';
import type { TourSlot, TourDefinition } from '../core/types.js';

// ─── Helpers ────────────────────────────────────────────

function makeTour(overrides: Partial<TourDefinition> = {}): TourDefinition {
	return {
		id: 'tour-1',
		name: 'City Walk',
		description: 'A walking tour of the city.',
		duration: 120,
		capacity: 10,
		minCapacity: 2,
		maxCapacity: 10,
		languages: ['en'],
		categories: ['sightseeing'],
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
			id: 'flexible',
			name: 'Flexible',
			description: 'Full refund if 24h before.',
			rules: [],
		},
		scheduleRules: [],
		...overrides,
	};
}

function makeSlot(overrides: Partial<TourSlot> = {}): TourSlot {
	return {
		id: 'slot-1',
		tourId: 'tour-1',
		startTime: new Date('2030-06-01T10:00:00Z'),
		endTime: new Date('2030-06-01T12:00:00Z'),
		availableSpots: 10,
		bookedSpots: 0,
		status: 'open',
		isGenerated: false,
		...overrides,
	};
}

// ─── Status mapping ──────────────────────────────────────

describe('toTimelineEvent — availability status mapping', () => {
	it('open slot with plenty of spots → data.status = "available"', () => {
		const slot = makeSlot({ availableSpots: 10, bookedSpots: 0, status: 'open' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.status).toBe('available');
	});

	it('open slot with exactly 4 spots left → data.status = "available"', () => {
		const slot = makeSlot({ availableSpots: 10, bookedSpots: 6, status: 'open' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.status).toBe('available');
	});

	it('open slot with exactly 3 spots left → data.status = "limited"', () => {
		const slot = makeSlot({ availableSpots: 10, bookedSpots: 7, status: 'open' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.status).toBe('limited');
	});

	it('open slot with 1 spot left → data.status = "limited"', () => {
		const slot = makeSlot({ availableSpots: 10, bookedSpots: 9, status: 'open' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.status).toBe('limited');
	});

	it('full slot → data.status = "full"', () => {
		const slot = makeSlot({ availableSpots: 10, bookedSpots: 10, status: 'full' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.status).toBe('full');
	});

	it('cancelled slot → data.status = "cancelled"', () => {
		const slot = makeSlot({ status: 'cancelled' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.status).toBe('cancelled');
	});

	it('completed slot → data.status = "available" (historical)', () => {
		const slot = makeSlot({ status: 'completed' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.status).toBe('available');
	});

	it('at_risk slot → data.status = "limited"', () => {
		const slot = makeSlot({ status: 'at_risk' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.status).toBe('limited');
	});
});

// ─── EventStatus mapping ─────────────────────────────────

describe('toTimelineEvent — TimelineEvent.status (EventStatus)', () => {
	it('cancelled slot sets status to "cancelled" for calendar rendering', () => {
		const slot = makeSlot({ status: 'cancelled' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.status).toBe('cancelled');
	});

	it('open slot does not set status (undefined)', () => {
		const slot = makeSlot({ status: 'open' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.status).toBeUndefined();
	});

	it('full slot does not set status (undefined)', () => {
		const slot = makeSlot({ status: 'full' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.status).toBeUndefined();
	});
});

// ─── Field mapping ───────────────────────────────────────

describe('toTimelineEvent — field mapping', () => {
	it('id maps from slot.id', () => {
		const slot = makeSlot({ id: 'slot-abc' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.id).toBe('slot-abc');
	});

	it('title maps from tour.name', () => {
		const tour = makeTour({ name: 'Mountain Trek' });
		const event = toTimelineEvent(makeSlot(), tour);
		expect(event.title).toBe('Mountain Trek');
	});

	it('start maps from slot.startTime', () => {
		const start = new Date('2030-07-15T09:00:00Z');
		const slot = makeSlot({ startTime: start });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.start).toBe(start);
	});

	it('end maps from slot.endTime', () => {
		const end = new Date('2030-07-15T11:00:00Z');
		const slot = makeSlot({ endTime: end });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.end).toBe(end);
	});

	it('category uses tour.categories[0]', () => {
		const tour = makeTour({ categories: ['adventure', 'outdoor'] });
		const event = toTimelineEvent(makeSlot(), tour);
		expect(event.category).toBe('adventure');
	});

	it('category falls back to tour.name when categories is empty', () => {
		const tour = makeTour({ name: 'Special Tour', categories: [] });
		const event = toTimelineEvent(makeSlot(), tour);
		expect(event.category).toBe('Special Tour');
	});

	it('category is never a hardcoded color value', () => {
		const tour = makeTour({ categories: ['wellness'] });
		const event = toTimelineEvent(makeSlot(), tour);
		// category must be a semantic string, not a hex/rgb color
		expect(event.color).toBeUndefined();
		expect(event.category).toBe('wellness');
	});
});

// ─── data payload ────────────────────────────────────────

describe('toTimelineEvent — data payload', () => {
	it('data.slotId equals slot.id', () => {
		const slot = makeSlot({ id: 'slot-xyz' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.slotId).toBe('slot-xyz');
	});

	it('data.tourId equals tour.id', () => {
		const tour = makeTour({ id: 'tour-999' });
		const event = toTimelineEvent(makeSlot({ tourId: 'tour-999' }), tour);
		expect(event.data?.tourId).toBe('tour-999');
	});

	it('data.bookedSpots reflects slot.bookedSpots', () => {
		const slot = makeSlot({ availableSpots: 10, bookedSpots: 4, status: 'open' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.bookedSpots).toBe(4);
	});

	it('data.availableSpots reflects slot.availableSpots', () => {
		const slot = makeSlot({ availableSpots: 8, bookedSpots: 2, status: 'open' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.availableSpots).toBe(8);
	});

	it('data.spotsLeft is availableSpots - bookedSpots', () => {
		const slot = makeSlot({ availableSpots: 10, bookedSpots: 3, status: 'open' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.spotsLeft).toBe(7);
	});

	it('data.spotsLeft is 0 when slot is full', () => {
		const slot = makeSlot({ availableSpots: 5, bookedSpots: 5, status: 'full' });
		const event = toTimelineEvent(slot, makeTour());
		expect(event.data?.spotsLeft).toBe(0);
	});
});
