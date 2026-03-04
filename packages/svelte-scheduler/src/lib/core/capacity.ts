/**
 * Capacity utilities for TourSlot management.
 *
 * Pure functions only — no DB, no Stripe, no SvelteKit imports.
 */

import type { TourSlot, TourDefinition } from './types.js';

/**
 * Returns how many spots are still available on a slot.
 */
export function availableSpots(slot: TourSlot): number {
	return Math.max(0, slot.availableSpots - slot.bookedSpots);
}

/**
 * Returns true if the slot has reached its capacity.
 */
export function isFull(slot: TourSlot): boolean {
	return slot.bookedSpots >= slot.availableSpots;
}

/**
 * Returns true if a slot is at risk of cancellation
 * (below minimum capacity as cutoff approaches).
 *
 * At-risk conditions (all must be true):
 *  - slot.status === 'open'
 *  - slot.bookedSpots < tour.minCapacity
 *  - less than 24 hours until slot.startTime
 */
export function isAtRisk(slot: TourSlot, tour: TourDefinition, now: Date = new Date()): boolean {
	if (slot.status !== 'open') return false;
	if (slot.bookedSpots >= tour.minCapacity) return false;
	const hoursUntilTour = (slot.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
	return hoursUntilTour < 24;
}

/**
 * Checks whether adding `count` participants would exceed slot capacity.
 *
 * Returns null if within limits, or an error string if not.
 */
export function checkCapacity(slot: TourSlot, count: number): string | null {
	if (count <= 0) return 'Participant count must be greater than 0';
	const remaining = slot.availableSpots - slot.bookedSpots;
	if (count > remaining) return `Only ${remaining} spot(s) available (requested ${count})`;
	return null;
}
