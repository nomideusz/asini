import { describe, it, expect } from 'vitest';
import { createEventStore } from './event-store.svelte.js';
import { createMemoryAdapter } from '../adapters/memory.js';
import type { TimelineEvent } from '../core/types.js';

function makeEvent(id: string, startH: number, endH: number, day = 1): TimelineEvent {
	return {
		id,
		title: `Event ${id}`,
		start: new Date(2025, 2, day, startH, 0),
		end: new Date(2025, 2, day, endH, 0),
	};
}

const MARCH_1_RANGE = {
	start: new Date(2025, 2, 1, 0, 0),
	end: new Date(2025, 2, 2, 0, 0),
};

describe('createEventStore', () => {
	describe('load', () => {
		it('populates events from adapter', async () => {
			const adapter = createMemoryAdapter([makeEvent('1', 9, 10)]);
			const store = createEventStore(adapter);

			await store.load(MARCH_1_RANGE);
			expect(store.events).toHaveLength(1);
			expect(store.events[0].id).toBe('1');
		});

		it('sets loading=false and error=null after success', async () => {
			const adapter = createMemoryAdapter([makeEvent('1', 9, 10)]);
			const store = createEventStore(adapter);

			await store.load(MARCH_1_RANGE);
			expect(store.loading).toBe(false);
			expect(store.error).toBeNull();
		});

		it('sets error on adapter failure', async () => {
			const failingAdapter = {
				fetchEvents: async () => { throw new Error('network error'); },
				createEvent: async () => { throw new Error(); },
				updateEvent: async () => { throw new Error(); },
				deleteEvent: async () => { throw new Error(); },
			};
			const store = createEventStore(failingAdapter);

			await store.load(MARCH_1_RANGE);
			expect(store.error).toBe('network error');
			expect(store.loading).toBe(false);
		});
	});

	describe('add', () => {
		it('adds a new event to the store', async () => {
			const adapter = createMemoryAdapter();
			const store = createEventStore(adapter);

			const created = await store.add({
				title: 'New',
				start: new Date(2025, 2, 1, 10, 0),
				end: new Date(2025, 2, 1, 11, 0),
			});

			expect(created.id).toBeTruthy();
			expect(store.events).toHaveLength(1);
			expect(store.byId(created.id)).toBeDefined();
		});
	});

	describe('update', () => {
		it('updates an event already in the store', async () => {
			const adapter = createMemoryAdapter([makeEvent('1', 9, 10)]);
			const store = createEventStore(adapter);

			await store.load(MARCH_1_RANGE);
			await store.update('1', { title: 'Updated' });

			expect(store.byId('1')?.title).toBe('Updated');
		});

		// Regression test: update() should reflect adapter result even when the
		// event was not previously in the local map (e.g. after manual eviction).
		it('upserts the adapter result even if ID was not in local map', async () => {
			const initial = makeEvent('42', 9, 10);
			const adapter = createMemoryAdapter([initial]);
			const store = createEventStore(adapter);
			// Do NOT load first — event '42' is absent from local map.

			await store.update('42', { title: 'Should appear' });

			// The adapter-returned event must now be present in the store.
			const ev = store.byId('42');
			expect(ev).toBeDefined();
			expect(ev?.title).toBe('Should appear');
		});
	});

	describe('remove', () => {
		it('removes an event from the store', async () => {
			const adapter = createMemoryAdapter([makeEvent('1', 9, 10)]);
			const store = createEventStore(adapter);

			await store.load(MARCH_1_RANGE);
			await store.remove('1');

			expect(store.byId('1')).toBeUndefined();
			expect(store.events).toHaveLength(0);
		});
	});

	describe('move', () => {
		it('updates start/end of an event', async () => {
			const adapter = createMemoryAdapter([makeEvent('1', 9, 10)]);
			const store = createEventStore(adapter);

			await store.load(MARCH_1_RANGE);

			const newStart = new Date(2025, 2, 1, 14, 0);
			const newEnd = new Date(2025, 2, 1, 15, 0);
			await store.move('1', newStart, newEnd);

			const ev = store.byId('1');
			expect(ev?.start).toEqual(newStart);
			expect(ev?.end).toEqual(newEnd);
		});
	});

	describe('forDay / forRange', () => {
		it('forDay returns events for the given day', async () => {
			const adapter = createMemoryAdapter([
				makeEvent('1', 9, 10, 1),
				makeEvent('2', 9, 10, 5),
			]);
			const store = createEventStore(adapter);
			await store.load({ start: new Date(2025, 2, 1), end: new Date(2025, 2, 8) });

			const day1 = store.forDay(new Date(2025, 2, 1));
			expect(day1).toHaveLength(1);
			expect(day1[0].id).toBe('1');
		});

		it('forRange returns overlapping events', async () => {
			const adapter = createMemoryAdapter([
				makeEvent('1', 9, 10, 1),
				makeEvent('2', 9, 10, 5),
				makeEvent('3', 9, 10, 10),
			]);
			const store = createEventStore(adapter);
			await store.load({ start: new Date(2025, 2, 1), end: new Date(2025, 2, 11) });

			const range = store.forRange(new Date(2025, 2, 1), new Date(2025, 2, 6));
			expect(range).toHaveLength(2);
		});
	});

	describe('byId', () => {
		it('returns undefined for unknown IDs', async () => {
			const adapter = createMemoryAdapter();
			const store = createEventStore(adapter);
			expect(store.byId('nonexistent')).toBeUndefined();
		});
	});
});
