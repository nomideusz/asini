/**
 * In-memory SchedulerAdapter — for testing and demos.
 *
 * All data lives in Maps keyed by ID. No external dependencies.
 * Use `createMemoryAdapter(seed?)` to get a fresh adapter instance.
 */
import type { DateRange } from '@nomideusz/svelte-calendar';
import type { TourDefinition, TourSlot, Booking, BookingStatus } from '../core/types.js';
import type { SchedulerAdapter } from './types.js';

// ─── Seed data shape ─────────────────────────────────────

export interface MemoryAdapterSeed {
	tours?: TourDefinition[];
	slots?: TourSlot[];
	bookings?: Booking[];
}

// ─── Reference generation ────────────────────────────────

/** Generate a booking reference in the format BK-XXXXXXXX (uppercase alphanumeric). */
function generateBookingReference(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	let result = 'BK-';
	for (let i = 0; i < 8; i++) {
		result += chars[bytes[i] % chars.length];
	}
	return result;
}

// ─── Factory ─────────────────────────────────────────────

export function createMemoryAdapter(seed?: MemoryAdapterSeed): SchedulerAdapter {
	const tours = new Map<string, TourDefinition>();
	const slots = new Map<string, TourSlot>();
	const bookings = new Map<string, Booking>();

	// Populate from seed
	if (seed?.tours) {
		for (const tour of seed.tours) tours.set(tour.id, { ...tour });
	}
	if (seed?.slots) {
		for (const slot of seed.slots) slots.set(slot.id, { ...slot });
	}
	if (seed?.bookings) {
		for (const booking of seed.bookings) bookings.set(booking.id, { ...booking });
	}

	// ─── Tour CRUD ───────────────────────────────────────

	async function getTours(filter?: { status?: 'active' | 'draft' }): Promise<TourDefinition[]> {
		const all = Array.from(tours.values());
		if (filter?.status) {
			return all.filter((t) => t.status === filter.status);
		}
		return all;
	}

	async function getTourById(id: string): Promise<TourDefinition | undefined> {
		return tours.get(id);
	}

	async function createTour(tour: Omit<TourDefinition, 'id'>): Promise<TourDefinition> {
		const id = crypto.randomUUID();
		const newTour: TourDefinition = { ...tour, id };
		tours.set(id, newTour);
		return newTour;
	}

	async function updateTour(id: string, patch: Partial<TourDefinition>): Promise<TourDefinition> {
		const existing = tours.get(id);
		if (!existing) throw new Error(`Tour not found: ${id}`);
		const updated: TourDefinition = { ...existing, ...patch, id };
		tours.set(id, updated);
		return updated;
	}

	async function deleteTour(id: string): Promise<void> {
		tours.delete(id);
		// Cascade: delete all slots for this tour
		const slotIds: string[] = [];
		for (const [slotId, slot] of slots) {
			if (slot.tourId === id) slotIds.push(slotId);
		}
		for (const slotId of slotIds) {
			slots.delete(slotId);
			// Cascade: delete all bookings for each slot
			for (const [bookingId, booking] of bookings) {
				if (booking.slotId === slotId) bookings.delete(bookingId);
			}
		}
	}

	// ─── Slot management ─────────────────────────────────

	async function getSlots(tourId: string, range: DateRange): Promise<TourSlot[]> {
		return Array.from(slots.values()).filter(
			(s) =>
				s.tourId === tourId &&
				s.startTime >= range.start &&
				s.startTime <= range.end,
		);
	}

	async function getSlotById(id: string): Promise<TourSlot | undefined> {
		return slots.get(id);
	}

	async function createSlot(slot: Omit<TourSlot, 'id'>): Promise<TourSlot> {
		const id = crypto.randomUUID();
		const newSlot: TourSlot = { ...slot, id };
		slots.set(id, newSlot);
		return newSlot;
	}

	async function updateSlot(id: string, patch: Partial<TourSlot>): Promise<TourSlot> {
		const existing = slots.get(id);
		if (!existing) throw new Error(`Slot not found: ${id}`);
		const updated: TourSlot = { ...existing, ...patch, id };
		slots.set(id, updated);
		return updated;
	}

	async function cancelSlot(id: string, cancelledBy: 'guide' | 'system'): Promise<TourSlot> {
		const existing = slots.get(id);
		if (!existing) throw new Error(`Slot not found: ${id}`);
		const cancelled: TourSlot = { ...existing, id, status: 'cancelled' };
		slots.set(id, cancelled);
		// Cascade: cancel all confirmed bookings for this slot
		for (const [bookingId, booking] of bookings) {
			if (booking.slotId === id && booking.status === 'confirmed') {
				bookings.set(bookingId, {
					...booking,
					status: 'cancelled',
					cancelledBy,
					cancellationReason: `Slot cancelled by ${cancelledBy}`,
				});
			}
		}
		return cancelled;
	}

	// ─── Booking lifecycle ───────────────────────────────

	async function getBookingsForSlot(slotId: string): Promise<Booking[]> {
		return Array.from(bookings.values()).filter((b) => b.slotId === slotId);
	}

	async function getBookingsForTour(tourId: string, range?: DateRange): Promise<Booking[]> {
		return Array.from(bookings.values()).filter((b) => {
			if (b.tourId !== tourId) return false;
			if (!range) return true;
			const slot = slots.get(b.slotId);
			if (!slot) return true;
			return slot.startTime >= range.start && slot.startTime <= range.end;
		});
	}

	async function getBookingById(id: string): Promise<Booking | undefined> {
		return bookings.get(id);
	}

	async function getBookingByReference(reference: string): Promise<Booking | undefined> {
		for (const booking of bookings.values()) {
			if (booking.bookingReference === reference) return booking;
		}
		return undefined;
	}

	async function createBooking(
		booking: Omit<Booking, 'id' | 'bookingReference' | 'createdAt'>,
	): Promise<Booking> {
		const id = crypto.randomUUID();
		const bookingReference = generateBookingReference();
		const createdAt = new Date().toISOString();
		const newBooking: Booking = { ...booking, id, bookingReference, createdAt };
		bookings.set(id, newBooking);

		// Update slot: increment bookedSpots, transition to 'full' if needed
		const slot = slots.get(booking.slotId);
		if (slot) {
			const bookedSpots = slot.bookedSpots + booking.participants;
			const status =
				slot.status !== 'cancelled' && slot.status !== 'completed' && bookedSpots >= slot.availableSpots
					? 'full'
					: slot.status;
			slots.set(slot.id, { ...slot, bookedSpots, status });
		}

		return newBooking;
	}

	async function updateBookingStatus(
		id: string,
		status: BookingStatus,
		metadata?: { cancelledBy?: 'guest' | 'guide' | 'system'; cancellationReason?: string },
	): Promise<Booking> {
		const existing = bookings.get(id);
		if (!existing) throw new Error(`Booking not found: ${id}`);
		const updated: Booking = {
			...existing,
			status,
			...(metadata?.cancelledBy !== undefined ? { cancelledBy: metadata.cancelledBy } : {}),
			...(metadata?.cancellationReason !== undefined
				? { cancellationReason: metadata.cancellationReason }
				: {}),
		};
		bookings.set(id, updated);
		return updated;
	}

	return {
		getTours,
		getTourById,
		createTour,
		updateTour,
		deleteTour,
		getSlots,
		getSlotById,
		createSlot,
		updateSlot,
		cancelSlot,
		getBookingsForSlot,
		getBookingsForTour,
		getBookingById,
		getBookingByReference,
		createBooking,
		updateBookingStatus,
	};
}
