/**
 * Creates a `CalendarAdapter` (from `@nomideusz/svelte-calendar`) that drives
 * the calendar from a `SchedulerAdapter`.
 *
 * The returned adapter is read-only — write operations (createEvent, updateEvent,
 * deleteEvent) are not supported and will throw.
 */

import type { CalendarAdapter, DateRange, TimelineEvent } from '@nomideusz/svelte-calendar';
import type { SchedulerAdapter } from '../adapters/types.js';
import { generateSlots } from '../core/events/generator.js';
import { toTimelineEvent } from './toTimelineEvent.js';

/**
 * Wrap a `SchedulerAdapter` as a `CalendarAdapter` scoped to a single tour.
 *
 * `getEvents(range)` workflow:
 * 1. Load the `TourDefinition` via `adapter.getTourById(tourId)`.
 * 2. Fetch persisted slots via `adapter.getSlots(tourId, range)`.
 * 3. Fill in lazily-generated slots via `generateSlots(tour, existingSlots, range)`.
 * 4. Map each slot to a `TimelineEvent` via `toTimelineEvent(slot, tour)`.
 *
 * Returns an empty array if the tour is not found.
 */
export function toCalendarAdapter(
	adapter: SchedulerAdapter,
	tourId: string,
): CalendarAdapter {
	return {
		async fetchEvents(range: DateRange): Promise<TimelineEvent[]> {
			const tour = await adapter.getTourById(tourId);
			if (!tour) return [];

			const existingSlots = await adapter.getSlots(tourId, range);
			const slots = generateSlots(tour, existingSlots, range);

			return slots.map((slot) => toTimelineEvent(slot, tour));
		},

		async createEvent(): Promise<TimelineEvent> {
			throw new Error(
				'toCalendarAdapter: createEvent is not supported — the scheduler bridge is read-only',
			);
		},

		async updateEvent(): Promise<TimelineEvent> {
			throw new Error(
				'toCalendarAdapter: updateEvent is not supported — the scheduler bridge is read-only',
			);
		},

		async deleteEvent(): Promise<void> {
			throw new Error(
				'toCalendarAdapter: deleteEvent is not supported — the scheduler bridge is read-only',
			);
		},
	};
}
