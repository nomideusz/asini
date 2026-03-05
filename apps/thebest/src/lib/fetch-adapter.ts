/**
 * Client-side SchedulerAdapter that proxies calls to /api/scheduler.
 *
 * Used by BookingFlow to perform server-side operations via fetch.
 */
import type { SchedulerAdapter } from '@nomideusz/svelte-scheduler';
import type {
	TourDefinition,
	TourSlot,
	Booking,
	BookingStatus,
	DateRange,
} from '@nomideusz/svelte-scheduler';

async function rpc<T>(method: string, ...args: unknown[]): Promise<T> {
	const res = await fetch('/api/scheduler', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ method, args }),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Scheduler API error: ${text}`);
	}
	return res.json() as Promise<T>;
}

/** Revive Date fields in a slot response */
function reviveSlot(slot: Record<string, unknown>): TourSlot {
	return {
		...slot,
		startTime: new Date(slot.startTime as string),
		endTime: new Date(slot.endTime as string),
	} as TourSlot;
}

export function createFetchAdapter(): SchedulerAdapter {
	return {
		async getTours(filter) {
			return rpc<TourDefinition[]>('getTours', filter);
		},
		async getTourById(id) {
			return rpc<TourDefinition | undefined>('getTourById', id);
		},
		async createTour(tour) {
			return rpc<TourDefinition>('createTour', tour);
		},
		async updateTour(id, patch) {
			return rpc<TourDefinition>('updateTour', id, patch);
		},
		async deleteTour(id) {
			return rpc<void>('deleteTour', id);
		},
		async getSlots(tourId, range) {
			const result = await rpc<Record<string, unknown>[]>('getSlots', tourId, range);
			return result.map(reviveSlot);
		},
		async getSlotById(id) {
			const result = await rpc<Record<string, unknown> | null>('getSlotById', id);
			return result ? reviveSlot(result) : undefined;
		},
		async createSlot(slot) {
			const result = await rpc<Record<string, unknown>>('createSlot', slot);
			return reviveSlot(result);
		},
		async updateSlot(id, patch) {
			const result = await rpc<Record<string, unknown>>('updateSlot', id, patch);
			return reviveSlot(result);
		},
		async cancelSlot(id, cancelledBy) {
			const result = await rpc<Record<string, unknown>>('cancelSlot', id, cancelledBy);
			return reviveSlot(result);
		},
		async getBookingsForSlot(slotId) {
			return rpc<Booking[]>('getBookingsForSlot', slotId);
		},
		async getBookingsForTour(tourId, range) {
			return rpc<Booking[]>('getBookingsForTour', tourId, range);
		},
		async getBookingById(id) {
			return rpc<Booking | undefined>('getBookingById', id);
		},
		async getBookingByReference(reference) {
			return rpc<Booking | undefined>('getBookingByReference', reference);
		},
		async createBooking(booking) {
			return rpc<Booking>('createBooking', booking);
		},
		async updateBookingStatus(
			id: string,
			status: BookingStatus,
			metadata?: { cancelledBy?: 'guest' | 'guide' | 'system'; cancellationReason?: string },
		) {
			return rpc<Booking>('updateBookingStatus', id, status, metadata);
		},
	};
}
