import { db } from './index';
import { schools, styles, schoolStyles, scheduleEntries } from './schema';
import { eq, sql } from 'drizzle-orm';

// ── Exported client-facing types ────────────────────────────────────────────

export interface ScheduleEntryData {
  id: number;
  schoolId: string;
  scheduleType: string;            // 'weekly' | 'dated'
  dayOfWeek: number;               // 0=Mon … 6=Sun
  date: string | null;             // "2026-03-05" for dated entries
  startTime: string;               // "07:00"
  endTime: string | null;
  duration: number | null;
  className: string;
  classDescription: string | null;
  teacher: string | null;
  level: string | null;
  style: string | null;
  location: string | null;
  totalCapacity: number | null;
  spotsLeft: number | null;
  waitingListCapacity: number | null;
  isCancelled: boolean;
  isFree: boolean;
  isBookableOnline: boolean;
  source: string;
  externalId: string | null;
  bookingUrl: string | null;
  metadata: unknown;
  lastSeenAt: string | null;
  createdAt: string | null;
}

export interface Listing {
  id: string;
  name: string;
  city: string;
  address: string;
  websiteUrl: string | null;
  phone: string | null;
  email: string | null;
  price: number | null;
  priceEstimated: boolean;
  trialPrice: number | null;
  singleClassPrice: number | null;
  pricingNotes: string | null;
  rating: number | null;
  reviews: number | null;
  description: string | null;
  editorialSummary: string | null;
  openingHours: string | null;
  imageUrl: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  scheduleUrl: string | null;
  scheduleSource: string | null;
  lastPriceCheck: string | null;
  lastUpdated: string | null;
  source: string | null;
  styles: string[];
  schedule: ScheduleEntryData[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapScheduleRow(row: typeof scheduleEntries.$inferSelect): ScheduleEntryData {
  return {
    id: row.id,
    schoolId: row.schoolId,
    scheduleType: row.scheduleType,
    dayOfWeek: row.dayOfWeek,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    duration: row.duration,
    className: row.className,
    classDescription: row.classDescription,
    teacher: row.teacher,
    level: row.level,
    style: row.style,
    location: row.location,
    totalCapacity: row.totalCapacity,
    spotsLeft: row.spotsLeft,
    waitingListCapacity: row.waitingListCapacity,
    isCancelled: row.isCancelled ?? false,
    isFree: row.isFree ?? false,
    isBookableOnline: row.isBookableOnline ?? true,
    source: row.source,
    externalId: row.externalId,
    bookingUrl: row.bookingUrl,
    metadata: row.metadata,
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
  };
}

function buildListing(
  school: typeof schools.$inferSelect,
  styleNames: string[],
  schedule: ScheduleEntryData[],
): Listing {
  return {
    id: school.id,
    name: school.name,
    city: school.city,
    address: school.address ?? '',
    websiteUrl: school.websiteUrl,
    phone: school.phone,
    email: school.email,
    price: school.price,
    priceEstimated: school.priceEstimated ?? false,
    trialPrice: school.trialPrice,
    singleClassPrice: school.singleClassPrice,
    pricingNotes: school.pricingNotes,
    rating: school.rating,
    reviews: school.reviews,
    description: school.description,
    editorialSummary: school.editorialSummary,
    openingHours: school.openingHours,
    imageUrl: school.imageUrl,
    neighborhood: school.neighborhood,
    latitude: school.latitude,
    longitude: school.longitude,
    googleMapsUrl: school.googleMapsUrl,
    scheduleUrl: school.scheduleUrl,
    scheduleSource: school.scheduleSource,
    lastPriceCheck: school.lastPriceCheck,
    lastUpdated: school.lastUpdated,
    source: school.source,
    styles: styleNames,
    schedule,
  };
}

// ── Public queries ──────────────────────────────────────────────────────────

export async function getAllListings(): Promise<Listing[]> {
  const allSchools = await db.select().from(schools);

  // Batch-load all styles joins
  const allSchoolStyles = await db
    .select({
      schoolId: schoolStyles.schoolId,
      styleName: styles.name,
    })
    .from(schoolStyles)
    .innerJoin(styles, eq(schoolStyles.styleId, styles.id));

  const stylesBySchool = new Map<string, string[]>();
  for (const row of allSchoolStyles) {
    const arr = stylesBySchool.get(row.schoolId) ?? [];
    arr.push(row.styleName);
    stylesBySchool.set(row.schoolId, arr);
  }

  // Batch-load all schedule entries
  const allEntries = await db.select().from(scheduleEntries);
  const schedBySchool = new Map<string, ScheduleEntryData[]>();
  for (const row of allEntries) {
    const arr = schedBySchool.get(row.schoolId) ?? [];
    arr.push(mapScheduleRow(row));
    schedBySchool.set(row.schoolId, arr);
  }

  return allSchools.map((s) =>
    buildListing(s, stylesBySchool.get(s.id) ?? [], schedBySchool.get(s.id) ?? []),
  );
}

export async function getListingById(id: string): Promise<Listing | null> {
  const [school] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
  if (!school) return null;

  const schoolStyleRows = await db
    .select({ name: styles.name })
    .from(schoolStyles)
    .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
    .where(eq(schoolStyles.schoolId, id));

  const schedRows = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.schoolId, id));

  return buildListing(
    school,
    schoolStyleRows.map((r) => r.name),
    schedRows.map(mapScheduleRow),
  );
}

export async function getUniqueCities(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ city: schools.city })
    .from(schools)
    .where(sql`${schools.city} != ''`);
  return rows.map((r) => r.city).sort();
}

export async function getUniqueStyles(): Promise<string[]> {
  const rows = await db.select({ name: styles.name }).from(styles);
  return rows.map((r) => r.name).sort();
}

export async function getCityCoords(): Promise<Record<string, { lat: number; lng: number }>> {
  const rows = await db
    .select({
      city: schools.city,
      lat: sql<number>`avg(${schools.latitude})`,
      lng: sql<number>`avg(${schools.longitude})`,
    })
    .from(schools)
    .where(sql`${schools.latitude} IS NOT NULL AND ${schools.city} != ''`)
    .groupBy(schools.city);

  const result: Record<string, { lat: number; lng: number }> = {};
  for (const r of rows) {
    if (r.lat != null && r.lng != null) {
      result[r.city] = { lat: r.lat, lng: r.lng };
    }
  }
  return result;
}

export async function getListingsByStyle(styleName: string): Promise<Listing[]> {
  // Find matching style IDs (case-insensitive)
  const matchedStyles = await db
    .select({ id: styles.id })
    .from(styles)
    .where(sql`lower(${styles.name}) = lower(${styleName})`);

  if (matchedStyles.length === 0) return [];

  // Get school IDs that have this style
  const schoolIds = await db
    .select({ schoolId: schoolStyles.schoolId })
    .from(schoolStyles)
    .where(
      sql`${schoolStyles.styleId} IN (${sql.join(matchedStyles.map((s) => sql`${s.id}`), sql`, `)})`
    );

  if (schoolIds.length === 0) return [];

  const ids = schoolIds.map((r) => r.schoolId);

  // Fetch all those schools
  const matchedSchools = await db
    .select()
    .from(schools)
    .where(sql`${schools.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);

  // Batch-load styles for those schools
  const allSchoolStyles = await db
    .select({ schoolId: schoolStyles.schoolId, styleName: styles.name })
    .from(schoolStyles)
    .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
    .where(sql`${schoolStyles.schoolId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);

  const stylesBySchool = new Map<string, string[]>();
  for (const row of allSchoolStyles) {
    const arr = stylesBySchool.get(row.schoolId) ?? [];
    arr.push(row.styleName);
    stylesBySchool.set(row.schoolId, arr);
  }

  // Batch-load schedule entries
  const entries = await db
    .select()
    .from(scheduleEntries)
    .where(sql`${scheduleEntries.schoolId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);

  const schedBySchool = new Map<string, ScheduleEntryData[]>();
  for (const row of entries) {
    const arr = schedBySchool.get(row.schoolId) ?? [];
    arr.push(mapScheduleRow(row));
    schedBySchool.set(row.schoolId, arr);
  }

  return matchedSchools.map((s) =>
    buildListing(s, stylesBySchool.get(s.id) ?? [], schedBySchool.get(s.id) ?? []),
  );
}

export async function getListingsByCity(city: string): Promise<Listing[]> {
  const matchedSchools = await db
    .select()
    .from(schools)
    .where(sql`lower(${schools.city}) = lower(${city})`);

  if (matchedSchools.length === 0) return [];

  const ids = matchedSchools.map((s) => s.id);

  // Batch-load styles
  const allSchoolStyles = await db
    .select({ schoolId: schoolStyles.schoolId, styleName: styles.name })
    .from(schoolStyles)
    .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
    .where(sql`${schoolStyles.schoolId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);

  const stylesBySchool = new Map<string, string[]>();
  for (const row of allSchoolStyles) {
    const arr = stylesBySchool.get(row.schoolId) ?? [];
    arr.push(row.styleName);
    stylesBySchool.set(row.schoolId, arr);
  }

  // Batch-load schedule entries
  const entries = await db
    .select()
    .from(scheduleEntries)
    .where(sql`${scheduleEntries.schoolId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);

  const schedBySchool = new Map<string, ScheduleEntryData[]>();
  for (const row of entries) {
    const arr = schedBySchool.get(row.schoolId) ?? [];
    arr.push(mapScheduleRow(row));
    schedBySchool.set(row.schoolId, arr);
  }

  return matchedSchools.map((s) =>
    buildListing(s, stylesBySchool.get(s.id) ?? [], schedBySchool.get(s.id) ?? []),
  );
}
