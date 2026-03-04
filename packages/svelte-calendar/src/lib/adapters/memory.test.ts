import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryAdapter } from './memory.js';
import type { TimelineEvent } from '../core/types.js';
import type { DateRange } from './types.js';

function makeEvent(id: string, startH: number, endH: number, day = 1): TimelineEvent {
	return {
		id,
		title: `Event ${id}`,
		start: new Date(2025, 2, day, startH, 0),
		end: new Date(2025, 2, day, endH, 0),
	};
}

const MARCH_1: DateRange = {
	start: new Date(2025, 2, 1, 0, 0),
	end: new Date(2025, 2, 2, 0, 0),
};

const MARCH_WEEK: DateRange = {
	start: new Date(2025, 2, 1, 0, 0),
	end: new Date(2025, 2, 8, 0, 0),
};

// ─── fetchEvents ────────────────────────────────────────

describe('createMemoryAdapter', () => {
	describe('fetchEvents', () => {
		it('returns events within range', async () => {
			const adapter = createMemoryAdapter([
				makeEvent('1', 9, 10, 1),
				makeEvent('2', 14, 15, 1),
				makeEvent('3', 10, 11, 5), // Mar 5 — outside MARCH_1
			]);

			const result = await adapter.fetchEvents(MARCH_1);
			expect(result).toHaveLength(2);
			expect(result.map((e) => e.id)).toEqual(['1', '2']);
		});

		it('returns empty array for empty range', async () => {
			const adapter = createMemoryAdapter([makeEvent('1', 9, 10, 1)]);
			const result = await adapter.fetchEvents({
				start: new Date(2025, 5, 1),
				end: new Date(2025, 5, 2),
			});
			expect(result).toHaveLength(0);
		});

		it('includes partially overlapping events', async () => {
			const adapter = createMemoryAdapter([
				{
					id: '1',
					title: 'Overlap',
					start: new Date(2025, 2, 1, 23, 0),
					end: new Date(2025, 2, 2, 1, 0), // spans midnight
				},
			]);
			const result = await adapter.fetchEvents(MARCH_1);
			expect(result).toHaveLength(1);
		});
	});

	// ─── createEvent ────────────────────────────────────

	describe('createEvent', () => {
		it('creates an event with a generated ID', async () => {
			const adapter = createMemoryAdapter();
			const created = await adapter.createEvent({
				title: 'New Event',
				start: new Date(2025, 2, 1, 9, 0),
				end: new Date(2025, 2, 1, 10, 0),
			});

			expect(created.id).toBeTruthy();
			expect(created.title).toBe('New Event');

			// Should now be fetchable
			const fetched = await adapter.fetchEvents(MARCH_1);
			expect(fetched).toHaveLength(1);
			expect(fetched[0].id).toBe(created.id);
		});

		it('generates unique IDs', async () => {
			const adapter = createMemoryAdapter();
			const a = await adapter.createEvent({
				title: 'A',
				start: new Date(2025, 2, 1, 9, 0),
				end: new Date(2025, 2, 1, 10, 0),
			});
			const b = await adapter.createEvent({
				title: 'B',
				start: new Date(2025, 2, 1, 11, 0),
				end: new Date(2025, 2, 1, 12, 0),
			});
			expect(a.id).not.toBe(b.id);
		});
	});

	// ─── updateEvent ────────────────────────────────────

	describe('updateEvent', () => {
		it('patches an existing event', async () => {
			const adapter = createMemoryAdapter([makeEvent('1', 9, 10)]);
			const updated = await adapter.updateEvent('1', { title: 'Updated' });

			expect(updated.title).toBe('Updated');
			expect(updated.id).toBe('1');

			// Verify persistence
			const fetched = await adapter.fetchEvents(MARCH_1);
			expect(fetched[0].title).toBe('Updated');
		});

		it('throws for non-existent event', async () => {
			const adapter = createMemoryAdapter();
			await expect(adapter.updateEvent('nope', { title: 'X' })).rejects.toThrow(
				'Event not found',
			);
		});

		it('preserves the original ID even if patch includes a different ID', async () => {
			const adapter = createMemoryAdapter([makeEvent('1', 9, 10)]);
			const updated = await adapter.updateEvent('1', {
				title: 'Changed',
				id: 'should-be-ignored' as string,
			});
			expect(updated.id).toBe('1');
		});
	});

	// ─── deleteEvent ────────────────────────────────────

	describe('deleteEvent', () => {
		it('removes an existing event', async () => {
			const adapter = createMemoryAdapter([makeEvent('1', 9, 10)]);
			await adapter.deleteEvent('1');

			const fetched = await adapter.fetchEvents(MARCH_1);
			expect(fetched).toHaveLength(0);
		});

		it('throws for non-existent event', async () => {
			const adapter = createMemoryAdapter();
			await expect(adapter.deleteEvent('nope')).rejects.toThrow('Event not found');
		});
	});

	// ─── Integration: CRUD lifecycle ────────────────────

	describe('full CRUD lifecycle', () => {
		it('create → read → update → delete', async () => {
			const adapter = createMemoryAdapter();

			// Create
			const ev = await adapter.createEvent({
				title: 'Yoga',
				start: new Date(2025, 2, 3, 9, 0),
				end: new Date(2025, 2, 3, 10, 0),
			});
			expect(ev.id).toBeTruthy();

			// Read
			let events = await adapter.fetchEvents(MARCH_WEEK);
			expect(events).toHaveLength(1);

			// Update
			await adapter.updateEvent(ev.id, { title: 'Hot Yoga' });
			events = await adapter.fetchEvents(MARCH_WEEK);
			expect(events[0].title).toBe('Hot Yoga');

			// Delete
			await adapter.deleteEvent(ev.id);
			events = await adapter.fetchEvents(MARCH_WEEK);
			expect(events).toHaveLength(0);
		});
	});
});
