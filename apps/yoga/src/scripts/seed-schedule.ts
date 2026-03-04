/**
 * Seed schedule_entries from the Fitssey crawl JSON.
 *
 * Seeds schedule_entries, respecting each school's `schedule_mode` setting:
 *   • 'weekly' → always collapse to recurring day-of-week slots
 *   • 'dated'  → always store each event with its concrete date
 *   • 'auto'   → use multi-week repeat detection; fallback to dated
 *
 * Usage:
 *   npx tsx src/scripts/seed-schedule.ts
 *   npx tsx src/scripts/seed-schedule.ts --clear   # wipe schedule_entries first
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../lib/server/db/schema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_PATH = path.resolve(__dirname, '../../schedules_20260303_013514.json');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

// ── JSON shape (Fitssey crawl) ──────────────────────────────────────────────

interface RawEvent {
  date: string;              // "2026-03-03"
  start_time: string;        // "18:30"
  end_time: string | null;
  starts_at_iso?: string;
  ends_at_iso?: string;
  class_name: string;
  teacher: string | null;
  room: string | null;       // usually = school name; ignored
  total_capacity: number | null;
  online_capacity: number | null;
  waiting_list_capacity: number | null;
  is_free: boolean;
  is_cancelled: boolean;
  is_bookable_online: boolean;
  color?: string | null;
  reference_id?: string | null;
}

interface RawSchool {
  school_id: string;
  school_name: string;
  city: string;
  address: string;
  website: string;
  schedule_url: string;
  crawled_at: string;
  method: string;
  events: RawEvent[];
  filters?: unknown;
  error?: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** ISO weekday: 0=Mon … 6=Sun from "YYYY-MM-DD" */
function isoDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  return (d.getDay() + 6) % 7; // JS getDay: 0=Sun → shift to 0=Mon
}

/** Duration in minutes from "HH:mm" pair */
function durationMinutes(start: string, end: string | null): number | null {
  if (!end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins > 0 ? mins : null;
}

/** A tuple key for dedup detection */
function tupleKey(dow: number, startTime: string, className: string) {
  return `${dow}|${startTime}|${className}`;
}

/**
 * Map crawl JSON school_id → DB school ID.
 * The Fitssey config uses short IDs, but the main schools table
 * may have longer, more specific slugs.
 */
const ID_MAP: Record<string, string> = {
  'joga-centrum': 'joga-centrum-bronowice',
};

/**
 * Decide: 'weekly' or 'dated'.
 *
 * Resolution order:
 *   1. Explicit override from schools.schedule_mode ('weekly' | 'dated').
 *   2. Multi-week repeat detection: if (dow, startTime, className) tuples
 *      appear on >1 unique date AND ≥70 % of events repeat → weekly.
 *   3. Fallback: dated.  (Safe default — with only 1 week of data we
 *      cannot reliably distinguish recurring from one-off schedules.)
 */
function detectScheduleType(
  events: RawEvent[],
  override?: 'auto' | 'weekly' | 'dated' | null,
): 'weekly' | 'dated' {
  // ── Explicit per-school override ──
  if (override === 'weekly' || override === 'dated') return override;

  if (events.length === 0) return 'dated';

  // ── Heuristic: multi-week repeat detection ──
  const tupleDates = new Map<string, Set<string>>();
  for (const ev of events) {
    const key = tupleKey(isoDayOfWeek(ev.date), ev.start_time, ev.class_name);
    const dates = tupleDates.get(key) ?? new Set();
    dates.add(ev.date);
    tupleDates.set(key, dates);
  }

  let repeatingCount = 0;
  for (const ev of events) {
    const key = tupleKey(isoDayOfWeek(ev.date), ev.start_time, ev.class_name);
    if ((tupleDates.get(key)?.size ?? 0) > 1) repeatingCount++;
  }

  if (repeatingCount / events.length >= 0.7) return 'weekly';

  // ── Fallback: dated (safe default for single-week data) ──
  return 'dated';
}

// ── Upsert school (minimal — fill only if missing) ─────────────────────────

async function upsertSchool(raw: RawSchool) {
  const existing = await db
    .select({ id: schema.schools.id })
    .from(schema.schools)
    .where(eq(schema.schools.id, raw.school_id))
    .limit(1);

  if (existing.length > 0) {
    // Update schedule-related fields only
    await db
      .update(schema.schools)
      .set({
        scheduleUrl: raw.schedule_url || undefined,
        scheduleSource: 'fitssey',
        lastScheduleCrawl: raw.crawled_at,
      })
      .where(eq(schema.schools.id, raw.school_id));
    return;
  }

  // Insert stub school (full data comes from the main seed-db / scraper)
  await db.insert(schema.schools).values({
    id: raw.school_id,
    name: raw.school_name,
    city: raw.city || 'unknown',
    address: raw.address || '',
    websiteUrl: raw.website || '',
    scheduleUrl: raw.schedule_url || '',
    scheduleSource: 'fitssey',
    lastScheduleCrawl: raw.crawled_at,
    source: 'fitssey',
  });
}

// ── Build insert rows ───────────────────────────────────────────────────────

interface InsertRow {
  schoolId: string;
  scheduleType: string;
  dayOfWeek: number;
  date: string | null;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  className: string;
  teacher: string | null;
  totalCapacity: number | null;
  spotsLeft: number | null;
  waitingListCapacity: number | null;
  isCancelled: boolean;
  isFree: boolean;
  isBookableOnline: boolean;
  source: string;
  externalId: string | null;
  metadata: unknown;
}

function buildWeeklyRows(schoolId: string, events: RawEvent[]): InsertRow[] {
  // Dedup by (dayOfWeek, startTime, className) — keep first occurrence
  const seen = new Map<string, InsertRow>();
  for (const ev of events) {
    const dow = isoDayOfWeek(ev.date);
    const key = tupleKey(dow, ev.start_time, ev.class_name);
    if (seen.has(key)) continue;

    seen.set(key, {
      schoolId,
      scheduleType: 'weekly',
      dayOfWeek: dow,
      date: null,
      startTime: ev.start_time,
      endTime: ev.end_time,
      duration: durationMinutes(ev.start_time, ev.end_time),
      className: ev.class_name,
      teacher: ev.teacher,
      totalCapacity: ev.total_capacity,
      spotsLeft: null,               // not meaningful for recurring
      waitingListCapacity: ev.waiting_list_capacity,
      isCancelled: false,            // recurring slot itself isn't cancelled
      isFree: ev.is_free,
      isBookableOnline: ev.is_bookable_online,
      source: 'fitssey',
      externalId: ev.reference_id ?? null,
      metadata: null,
    });
  }
  return [...seen.values()];
}

function buildDatedRows(schoolId: string, events: RawEvent[]): InsertRow[] {
  return events.map((ev) => ({
    schoolId,
    scheduleType: 'dated',
    dayOfWeek: isoDayOfWeek(ev.date),
    date: ev.date,
    startTime: ev.start_time,
    endTime: ev.end_time,
    duration: durationMinutes(ev.start_time, ev.end_time),
    className: ev.class_name,
    teacher: ev.teacher,
    totalCapacity: ev.total_capacity,
    spotsLeft: null,
    waitingListCapacity: ev.waiting_list_capacity,
    isCancelled: ev.is_cancelled,
    isFree: ev.is_free,
    isBookableOnline: ev.is_bookable_online,
    source: 'fitssey',
    externalId: ev.reference_id ?? null,
    metadata: null,
  }));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`Schedule JSON not found at ${JSON_PATH}`);
    process.exit(1);
  }

  const raw: RawSchool[] = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  console.log(`Loaded ${raw.length} schools from crawl JSON`);

  if (shouldClear) {
    console.log('Clearing schedule_entries…');
    await db.delete(schema.scheduleEntries);
  }

  let totalInserted = 0;
  let schoolsProcessed = 0;

  for (const school of raw) {
    const events = school.events.filter((e) => e.class_name && e.start_time);
    if (events.length === 0) {
      console.log(`  ⏭  ${school.school_id}: 0 events — skip`);
      continue;
    }

    // Resolve the DB school ID (may differ from crawl JSON ID)
    const dbSchoolId = ID_MAP[school.school_id] ?? school.school_id;

    await upsertSchool({ ...school, school_id: dbSchoolId });

    // Clear existing schedule for this school before inserting
    await db
      .delete(schema.scheduleEntries)
      .where(eq(schema.scheduleEntries.schoolId, dbSchoolId));

    // Fetch the school's schedule_mode override from DB
    const schoolRow = await db
      .select({ scheduleMode: schema.schools.scheduleMode })
      .from(schema.schools)
      .where(eq(schema.schools.id, dbSchoolId))
      .limit(1);
    const override = (schoolRow[0]?.scheduleMode as 'auto' | 'weekly' | 'dated' | null) ?? 'auto';

    const type = detectScheduleType(events, override);
    const rows = type === 'weekly'
      ? buildWeeklyRows(dbSchoolId, events)
      : buildDatedRows(dbSchoolId, events);

    // Batch insert (SQLite max vars = 999; each row ≈ 18 cols → batches of 50)
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      await db.insert(schema.scheduleEntries).values(rows.slice(i, i + BATCH));
    }

    totalInserted += rows.length;
    schoolsProcessed++;
    const mapped = dbSchoolId !== school.school_id ? ` → ${dbSchoolId}` : '';
    console.log(
      `  ✓  ${school.school_id}${mapped}: ${type} — ${events.length} events → ${rows.length} rows`,
    );
  }

  console.log(`\nDone! ${schoolsProcessed} schools, ${totalInserted} schedule entries inserted.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
