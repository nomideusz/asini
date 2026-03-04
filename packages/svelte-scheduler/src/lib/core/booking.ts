/**
 * Booking state machine — all booking lifecycle transitions.
 *
 * Pure orchestration layer: validates, prices, delegates persistence to adapter.
 * No DB, no Stripe, no SvelteKit imports.
 *
 * State machine reference: see AGENTS.md "TourSlot State Machine".
 */

import type { SchedulerAdapter } from '../adapters/types.js';
import type { Booking, GuestProfile } from './types.js';
import { calculatePrice } from './pricing/index.js';
import { calculateRefund } from './policy.js';

// ─── Error ───────────────────────────────────────────────

export class BookingError extends Error {
	constructor(
		message: string,
		public readonly code:
			| 'SLOT_NOT_FOUND'
			| 'TOUR_NOT_FOUND'
			| 'SLOT_NOT_OPEN'
			| 'OVER_CAPACITY'
			| 'INVALID_PARTICIPANTS',
	) {
		super(message);
		this.name = 'BookingError';
	}
}

// ─── createBooking ───────────────────────────────────────

/**
 * Create a booking for an open slot.
 *
 * Steps:
 * 1. Load slot — throw BookingError('SLOT_NOT_FOUND') if missing
 * 2. Load tour — throw BookingError('TOUR_NOT_FOUND') if missing
 * 3. Validate slot is open — throw BookingError('SLOT_NOT_OPEN') otherwise
 * 4. Validate participants > 0 and within remaining capacity
 * 5. Calculate price via pricing engine
 * 6. Persist via adapter.createBooking with status 'confirmed'
 */
export async function createBooking(
	adapter: SchedulerAdapter,
	slotId: string,
	guest: GuestProfile,
	participants: number,
	options?: {
		participantsByCategory?: Record<string, number>;
		selectedAddonIds?: string[];
		specialRequests?: string;
	},
): Promise<Booking> {
	// Step 1: load slot
	const slot = await adapter.getSlotById(slotId);
	if (!slot) {
		throw new BookingError(`Slot not found: ${slotId}`, 'SLOT_NOT_FOUND');
	}

	// Step 2: load tour
	const tour = await adapter.getTourById(slot.tourId);
	if (!tour) {
		throw new BookingError(`Tour not found: ${slot.tourId}`, 'TOUR_NOT_FOUND');
	}

	// Step 3: slot must be open
	if (slot.status !== 'open') {
		throw new BookingError(
			`Slot is not open for booking (status: ${slot.status})`,
			'SLOT_NOT_OPEN',
		);
	}

	// Step 4: validate participants
	if (participants <= 0) {
		throw new BookingError('Participants must be greater than 0', 'INVALID_PARTICIPANTS');
	}
	const remaining = slot.availableSpots - slot.bookedSpots;
	if (participants > remaining) {
		throw new BookingError(
			`Not enough capacity: ${remaining} spot(s) available, ${participants} requested`,
			'OVER_CAPACITY',
		);
	}

	// Step 5: calculate price
	const priceBreakdown = calculatePrice({
		pricing: tour.pricing,
		participants,
		participantsByCategory: options?.participantsByCategory,
		selectedAddonIds: options?.selectedAddonIds,
	});

	// Step 6: persist booking
	const booking = await adapter.createBooking({
		tourId: tour.id,
		slotId,
		guest,
		participants,
		...(options?.participantsByCategory !== undefined
			? { participantsByCategory: options.participantsByCategory }
			: {}),
		...(options?.selectedAddonIds !== undefined
			? { selectedAddonIds: options.selectedAddonIds }
			: {}),
		...(options?.specialRequests !== undefined
			? { specialRequests: options.specialRequests }
			: {}),
		priceBreakdown,
		totalAmount: priceBreakdown.totalAmount,
		currency: tour.pricing.currency,
		status: 'confirmed',
		paymentStatus: 'pending',
		attendanceStatus: 'not_arrived',
	});

	return booking;
}

// ─── cancelBooking ───────────────────────────────────────

/**
 * Cancel a booking and calculate the refund.
 *
 * Steps:
 * 1. Load booking — throw if not found
 * 2. Load slot — throw BookingError('SLOT_NOT_FOUND') if missing
 * 3. Load tour — throw BookingError('TOUR_NOT_FOUND') if missing
 * 4. Calculate refund via policy module
 * 5. Update booking status to 'cancelled'
 * 6. If slot was full, count remaining confirmed bookings;
 *    if bookedSpots < availableSpots, reopen slot to 'open'
 * 7. Return updated booking and refund amount
 *
 * Non-negotiable: cancelledBy === 'guide' → 100% refund always.
 */
export async function cancelBooking(
	adapter: SchedulerAdapter,
	bookingId: string,
	cancelledBy: 'guest' | 'guide' | 'system',
	reason?: string,
): Promise<{ booking: Booking; refundAmount: number }> {
	// Step 1: load booking
	const booking = await adapter.getBookingById(bookingId);
	if (!booking) {
		throw new Error(`Booking not found: ${bookingId}`);
	}

	// Step 2: load slot
	const slot = await adapter.getSlotById(booking.slotId);
	if (!slot) {
		throw new BookingError(`Slot not found: ${booking.slotId}`, 'SLOT_NOT_FOUND');
	}

	// Step 3: load tour
	const tour = await adapter.getTourById(booking.tourId);
	if (!tour) {
		throw new BookingError(`Tour not found: ${booking.tourId}`, 'TOUR_NOT_FOUND');
	}

	// Step 4: calculate refund (guide cancellation = 100% always)
	const { refundAmount } = calculateRefund(
		booking.totalAmount,
		tour.cancellationPolicy,
		slot.startTime,
		cancelledBy,
	);

	// Step 5: update booking status
	const updatedBooking = await adapter.updateBookingStatus(bookingId, 'cancelled', {
		cancelledBy,
		cancellationReason: reason,
	});

	// Step 6: if slot was full, recount confirmed bookings and update accordingly.
	// The adapter's updateBookingStatus doesn't decrement bookedSpots, so we
	// recalculate from remaining confirmed bookings and update the slot.
	if (slot.status === 'full') {
		const allBookings = await adapter.getBookingsForSlot(slot.id);
		const newBookedSpots = allBookings
			.filter((b) => b.status === 'confirmed')
			.reduce((sum, b) => sum + b.participants, 0);

		await adapter.updateSlot(slot.id, {
			bookedSpots: newBookedSpots,
			...(newBookedSpots < slot.availableSpots ? { status: 'open' } : {}),
		});
	}

	return { booking: updatedBooking, refundAmount };
}
