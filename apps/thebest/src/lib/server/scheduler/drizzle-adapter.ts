/**
 * Drizzle-backed SchedulerAdapter for thebest.travel.
 *
 * Implements @nomideusz/svelte-scheduler's SchedulerAdapter interface
 * using the PostgreSQL schema defined in ./schema.ts.
 *
 * Key conventions:
 * - Monetary values: DB stores integer cents, adapter converts to/from float on the boundary
 * - JSON columns: deserialized on read, serialized on write
 * - Slot generation is lazy: only persisted slots are in the DB.
 *   The caller uses generateSlots() for rule-based slots.
 * - createBooking also persists the slot row if it doesn't exist yet
 *   (first booking on a generated slot creates its DB record)
 */
import { eq, and, gte, lte } from 'drizzle-orm';
import type { DateRange } from '@nomideusz/svelte-calendar';
import type {
	TourDefinition,
	TourSlot,
	Booking,
	BookingStatus,
	PriceStructure,
	CancellationPolicy,
	ScheduleRule,
	PriceBreakdown,
	SlotStatus,
	AttendanceStatus,
} from '@nomideusz/svelte-scheduler';
import type { SchedulerAdapter } from '@nomideusz/svelte-scheduler';
import type { Database } from '../db/index.js';
import { guides, tours, slots, bookings } from '../db/schema.js';

// ─── Booking reference generator ─────────────────────────

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

// ─── Row → domain mappers ─────────────────────────────────

function rowToTour(row: typeof tours.$inferSelect): TourDefinition {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		duration: row.duration,
		capacity: row.capacity,
		minCapacity: row.minCapacity,
		maxCapacity: row.maxCapacity,
		languages: row.languages,
		location: row.location ?? undefined,
		categories: row.categories,
		includedItems: row.includedItems,
		requirements: row.requirements,
		images: row.images,
		isPublic: row.isPublic,
		status: row.status,
		pricing: row.pricingJson as PriceStructure,
		cancellationPolicy: row.cancellationPolicyJson as CancellationPolicy,
		scheduleRules: (row.scheduleRulesJson as ScheduleRule[]) ?? [],
	};
}

function rowToSlot(row: typeof slots.$inferSelect): TourSlot {
	return {
		id: row.id,
		tourId: row.tourId,
		startTime: row.startTime,
		endTime: row.endTime,
		availableSpots: row.availableSpots,
		bookedSpots: row.bookedSpots,
		status: row.status as SlotStatus,
		isGenerated: row.isGenerated,
		scheduleRuleId: row.scheduleRuleId ?? undefined,
		notes: row.notes ?? undefined,
	};
}

function rowToBooking(row: typeof bookings.$inferSelect): Booking {
	return {
		id: row.id,
		tourId: row.tourId,
		slotId: row.slotId ?? '',
		guest: {
			name: row.guestName,
			email: row.guestEmail,
			phone: row.guestPhone ?? undefined,
			language: row.guestLanguage ?? undefined,
		},
		participants: row.participants,
		participantsByCategory:
			(row.participantsByCategoryJson as Record<string, number> | null) ?? undefined,
		selectedAddonIds: (row.selectedAddonIdsJson as string[] | null) ?? undefined,
		priceBreakdown: row.priceBreakdownJson as PriceBreakdown,
		// Convert integer cents → float
		totalAmount: row.totalAmount / 100,
		currency: row.currency,
		status: row.status as BookingStatus,
		paymentStatus: row.paymentStatus as 'pending' | 'paid' | 'failed' | 'refunded',
		bookingReference: row.bookingReference,
		attendanceStatus: row.attendanceStatus as AttendanceStatus,
		specialRequests: row.specialRequests ?? undefined,
		cancelledBy: (row.cancelledBy as 'guest' | 'guide' | 'system' | null) ?? undefined,
		cancellationReason: row.cancellationReason ?? undefined,
		createdAt: row.createdAt.toISOString(),
	};
}

export type DrizzleAdapter = SchedulerAdapter & {
	/** Create a tour for a specific guide. Replaces createTour() until auth is implemented. */
	createTourForGuide(guideId: string, tour: Omit<TourDefinition, 'id'>): Promise<TourDefinition>;
};

// ─── Factory ─────────────────────────────────────────────

export function createDrizzleAdapter(db: Database): DrizzleAdapter {
	// ─── Tour CRUD ───────────────────────────────────────

	async function getTours(filter?: { status?: 'active' | 'draft' }): Promise<TourDefinition[]> {
		const rows = filter?.status
			? await db.select().from(tours).where(eq(tours.status, filter.status))
			: await db.select().from(tours);
		return rows.map(rowToTour);
	}

	async function getTourById(id: string): Promise<TourDefinition | undefined> {
		const rows = await db.select().from(tours).where(eq(tours.id, id)).limit(1);
		return rows[0] ? rowToTour(rows[0]) : undefined;
	}

	async function createTour(tour: Omit<TourDefinition, 'id'>): Promise<TourDefinition> {
		// TODO: auth flow — guideId must come from the authenticated session.
		// createTour is not callable until auth is implemented.
		throw new Error('createTour requires an authenticated guide — use createTourForGuide(guideId, tour) instead');
	}

	async function updateTour(id: string, patch: Partial<TourDefinition>): Promise<TourDefinition> {
		const updates: Partial<typeof tours.$inferInsert> = {};
		if (patch.name !== undefined) updates.name = patch.name;
		if (patch.description !== undefined) updates.description = patch.description;
		if (patch.duration !== undefined) updates.duration = patch.duration;
		if (patch.capacity !== undefined) updates.capacity = patch.capacity;
		if (patch.minCapacity !== undefined) updates.minCapacity = patch.minCapacity;
		if (patch.maxCapacity !== undefined) updates.maxCapacity = patch.maxCapacity;
		if (patch.languages !== undefined) updates.languages = patch.languages;
		if (patch.location !== undefined) updates.location = patch.location;
		if (patch.categories !== undefined) updates.categories = patch.categories;
		if (patch.includedItems !== undefined) updates.includedItems = patch.includedItems;
		if (patch.requirements !== undefined) updates.requirements = patch.requirements;
		if (patch.images !== undefined) updates.images = patch.images;
		if (patch.pricing !== undefined) updates.pricingJson = patch.pricing;
		if (patch.cancellationPolicy !== undefined)
			updates.cancellationPolicyJson = patch.cancellationPolicy;
		if (patch.scheduleRules !== undefined) updates.scheduleRulesJson = patch.scheduleRules;
		if (patch.status !== undefined) updates.status = patch.status;
		if (patch.isPublic !== undefined) updates.isPublic = patch.isPublic;

		const rows = await db
			.update(tours)
			.set({ ...updates, updatedAt: new Date() })
			.where(eq(tours.id, id))
			.returning();
		if (!rows[0]) throw new Error(`Tour not found: ${id}`);
		return rowToTour(rows[0]);
	}

	async function deleteTour(id: string): Promise<void> {
		// Cascade handled by FK constraints in schema
		await db.delete(tours).where(eq(tours.id, id));
	}

	// ─── Slot management ─────────────────────────────────

	async function getSlots(tourId: string, range: DateRange): Promise<TourSlot[]> {
		const rows = await db
			.select()
			.from(slots)
			.where(
				and(
					eq(slots.tourId, tourId),
					gte(slots.startTime, range.start),
					lte(slots.startTime, range.end),
				),
			);
		return rows.map(rowToSlot);
	}

	async function getSlotById(id: string): Promise<TourSlot | undefined> {
		const rows = await db.select().from(slots).where(eq(slots.id, id)).limit(1);
		return rows[0] ? rowToSlot(rows[0]) : undefined;
	}

	async function createSlot(slot: Omit<TourSlot, 'id'>): Promise<TourSlot> {
		const rows = await db
			.insert(slots)
			.values({
				tourId: slot.tourId,
				scheduleRuleId: slot.scheduleRuleId,
				startTime: slot.startTime,
				endTime: slot.endTime,
				availableSpots: slot.availableSpots,
				bookedSpots: slot.bookedSpots,
				status: slot.status,
				notes: slot.notes,
				isGenerated: slot.isGenerated,
			})
			.returning();
		if (!rows[0]) throw new Error('Failed to create slot');
		return rowToSlot(rows[0]);
	}

	async function updateSlot(id: string, patch: Partial<TourSlot>): Promise<TourSlot> {
		const updates: Partial<typeof slots.$inferInsert> = {};
		if (patch.availableSpots !== undefined) updates.availableSpots = patch.availableSpots;
		if (patch.bookedSpots !== undefined) updates.bookedSpots = patch.bookedSpots;
		if (patch.status !== undefined) updates.status = patch.status;
		if (patch.notes !== undefined) updates.notes = patch.notes;

		const rows = await db
			.update(slots)
			.set(updates)
			.where(eq(slots.id, id))
			.returning();
		if (!rows[0]) throw new Error(`Slot not found: ${id}`);
		return rowToSlot(rows[0]);
	}

	async function cancelSlot(id: string, cancelledBy: 'guide' | 'system'): Promise<TourSlot> {
		// Update slot status to cancelled
		const slotRows = await db
			.update(slots)
			.set({ status: 'cancelled' })
			.where(eq(slots.id, id))
			.returning();
		if (!slotRows[0]) throw new Error(`Slot not found: ${id}`);

		// Cascade: cancel all confirmed bookings for this slot
		// Guide cancellation = full refund (see AGENTS.md — non-negotiable)
		await db
			.update(bookings)
			.set({
				status: 'cancelled',
				cancelledBy,
				cancellationReason: `Slot cancelled by ${cancelledBy}`,
			})
			.where(and(eq(bookings.slotId, id), eq(bookings.status, 'confirmed')));

		// TODO: Resend email notification — notify all affected guests in their language

		return rowToSlot(slotRows[0]);
	}

	// ─── Booking lifecycle ───────────────────────────────

	async function getBookingsForSlot(slotId: string): Promise<Booking[]> {
		const rows = await db.select().from(bookings).where(eq(bookings.slotId, slotId));
		return rows.map(rowToBooking);
	}

	async function getBookingsForTour(tourId: string, range?: DateRange): Promise<Booking[]> {
		if (!range) {
			const rows = await db.select().from(bookings).where(eq(bookings.tourId, tourId));
			return rows.map(rowToBooking);
		}

		// Join with slots to filter by date range
		const rows = await db
			.select({ booking: bookings })
			.from(bookings)
			.innerJoin(slots, eq(bookings.slotId, slots.id))
			.where(
				and(
					eq(bookings.tourId, tourId),
					gte(slots.startTime, range.start),
					lte(slots.startTime, range.end),
				),
			);
		return rows.map((r) => rowToBooking(r.booking));
	}

	async function getBookingById(id: string): Promise<Booking | undefined> {
		const rows = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
		return rows[0] ? rowToBooking(rows[0]) : undefined;
	}

	async function getBookingByReference(reference: string): Promise<Booking | undefined> {
		const rows = await db
			.select()
			.from(bookings)
			.where(eq(bookings.bookingReference, reference))
			.limit(1);
		return rows[0] ? rowToBooking(rows[0]) : undefined;
	}

	async function createBooking(
		booking: Omit<Booking, 'id' | 'bookingReference' | 'createdAt'>,
	): Promise<Booking> {
		const bookingReference = generateBookingReference();
		const slotId = booking.slotId;

		// If the slot doesn't exist in the DB yet (generated slot receiving its first booking),
		// throw an error — the caller must persist the slot first using createSlot().
		if (slotId) {
			const existingSlot = await getSlotById(slotId);
			if (!existingSlot) {
				throw new Error(
					`Slot ${slotId} not found in the database. ` +
					'For generated slots receiving their first booking, call createSlot() first to persist the slot row.',
				);
			}
		}

		// Convert float → integer cents for DB storage
		const totalAmountCents = Math.round(booking.totalAmount * 100);

		const rows = await db
			.insert(bookings)
			.values({
				tourId: booking.tourId,
				slotId: slotId || null,
				guestName: booking.guest.name,
				guestEmail: booking.guest.email,
				guestPhone: booking.guest.phone,
				guestLanguage: booking.guest.language,
				participants: booking.participants,
				participantsByCategoryJson: booking.participantsByCategory ?? null,
				selectedAddonIdsJson: booking.selectedAddonIds ?? null,
				priceBreakdownJson: booking.priceBreakdown,
				totalAmount: totalAmountCents,
				currency: booking.currency,
				status: booking.status,
				paymentStatus: booking.paymentStatus,
				bookingReference,
				attendanceStatus: booking.attendanceStatus,
				specialRequests: booking.specialRequests,
				cancelledBy: booking.cancelledBy,
				cancellationReason: booking.cancellationReason,
			})
			.returning();

		if (!rows[0]) throw new Error('Failed to create booking');

		// Update slot: increment bookedSpots, transition to 'full' if capacity reached
		if (slotId) {
			const slotRows = await db.select().from(slots).where(eq(slots.id, slotId)).limit(1);
			if (slotRows[0]) {
				const slot = slotRows[0];
				const newBookedSpots = slot.bookedSpots + booking.participants;
				const newStatus =
					slot.status !== 'cancelled' &&
					slot.status !== 'completed' &&
					newBookedSpots >= slot.availableSpots
						? 'full'
						: slot.status;
				await db
					.update(slots)
					.set({ bookedSpots: newBookedSpots, status: newStatus })
					.where(eq(slots.id, slotId));
			}
		}

		return rowToBooking(rows[0]);
	}

	async function updateBookingStatus(
		id: string,
		status: BookingStatus,
		metadata?: { cancelledBy?: 'guest' | 'guide' | 'system'; cancellationReason?: string },
	): Promise<Booking> {
		const updates: Partial<typeof bookings.$inferInsert> = { status };
		if (metadata?.cancelledBy !== undefined) updates.cancelledBy = metadata.cancelledBy;
		if (metadata?.cancellationReason !== undefined)
			updates.cancellationReason = metadata.cancellationReason;

		const rows = await db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();
		if (!rows[0]) throw new Error(`Booking not found: ${id}`);
		return rowToBooking(rows[0]);
	}

	// ─── Guide-scoped tour creation ──────────────────────
	//
	// createTour (from SchedulerAdapter) is intentionally disabled until auth is implemented.
	// Use createTourForGuide() directly from authenticated server routes.

	async function createTourForGuide(
		guideId: string,
		tour: Omit<TourDefinition, 'id'>,
	): Promise<TourDefinition> {
		const rows = await db
			.insert(tours)
			.values({
				guideId,
				name: tour.name,
				description: tour.description,
				duration: tour.duration,
				capacity: tour.capacity,
				minCapacity: tour.minCapacity,
				maxCapacity: tour.maxCapacity,
				languages: tour.languages,
				location: tour.location,
				categories: tour.categories,
				includedItems: tour.includedItems,
				requirements: tour.requirements,
				images: tour.images,
				pricingJson: tour.pricing,
				cancellationPolicyJson: tour.cancellationPolicy,
				scheduleRulesJson: tour.scheduleRules,
				status: tour.status,
				isPublic: tour.isPublic,
			})
			.returning();
		if (!rows[0]) throw new Error('Failed to create tour');
		return rowToTour(rows[0]);
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
		// Extended — not on SchedulerAdapter interface
		createTourForGuide,
	};
}
