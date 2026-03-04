/**
 * useScheduler — reactive composable wrapping SchedulerAdapter methods.
 *
 * Provides $state-based loading, error, and data for tours, slots, and bookings.
 * Import and call in a Svelte 5 component or .svelte.ts file.
 */
import type { SchedulerAdapter } from '../adapters/types.js';
import type { TourDefinition, TourSlot, Booking } from '../core/types.js';
import type { DateRange } from '@nomideusz/svelte-calendar';

export function useScheduler(adapter: SchedulerAdapter) {
	// ─── Tours ────────────────────────────────────────────

	let tours = $state<TourDefinition[]>([]);
	let toursLoading = $state(false);
	let toursError = $state<string | null>(null);

	async function fetchTours(filter?: { status?: 'active' | 'draft' }) {
		toursLoading = true;
		toursError = null;
		try {
			tours = await adapter.getTours(filter);
		} catch (e) {
			toursError = e instanceof Error ? e.message : 'Failed to fetch tours.';
		} finally {
			toursLoading = false;
		}
	}

	// ─── Slots ────────────────────────────────────────────

	let slots = $state<TourSlot[]>([]);
	let slotsLoading = $state(false);
	let slotsError = $state<string | null>(null);

	async function fetchSlots(tourId: string, range: DateRange) {
		slotsLoading = true;
		slotsError = null;
		try {
			slots = await adapter.getSlots(tourId, range);
		} catch (e) {
			slotsError = e instanceof Error ? e.message : 'Failed to fetch slots.';
		} finally {
			slotsLoading = false;
		}
	}

	// ─── Bookings ─────────────────────────────────────────

	let bookings = $state<Booking[]>([]);
	let bookingsLoading = $state(false);
	let bookingsError = $state<string | null>(null);

	async function fetchBookingsForSlot(slotId: string) {
		bookingsLoading = true;
		bookingsError = null;
		try {
			bookings = await adapter.getBookingsForSlot(slotId);
		} catch (e) {
			bookingsError = e instanceof Error ? e.message : 'Failed to fetch bookings.';
		} finally {
			bookingsLoading = false;
		}
	}

	async function fetchBookingsForTour(tourId: string, range?: DateRange) {
		bookingsLoading = true;
		bookingsError = null;
		try {
			bookings = await adapter.getBookingsForTour(tourId, range);
		} catch (e) {
			bookingsError = e instanceof Error ? e.message : 'Failed to fetch bookings.';
		} finally {
			bookingsLoading = false;
		}
	}

	return {
		get tours() { return tours; },
		get toursLoading() { return toursLoading; },
		get toursError() { return toursError; },
		fetchTours,

		get slots() { return slots; },
		get slotsLoading() { return slotsLoading; },
		get slotsError() { return slotsError; },
		fetchSlots,

		get bookings() { return bookings; },
		get bookingsLoading() { return bookingsLoading; },
		get bookingsError() { return bookingsError; },
		fetchBookingsForSlot,
		fetchBookingsForTour,
	};
}
