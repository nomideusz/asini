/**
 * SchedulerAdapter — the integration contract for booking/scheduling data.
 *
 * Any data source (in-memory, REST API, database) implements this interface.
 * The scheduler engine calls these methods and the adapter handles persistence.
 *
 * Modeled after @nomideusz/svelte-calendar's CalendarAdapter pattern but
 * extended for the full booking lifecycle: tours, slots, and bookings.
 */
import type { DateRange } from '@nomideusz/svelte-calendar';
import type {
	TourDefinition,
	TourSlot,
	Booking,
	BookingStatus,
} from '../core/types.js';

export interface SchedulerAdapter {
	// ─── Tour CRUD ──────────────────────────────────────

	/** Fetch all tours, optionally filtered by status. */
	getTours(filter?: { status?: 'active' | 'draft' }): Promise<TourDefinition[]>;

	/** Fetch a single tour by ID. */
	getTourById(id: string): Promise<TourDefinition | undefined>;

	/** Create a new tour definition. Returns it with a server-assigned ID. */
	createTour(tour: Omit<TourDefinition, 'id'>): Promise<TourDefinition>;

	/** Update a tour definition. Returns the updated tour. */
	updateTour(id: string, patch: Partial<TourDefinition>): Promise<TourDefinition>;

	/** Delete a tour and all its associated slots and bookings. */
	deleteTour(id: string): Promise<void>;

	// ─── Slot management ────────────────────────────────

	/** Fetch slots for a tour within a date range. */
	getSlots(tourId: string, range: DateRange): Promise<TourSlot[]>;

	/** Fetch a single slot by ID. */
	getSlotById(id: string): Promise<TourSlot | undefined>;

	/** Create a manual (non-generated) slot. */
	createSlot(slot: Omit<TourSlot, 'id'>): Promise<TourSlot>;

	/** Update a slot (e.g. change status, adjust capacity). */
	updateSlot(id: string, patch: Partial<TourSlot>): Promise<TourSlot>;

	/** Cancel a slot. Triggers side effects per the state machine. */
	cancelSlot(id: string, cancelledBy: 'guide' | 'system'): Promise<TourSlot>;

	// ─── Booking lifecycle ──────────────────────────────

	/** Fetch bookings for a specific slot. */
	getBookingsForSlot(slotId: string): Promise<Booking[]>;

	/** Fetch bookings for a specific tour across all slots. */
	getBookingsForTour(tourId: string, range?: DateRange): Promise<Booking[]>;

	/** Fetch a single booking by ID. */
	getBookingById(id: string): Promise<Booking | undefined>;

	/** Fetch a booking by its human-readable reference. */
	getBookingByReference(reference: string): Promise<Booking | undefined>;

	/** Create a new booking. Returns it with a server-assigned ID and reference. */
	createBooking(booking: Omit<Booking, 'id' | 'bookingReference' | 'createdAt'>): Promise<Booking>;

	/** Update booking status (confirm, cancel, complete, mark no-show). */
	updateBookingStatus(
		id: string,
		status: BookingStatus,
		metadata?: { cancelledBy?: 'guest' | 'guide' | 'system'; cancellationReason?: string },
	): Promise<Booking>;
}
