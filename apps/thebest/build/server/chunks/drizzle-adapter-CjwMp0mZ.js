import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { pgTable, timestamp, boolean, text, jsonb, integer, uuid } from 'drizzle-orm/pg-core';

const guides = pgTable("guides", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  /** Stripe Connect account ID — populated after onboarding. */
  stripeAccountId: text("stripe_account_id"),
  /** Whether the guide has completed Stripe Connect onboarding. */
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
const tours = pgTable("tours", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  guideId: uuid("guide_id").notNull().references(() => guides.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  /** Duration in minutes. */
  duration: integer("duration").notNull(),
  capacity: integer("capacity").notNull(),
  minCapacity: integer("min_capacity").notNull().default(1),
  maxCapacity: integer("max_capacity").notNull(),
  /** ISO language codes (e.g. ['en', 'pl']). */
  languages: text("languages").array().notNull().default(sql`ARRAY[]::text[]`),
  location: text("location"),
  /** Tour categories / tags. */
  categories: text("categories").array().notNull().default(sql`ARRAY[]::text[]`),
  /** Items included in the tour price. */
  includedItems: text("included_items").array().notNull().default(sql`ARRAY[]::text[]`),
  /** Requirements or prerequisites for participants. */
  requirements: text("requirements").array().notNull().default(sql`ARRAY[]::text[]`),
  /** Image URLs. */
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  /** Serialized PriceStructure. */
  pricingJson: jsonb("pricing_json").notNull(),
  /** Serialized CancellationPolicy. */
  cancellationPolicyJson: jsonb("cancellation_policy_json").notNull(),
  /** Serialized ScheduleRule[]. */
  scheduleRulesJson: jsonb("schedule_rules_json").notNull().default(sql`'[]'::jsonb`),
  status: text("status", { enum: ["active", "draft"] }).notNull().default("draft"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
const slots = pgTable("slots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tourId: uuid("tour_id").notNull().references(() => tours.id, { onDelete: "cascade" }),
  /** Which schedule rule generated this slot, if any. */
  scheduleRuleId: text("schedule_rule_id"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  availableSpots: integer("available_spots").notNull(),
  bookedSpots: integer("booked_spots").notNull().default(0),
  /** Slot lifecycle status — see SlotStatus in @nomideusz/svelte-scheduler. */
  status: text("status", { enum: ["open", "full", "at_risk", "cancelled", "completed"] }).notNull().default("open"),
  notes: text("notes"),
  /** Whether this slot was generated from a ScheduleRule (true) or created manually (false). */
  isGenerated: boolean("is_generated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tourId: uuid("tour_id").notNull().references(() => tours.id, { onDelete: "restrict" }),
  /** FK to slots — nullable because generated slots may not have a DB row yet. */
  slotId: uuid("slot_id").references(() => slots.id, { onDelete: "restrict" }),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email").notNull(),
  guestPhone: text("guest_phone"),
  /** ISO 639-1 language code (e.g. 'en', 'pl'). */
  guestLanguage: text("guest_language"),
  participants: integer("participants").notNull(),
  /** Serialized Record<string, number> — breakdown by category ID. */
  participantsByCategoryJson: jsonb("participants_by_category_json"),
  /** Serialized string[] — selected optional add-on IDs. */
  selectedAddonIdsJson: jsonb("selected_addon_ids_json"),
  /** Serialized PriceBreakdown. */
  priceBreakdownJson: jsonb("price_breakdown_json").notNull(),
  /** Total amount in integer cents (e.g. 1999 = 19.99 PLN). */
  totalAmount: integer("total_amount").notNull(),
  /** ISO 4217 currency code (e.g. 'PLN', 'EUR'). */
  currency: text("currency").notNull(),
  /** Booking lifecycle status. */
  status: text("status", {
    enum: ["pending", "confirmed", "cancelled", "completed", "no_show"]
  }).notNull().default("pending"),
  /** Payment processing status. */
  paymentStatus: text("payment_status", { enum: ["pending", "paid", "failed", "refunded"] }).notNull().default("pending"),
  /** Stripe PaymentIntent ID — populated after payment is initiated. */
  paymentIntentId: text("payment_intent_id"),
  /** Unique human-readable booking reference (e.g. BK-ABCD1234). */
  bookingReference: text("booking_reference").notNull().unique(),
  attendanceStatus: text("attendance_status", {
    enum: ["not_arrived", "checked_in", "no_show"]
  }).notNull().default("not_arrived"),
  specialRequests: text("special_requests"),
  /** Who cancelled: 'guest' | 'guide' | 'system'. */
  cancelledBy: text("cancelled_by", { enum: ["guest", "guide", "system"] }),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  bookings,
  guides,
  slots,
  tours
}, Symbol.toStringTag, { value: "Module" }));
let _db;
function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL environment variable is not set");
    const client = postgres(url, { prepare: false });
    _db = drizzle(client, { schema });
  }
  return _db;
}
function generateBookingReference() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let result = "BK-";
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
function rowToTour(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    duration: row.duration,
    capacity: row.capacity,
    minCapacity: row.minCapacity,
    maxCapacity: row.maxCapacity,
    languages: row.languages,
    location: row.location ?? void 0,
    categories: row.categories,
    includedItems: row.includedItems,
    requirements: row.requirements,
    images: row.images,
    isPublic: row.isPublic,
    status: row.status,
    pricing: row.pricingJson,
    cancellationPolicy: row.cancellationPolicyJson,
    scheduleRules: row.scheduleRulesJson ?? []
  };
}
function rowToSlot(row) {
  return {
    id: row.id,
    tourId: row.tourId,
    startTime: row.startTime,
    endTime: row.endTime,
    availableSpots: row.availableSpots,
    bookedSpots: row.bookedSpots,
    status: row.status,
    isGenerated: row.isGenerated,
    scheduleRuleId: row.scheduleRuleId ?? void 0,
    notes: row.notes ?? void 0
  };
}
function rowToBooking(row) {
  return {
    id: row.id,
    tourId: row.tourId,
    slotId: row.slotId ?? "",
    guest: {
      name: row.guestName,
      email: row.guestEmail,
      phone: row.guestPhone ?? void 0,
      language: row.guestLanguage ?? void 0
    },
    participants: row.participants,
    participantsByCategory: row.participantsByCategoryJson ?? void 0,
    selectedAddonIds: row.selectedAddonIdsJson ?? void 0,
    priceBreakdown: row.priceBreakdownJson,
    // Convert integer cents → float
    totalAmount: row.totalAmount / 100,
    currency: row.currency,
    status: row.status,
    paymentStatus: row.paymentStatus,
    bookingReference: row.bookingReference,
    attendanceStatus: row.attendanceStatus,
    specialRequests: row.specialRequests ?? void 0,
    cancelledBy: row.cancelledBy ?? void 0,
    cancellationReason: row.cancellationReason ?? void 0,
    createdAt: row.createdAt.toISOString()
  };
}
function createDrizzleAdapter(db) {
  async function getTours(filter) {
    const rows = filter?.status ? await db.select().from(tours).where(eq(tours.status, filter.status)) : await db.select().from(tours);
    return rows.map(rowToTour);
  }
  async function getTourById(id) {
    const rows = await db.select().from(tours).where(eq(tours.id, id)).limit(1);
    return rows[0] ? rowToTour(rows[0]) : void 0;
  }
  async function createTour(tour) {
    throw new Error("createTour requires an authenticated guide — use createTourForGuide(guideId, tour) instead");
  }
  async function updateTour(id, patch) {
    const updates = {};
    if (patch.name !== void 0) updates.name = patch.name;
    if (patch.description !== void 0) updates.description = patch.description;
    if (patch.duration !== void 0) updates.duration = patch.duration;
    if (patch.capacity !== void 0) updates.capacity = patch.capacity;
    if (patch.minCapacity !== void 0) updates.minCapacity = patch.minCapacity;
    if (patch.maxCapacity !== void 0) updates.maxCapacity = patch.maxCapacity;
    if (patch.languages !== void 0) updates.languages = patch.languages;
    if (patch.location !== void 0) updates.location = patch.location;
    if (patch.categories !== void 0) updates.categories = patch.categories;
    if (patch.includedItems !== void 0) updates.includedItems = patch.includedItems;
    if (patch.requirements !== void 0) updates.requirements = patch.requirements;
    if (patch.images !== void 0) updates.images = patch.images;
    if (patch.pricing !== void 0) updates.pricingJson = patch.pricing;
    if (patch.cancellationPolicy !== void 0)
      updates.cancellationPolicyJson = patch.cancellationPolicy;
    if (patch.scheduleRules !== void 0) updates.scheduleRulesJson = patch.scheduleRules;
    if (patch.status !== void 0) updates.status = patch.status;
    if (patch.isPublic !== void 0) updates.isPublic = patch.isPublic;
    const rows = await db.update(tours).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tours.id, id)).returning();
    if (!rows[0]) throw new Error(`Tour not found: ${id}`);
    return rowToTour(rows[0]);
  }
  async function deleteTour(id) {
    await db.delete(tours).where(eq(tours.id, id));
  }
  async function getSlots(tourId, range) {
    const rows = await db.select().from(slots).where(
      and(
        eq(slots.tourId, tourId),
        gte(slots.startTime, range.start),
        lte(slots.startTime, range.end)
      )
    );
    return rows.map(rowToSlot);
  }
  async function getSlotById(id) {
    const rows = await db.select().from(slots).where(eq(slots.id, id)).limit(1);
    return rows[0] ? rowToSlot(rows[0]) : void 0;
  }
  async function createSlot(slot) {
    const rows = await db.insert(slots).values({
      tourId: slot.tourId,
      scheduleRuleId: slot.scheduleRuleId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      availableSpots: slot.availableSpots,
      bookedSpots: slot.bookedSpots,
      status: slot.status,
      notes: slot.notes,
      isGenerated: slot.isGenerated
    }).returning();
    if (!rows[0]) throw new Error("Failed to create slot");
    return rowToSlot(rows[0]);
  }
  async function updateSlot(id, patch) {
    const updates = {};
    if (patch.availableSpots !== void 0) updates.availableSpots = patch.availableSpots;
    if (patch.bookedSpots !== void 0) updates.bookedSpots = patch.bookedSpots;
    if (patch.status !== void 0) updates.status = patch.status;
    if (patch.notes !== void 0) updates.notes = patch.notes;
    const rows = await db.update(slots).set(updates).where(eq(slots.id, id)).returning();
    if (!rows[0]) throw new Error(`Slot not found: ${id}`);
    return rowToSlot(rows[0]);
  }
  async function cancelSlot(id, cancelledBy) {
    const slotRows = await db.update(slots).set({ status: "cancelled" }).where(eq(slots.id, id)).returning();
    if (!slotRows[0]) throw new Error(`Slot not found: ${id}`);
    await db.update(bookings).set({
      status: "cancelled",
      cancelledBy,
      cancellationReason: `Slot cancelled by ${cancelledBy}`
    }).where(and(eq(bookings.slotId, id), eq(bookings.status, "confirmed")));
    return rowToSlot(slotRows[0]);
  }
  async function getBookingsForSlot(slotId) {
    const rows = await db.select().from(bookings).where(eq(bookings.slotId, slotId));
    return rows.map(rowToBooking);
  }
  async function getBookingsForTour(tourId, range) {
    if (!range) {
      const rows2 = await db.select().from(bookings).where(eq(bookings.tourId, tourId));
      return rows2.map(rowToBooking);
    }
    const rows = await db.select({ booking: bookings }).from(bookings).innerJoin(slots, eq(bookings.slotId, slots.id)).where(
      and(
        eq(bookings.tourId, tourId),
        gte(slots.startTime, range.start),
        lte(slots.startTime, range.end)
      )
    );
    return rows.map((r) => rowToBooking(r.booking));
  }
  async function getBookingById(id) {
    const rows = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return rows[0] ? rowToBooking(rows[0]) : void 0;
  }
  async function getBookingByReference(reference) {
    const rows = await db.select().from(bookings).where(eq(bookings.bookingReference, reference)).limit(1);
    return rows[0] ? rowToBooking(rows[0]) : void 0;
  }
  async function createBooking(booking) {
    const bookingReference = generateBookingReference();
    const slotId = booking.slotId;
    if (slotId) {
      const existingSlot = await getSlotById(slotId);
      if (!existingSlot) {
        throw new Error(
          `Slot ${slotId} not found in the database. For generated slots receiving their first booking, call createSlot() first to persist the slot row.`
        );
      }
    }
    const totalAmountCents = Math.round(booking.totalAmount * 100);
    const rows = await db.insert(bookings).values({
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
      cancellationReason: booking.cancellationReason
    }).returning();
    if (!rows[0]) throw new Error("Failed to create booking");
    if (slotId) {
      const slotRows = await db.select().from(slots).where(eq(slots.id, slotId)).limit(1);
      if (slotRows[0]) {
        const slot = slotRows[0];
        const newBookedSpots = slot.bookedSpots + booking.participants;
        const newStatus = slot.status !== "cancelled" && slot.status !== "completed" && newBookedSpots >= slot.availableSpots ? "full" : slot.status;
        await db.update(slots).set({ bookedSpots: newBookedSpots, status: newStatus }).where(eq(slots.id, slotId));
      }
    }
    return rowToBooking(rows[0]);
  }
  async function updateBookingStatus(id, status, metadata) {
    const updates = { status };
    if (metadata?.cancelledBy !== void 0) updates.cancelledBy = metadata.cancelledBy;
    if (metadata?.cancellationReason !== void 0)
      updates.cancellationReason = metadata.cancellationReason;
    const rows = await db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();
    if (!rows[0]) throw new Error(`Booking not found: ${id}`);
    return rowToBooking(rows[0]);
  }
  async function createTourForGuide(guideId, tour) {
    const rows = await db.insert(tours).values({
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
      isPublic: tour.isPublic
    }).returning();
    if (!rows[0]) throw new Error("Failed to create tour");
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
    createTourForGuide
  };
}

export { createDrizzleAdapter as c, getDb as g };
//# sourceMappingURL=drizzle-adapter-CjwMp0mZ.js.map
