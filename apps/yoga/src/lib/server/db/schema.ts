import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ── Schools (main listing) ──────────────────────────────────────────────────

export const schools = sqliteTable('schools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull().default(''),
  websiteUrl: text('website_url').default(''),
  phone: text('phone'),
  email: text('email'),

  price: real('price'),
  trialPrice: real('trial_price'),
  singleClassPrice: real('single_class_price'),
  pricingNotes: text('pricing_notes'),
  pricingJson: text('pricing_json'),  // full structured pricing (JSON array of tiers + metadata)

  rating: real('rating'),
  reviews: integer('reviews'),

  descriptionRaw: text('description_raw').default(''),
  description: text('description').default(''),
  editorialSummary: text('editorial_summary').default(''),
  openingHours: text('opening_hours').default(''),
  imageUrl: text('image_url').default(''),
  photoReference: text('photo_reference').default(''),

  neighborhood: text('neighborhood').default(''),
  latitude: real('latitude'),
  longitude: real('longitude'),

  googlePlaceId: text('google_place_id').default(''),
  googleMapsUrl: text('google_maps_url').default(''),

  pricingUrl: text('pricing_url').default(''),
  scheduleUrl: text('schedule_url').default(''),
  scheduleSource: text('schedule_source').default(''),
  scheduleMode: text('schedule_mode').default('auto'),  // 'auto' | 'weekly' | 'dated'
  lastScheduleCrawl: text('last_schedule_crawl'),

  lastPriceCheck: text('last_price_check'),
  lastUpdated: text('last_updated').default(sql`(CURRENT_DATE)`),
  source: text('source').default('manual'),

  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── Styles (many-to-many via junction) ──────────────────────────────────────

export const styles = sqliteTable('styles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const schoolStyles = sqliteTable('school_styles', {
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  styleId: integer('style_id').notNull().references(() => styles.id, { onDelete: 'cascade' }),
});

// ── Schedule ────────────────────────────────────────────────────────────────
//
//  `scheduleType` determines how the entry is interpreted:
//    • 'weekly'  → recurring; `dayOfWeek` is set, `date` is null
//    • 'dated'   → one-off / booking; `date` is set (dayOfWeek still filled for convenience)
//
//  The seed script auto-detects which mode to use per school.
//

export const scheduleEntries = sqliteTable('schedule_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),

  // ── When ───────────────────────────────────────────────────
  scheduleType: text('schedule_type').notNull().default('weekly'), // 'weekly' | 'dated'
  dayOfWeek: integer('day_of_week').notNull(),        // 0=Monday … 6=Sunday (ISO)
  date: text('date'),                                 // "2026-03-05" for dated entries, null for weekly
  startTime: text('start_time').notNull(),            // "07:00"  (HH:mm, 24 h)
  endTime: text('end_time'),                          // "08:30"  (nullable – some sources omit it)
  duration: integer('duration'),                      // minutes  (nullable – handy when endTime missing)

  // ── What ───────────────────────────────────────────────────
  className: text('class_name').notNull(),
  classDescription: text('class_description'),
  teacher: text('teacher'),
  level: text('level'),                               // free-form: "beginner", "open", "zaawansowany" …
  style: text('style'),                               // yoga style / class category
  location: text('location'),                         // room / branch name when multi-location

  // ── Capacity / availability ────────────────────────────────
  totalCapacity: integer('total_capacity'),
  spotsLeft: integer('spots_left'),
  waitingListCapacity: integer('waiting_list_capacity'),

  // ── Flags ──────────────────────────────────────────────────
  isCancelled: integer('is_cancelled', { mode: 'boolean' }).default(false),
  isFree: integer('is_free', { mode: 'boolean' }).default(false),
  isBookableOnline: integer('is_bookable_online', { mode: 'boolean' }).default(true),

  // ── Provenance ─────────────────────────────────────────────
  source: text('source').notNull().default('manual'), // 'fitssey' | 'activenow' | 'manual' | …
  externalId: text('external_id'),                    // source-specific id for dedup / updates
  bookingUrl: text('booking_url'),                    // direct link to book this class

  // ── Catch-all for platform-specific extras ─────────────────
  metadata: text('metadata', { mode: 'json' }),

  // ── Housekeeping ───────────────────────────────────────────
  lastSeenAt: text('last_seen_at').default(sql`(CURRENT_TIMESTAMP)`),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── Scrape Log (written by yoga-scraper, read-only from web) ────────────────
//
//  Tracks every scrape attempt: what was done, success/failure, timing.
//  Used by the scraper's `status` command to report freshness & errors.
//

export const scrapeLog = sqliteTable('scrape_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  task: text('task').notNull(),             // 'seed' | 'discover_urls' | 'scrape_pricing' | 'scrape_about' | 'scrape_schedule' | 'normalize'
  status: text('status').notNull(),         // 'success' | 'error' | 'skipped' | 'no_data'
  message: text('message'),                 // error message or summary
  fieldsUpdated: text('fields_updated'),    // comma-separated list of updated fields
  durationMs: integer('duration_ms'),       // how long the operation took
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── Claim Requests ──────────────────────────────────────────────────────────

export const claimRequests = sqliteTable('claim_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  role: text('role').notNull(),           // 'owner' | 'manager' | 'instructor'
  message: text('message'),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── Type exports ────────────────────────────────────────────────────────────

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
export type Style = typeof styles.$inferSelect;
export type ScheduleEntry = typeof scheduleEntries.$inferSelect;
export type NewScheduleEntry = typeof scheduleEntries.$inferInsert;
export type ScrapeLog = typeof scrapeLog.$inferSelect;
export type ClaimRequest = typeof claimRequests.$inferSelect;
export type NewClaimRequest = typeof claimRequests.$inferInsert;
