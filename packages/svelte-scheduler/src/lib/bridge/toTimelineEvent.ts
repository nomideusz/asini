/**
 * Maps a TourSlot + TourDefinition to a TimelineEvent for calendar rendering.
 *
 * Pure function — no side effects, no async.
 */

import type { TimelineEvent } from '@nomideusz/svelte-calendar';
import type { TourSlot, TourDefinition } from '../core/types.js';

/** Threshold for "few spots left" → 'limited' status. */
const LIMITED_THRESHOLD = 3;

/**
 * Booking-availability status — a scheduler-specific concept layered
 * on top of the calendar's standard EventStatus.
 *
 * TODO: add status to TimelineEvent in @nomideusz/svelte-calendar
 * TimelineEvent.status is EventStatus ('confirmed' | 'cancelled' | 'tentative'),
 * which does not yet include booking-availability values
 * ('available' | 'limited' | 'full' | 'cancelled').
 * Until then the availability status is stored in data.status.
 */
type BookingAvailabilityStatus = 'available' | 'limited' | 'full' | 'cancelled';

function mapAvailabilityStatus(slot: TourSlot): BookingAvailabilityStatus {
	switch (slot.status) {
		case 'open': {
			const spotsLeft = slot.availableSpots - slot.bookedSpots;
			return spotsLeft <= LIMITED_THRESHOLD ? 'limited' : 'available';
		}
		case 'full':
			return 'full';
		case 'cancelled':
			return 'cancelled';
		case 'completed':
			return 'available';
		case 'at_risk':
			return 'limited';
	}
}

/**
 * Convert a `TourSlot` and its parent `TourDefinition` into a `TimelineEvent`
 * suitable for rendering with `@nomideusz/svelte-calendar`.
 *
 * Status mapping:
 * - `open` with ≤3 spots left → availability `'limited'`
 * - `open` with plenty of spots → availability `'available'`
 * - `full` → availability `'full'`
 * - `cancelled` → availability `'cancelled'`
 * - `completed` → availability `'available'` (historical, still renderable)
 * - `at_risk` → availability `'limited'`
 *
 * The availability status is stored in `data.status` (see TODO above).
 * `category` is always set from `tour.categories[0]` (never a hardcoded color).
 */
export function toTimelineEvent(slot: TourSlot, tour: TourDefinition): TimelineEvent {
	const spotsLeft = slot.availableSpots - slot.bookedSpots;
	const availabilityStatus = mapAvailabilityStatus(slot);

	return {
		id: slot.id,
		title: tour.name,
		start: slot.startTime,
		end: slot.endTime,
		category: tour.categories[0] ?? tour.name,
		// Map cancelled slots to the standard calendar 'cancelled' EventStatus so
		// the calendar can render them with a visual strike-through or dim style.
		status: slot.status === 'cancelled' ? 'cancelled' : undefined,
		data: {
			slotId: slot.id,
			tourId: tour.id,
			bookedSpots: slot.bookedSpots,
			availableSpots: slot.availableSpots,
			spotsLeft,
			// TODO: add status to TimelineEvent in @nomideusz/svelte-calendar
			status: availabilityStatus,
		},
	};
}
