/**
 * Fresh PostgreSQL schema for thebest.travel — no migration debt.
 *
 * Shape reference: Zaur's drizzle.ts (never imported, read-only spec).
 * All monetary values are stored as integer cents.
 * JSON columns are typed as unknown and deserialized at the adapter boundary.
 */
import {
	pgTable,
	uuid,
	text,
	integer,
	boolean,
	timestamp,
	jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Guides ──────────────────────────────────────────────────────────────────

export const guides = pgTable('guides', {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	/** Stripe Connect account ID — populated after onboarding. */
	stripeAccountId: text('stripe_account_id'),
	/** Whether the guide has completed Stripe Connect onboarding. */
	stripeOnboardingComplete: boolean('stripe_onboarding_complete').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Tours ───────────────────────────────────────────────────────────────────

export const tours = pgTable('tours', {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	guideId: uuid('guide_id')
		.notNull()
		.references(() => guides.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description').notNull().default(''),
	/** Duration in minutes. */
	duration: integer('duration').notNull(),
	capacity: integer('capacity').notNull(),
	minCapacity: integer('min_capacity').notNull().default(1),
	maxCapacity: integer('max_capacity').notNull(),
	/** ISO language codes (e.g. ['en', 'pl']). */
	languages: text('languages').array().notNull().default(sql`ARRAY[]::text[]`),
	location: text('location'),
	/** Tour categories / tags. */
	categories: text('categories').array().notNull().default(sql`ARRAY[]::text[]`),
	/** Items included in the tour price. */
	includedItems: text('included_items').array().notNull().default(sql`ARRAY[]::text[]`),
	/** Requirements or prerequisites for participants. */
	requirements: text('requirements').array().notNull().default(sql`ARRAY[]::text[]`),
	/** Image URLs. */
	images: text('images').array().notNull().default(sql`ARRAY[]::text[]`),
	/** Serialized PriceStructure. */
	pricingJson: jsonb('pricing_json').notNull(),
	/** Serialized CancellationPolicy. */
	cancellationPolicyJson: jsonb('cancellation_policy_json').notNull(),
	/** Serialized ScheduleRule[]. */
	scheduleRulesJson: jsonb('schedule_rules_json').notNull().default(sql`'[]'::jsonb`),
	status: text('status', { enum: ['active', 'draft'] }).notNull().default('draft'),
	isPublic: boolean('is_public').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Slots ───────────────────────────────────────────────────────────────────
//
// Lazy slot generation: only cancelled instances and manual slots are persisted.
// Generated slots that have never been touched do not have a DB row.
//

export const slots = pgTable('slots', {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	tourId: uuid('tour_id')
		.notNull()
		.references(() => tours.id, { onDelete: 'cascade' }),
	/** Which schedule rule generated this slot, if any. */
	scheduleRuleId: text('schedule_rule_id'),
	startTime: timestamp('start_time', { withTimezone: true }).notNull(),
	endTime: timestamp('end_time', { withTimezone: true }).notNull(),
	availableSpots: integer('available_spots').notNull(),
	bookedSpots: integer('booked_spots').notNull().default(0),
	/** Slot lifecycle status — see SlotStatus in @nomideusz/svelte-scheduler. */
	status: text('status', { enum: ['open', 'full', 'at_risk', 'cancelled', 'completed'] })
		.notNull()
		.default('open'),
	notes: text('notes'),
	/** Whether this slot was generated from a ScheduleRule (true) or created manually (false). */
	isGenerated: boolean('is_generated').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookings = pgTable('bookings', {
	id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
	tourId: uuid('tour_id')
		.notNull()
		.references(() => tours.id, { onDelete: 'restrict' }),
	/** FK to slots — nullable because generated slots may not have a DB row yet. */
	slotId: uuid('slot_id').references(() => slots.id, { onDelete: 'restrict' }),
	guestName: text('guest_name').notNull(),
	guestEmail: text('guest_email').notNull(),
	guestPhone: text('guest_phone'),
	/** ISO 639-1 language code (e.g. 'en', 'pl'). */
	guestLanguage: text('guest_language'),
	participants: integer('participants').notNull(),
	/** Serialized Record<string, number> — breakdown by category ID. */
	participantsByCategoryJson: jsonb('participants_by_category_json'),
	/** Serialized string[] — selected optional add-on IDs. */
	selectedAddonIdsJson: jsonb('selected_addon_ids_json'),
	/** Serialized PriceBreakdown. */
	priceBreakdownJson: jsonb('price_breakdown_json').notNull(),
	/** Total amount in integer cents (e.g. 1999 = 19.99 PLN). */
	totalAmount: integer('total_amount').notNull(),
	/** ISO 4217 currency code (e.g. 'PLN', 'EUR'). */
	currency: text('currency').notNull(),
	/** Booking lifecycle status. */
	status: text('status', {
		enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
	})
		.notNull()
		.default('pending'),
	/** Payment processing status. */
	paymentStatus: text('payment_status', { enum: ['pending', 'paid', 'failed', 'refunded'] })
		.notNull()
		.default('pending'),
	/** Stripe PaymentIntent ID — populated after payment is initiated. */
	paymentIntentId: text('payment_intent_id'),
	/** Unique human-readable booking reference (e.g. BK-ABCD1234). */
	bookingReference: text('booking_reference').notNull().unique(),
	attendanceStatus: text('attendance_status', {
		enum: ['not_arrived', 'checked_in', 'no_show'],
	})
		.notNull()
		.default('not_arrived'),
	specialRequests: text('special_requests'),
	/** Who cancelled: 'guest' | 'guide' | 'system'. */
	cancelledBy: text('cancelled_by', { enum: ['guest', 'guide', 'system'] }),
	cancellationReason: text('cancellation_reason'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Type exports ─────────────────────────────────────────────────────────────

export type Guide = typeof guides.$inferSelect;
export type NewGuide = typeof guides.$inferInsert;
export type Tour = typeof tours.$inferSelect;
export type NewTour = typeof tours.$inferInsert;
export type Slot = typeof slots.$inferSelect;
export type NewSlot = typeof slots.$inferInsert;
export type BookingRow = typeof bookings.$inferSelect;
export type NewBookingRow = typeof bookings.$inferInsert;
