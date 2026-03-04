/**
 * Composite adapter — merges events from multiple CalendarAdapters.
 *
 * Use when you need to combine different data sources (e.g. recurring
 * schedule + one-off events, or multiple REST endpoints).
 *
 * Read operations (fetchEvents) query all child adapters in parallel
 * and merge the results. Write operations (create/update/delete) are
 * routed to the primary adapter (first in the list by default, or
 * the one specified via `primaryIndex`).
 *
 * Usage:
 *   import { createCompositeAdapter } from '@nomideusz/svelte-calendar';
 *
 *   const recurring = createRecurringAdapter(schedule, { palette });
 *   const memory    = createMemoryAdapter(oneOffEvents, { palette });
 *   const adapter   = createCompositeAdapter([memory, recurring]);
 *   // memory is the primary → mutations go through it
 */
import type { TimelineEvent } from '../core/types.js';
import type { CalendarAdapter, DateRange } from './types.js';

export interface CompositeAdapterOptions {
	/**
	 * Index of the adapter that handles mutations (create/update/delete).
	 * Defaults to `0` (the first adapter).
	 */
	primaryIndex?: number;
}

/**
 * Create a CalendarAdapter that merges events from multiple child adapters.
 *
 * @param adapters  Array of child adapters to merge.
 * @param options   Optional configuration.
 */
export function createCompositeAdapter(
	adapters: CalendarAdapter[],
	options: CompositeAdapterOptions = {},
): CalendarAdapter {
	if (adapters.length === 0) {
		throw new Error('createCompositeAdapter requires at least one adapter');
	}

	const { primaryIndex = 0 } = options;
	if (primaryIndex < 0 || primaryIndex >= adapters.length) {
		throw new Error(
			`primaryIndex ${primaryIndex} is out of range [0, ${adapters.length - 1}]`,
		);
	}

	const primary = adapters[primaryIndex];

	return {
		async fetchEvents(range: DateRange): Promise<TimelineEvent[]> {
			const results = await Promise.all(
				adapters.map((a) => a.fetchEvents(range)),
			);
			// Flatten and deduplicate by id (first occurrence wins)
			const seen = new Set<string>();
			const merged: TimelineEvent[] = [];
			for (const batch of results) {
				for (const ev of batch) {
					if (!seen.has(ev.id)) {
						seen.add(ev.id);
						merged.push(ev);
					}
				}
			}
			return merged;
		},

		createEvent(event: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent> {
			return primary.createEvent(event);
		},

		updateEvent(id: string, patch: Partial<TimelineEvent>): Promise<TimelineEvent> {
			return primary.updateEvent(id, patch);
		},

		deleteEvent(id: string): Promise<void> {
			return primary.deleteEvent(id);
		},
	};
}
