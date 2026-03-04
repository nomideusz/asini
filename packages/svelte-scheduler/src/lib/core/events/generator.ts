/**
 * Lazy slot generator.
 *
 * Expands ScheduleRules into TourSlot objects, merging with
 * persisted slots (e.g. cancellations) and excluding cancelled slots.
 *
 * Pure function — reads inputs, returns outputs, no writes to any store.
 */

import type { TourDefinition, TourSlot } from '../types.js';
import { expandRule } from './recurrence.js';

// DateRange is { start: Date; end: Date } — structurally compatible with
// @nomideusz/svelte-calendar's DateRange (peer dep, imported at the package index level).
type DateRange = { start: Date; end: Date };

/**
 * Generate slots for a tour within the given date range.
 *
 * 1. Expand all tour.scheduleRules into { startTime, endTime } pairs.
 * 2. Merge with existingSlots (persisted exceptions: cancellations, manual overrides).
 * 3. Exclude cancelled slots.
 * 4. Return sorted ascending by startTime.
 *
 * No slot is written anywhere — this is a pure read operation.
 */
export function generateSlots(
	tour: TourDefinition,
	existingSlots: TourSlot[],
	range: DateRange
): TourSlot[] {
	// Build an index of existing persisted slots keyed by their canonical key.
	// Key: `${scheduleRuleId}:${startTime.toISOString()}` for generated slots,
	//      `manual:${id}` for manually created slots.
	const persistedByKey = new Map<string, TourSlot>();
	for (const slot of existingSlots) {
		const key = slotKey(slot);
		persistedByKey.set(key, slot);
	}

	const result: TourSlot[] = [];

	// Expand each schedule rule and build virtual slots.
	for (const rule of tour.scheduleRules) {
		const occurrences = expandRule(rule, range);

		for (const occ of occurrences) {
			const key = `${rule.id}:${occ.startTime.toISOString()}`;

			if (persistedByKey.has(key)) {
				// Use the persisted slot (may be cancelled, full, etc.)
				const persisted = persistedByKey.get(key)!;
				if (persisted.status !== 'cancelled') {
					result.push(persisted);
				}
				// Mark as consumed so it's not added again from existingSlots below.
				persistedByKey.delete(key);
			} else {
				// Virtual slot — generated on the fly, not yet persisted.
				result.push({
					id: `virtual:${rule.id}:${occ.startTime.toISOString()}`,
					tourId: tour.id,
					startTime: occ.startTime,
					endTime: occ.endTime,
					availableSpots: tour.capacity,
					bookedSpots: 0,
					status: 'open',
					isGenerated: true,
					scheduleRuleId: rule.id,
				});
			}
		}
	}

	// Add remaining persisted slots that are within the range but not matched
	// to a rule expansion (e.g. manually created one-off slots).
	for (const slot of persistedByKey.values()) {
		if (slot.status === 'cancelled') continue;
		if (slot.startTime >= range.start && slot.startTime < range.end) {
			result.push(slot);
		}
	}

	// Sort ascending by startTime.
	result.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

	return result;
}

/**
 * Compute a canonical lookup key for a persisted TourSlot.
 */
function slotKey(slot: TourSlot): string {
	if (slot.scheduleRuleId) {
		return `${slot.scheduleRuleId}:${slot.startTime.toISOString()}`;
	}
	return `manual:${slot.id}`;
}
