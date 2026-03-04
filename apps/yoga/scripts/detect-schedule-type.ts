/**
 * Detect weekly / dated schedule patterns from existing DB entries.
 *
 * Reads schedule_entries directly from the database (no JSON file needed),
 * runs multi-week repeat detection per school, and converts dated → weekly
 * where the heuristic (or school override) says so.
 *
 * Usage:
 *   npx tsx scripts/detect-schedule-type.ts              # detect & convert
 *   npx tsx scripts/detect-schedule-type.ts --dry-run    # report only, no writes
 *   npx tsx scripts/detect-schedule-type.ts --school joga-centrum   # single school
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const schoolFlag = args.indexOf('--school');
const singleSchoolId = schoolFlag !== -1 ? args[schoolFlag + 1] : null;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Tuple key for grouping identical time-slots */
function tupleKey(dow: number, startTime: string, className: string): string {
  return `${dow}|${startTime}|${className}`;
}

/**
 * Decide: 'weekly' or 'dated'.
 *
 * Resolution:
 *   1. Explicit per-school override ('weekly' | 'dated') from schools.schedule_mode
 *   2. Multi-week repeat detection:
 *      – group entries by (dayOfWeek, startTime, className)
 *      – if a tuple appears on >1 unique date AND ≥70% of entries repeat → weekly
 *   3. Fallback: dated (safe default — single-week data is indistinguishable)
 *
 * NOTE: With only 1 week of scraped data, auto-detection cannot reliably
 * distinguish weekly from dated. Set schedule_mode explicitly on schools.
 */
function detectScheduleType(
  entries: { dayOfWeek: number; startTime: string; className: string; date: string | null }[],
  override?: 'auto' | 'weekly' | 'dated' | null,
): 'weekly' | 'dated' {
  if (override === 'weekly' || override === 'dated') return override;
  if (entries.length === 0) return 'dated';

  // ── Multi-week repeat detection (needs >1 week of data) ──
  const tupleDates = new Map<string, Set<string>>();
  for (const e of entries) {
    const key = tupleKey(e.dayOfWeek, e.startTime, e.className);
    const dates = tupleDates.get(key) ?? new Set();
    if (e.date) dates.add(e.date);
    tupleDates.set(key, dates);
  }

  let repeatingCount = 0;
  for (const e of entries) {
    const key = tupleKey(e.dayOfWeek, e.startTime, e.className);
    if ((tupleDates.get(key)?.size ?? 0) > 1) repeatingCount++;
  }

  if (entries.length > 0 && repeatingCount / entries.length >= 0.7) return 'weekly';

  // ── Fallback: dated (safe default for single-week / ambiguous data) ──
  return 'dated';
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (dryRun) console.log('🔍 DRY RUN — no changes will be written\n');

  // ── Get schools that have schedule entries ──
  let schoolIds: string[];

  if (singleSchoolId) {
    schoolIds = [singleSchoolId];
    console.log(`Targeting single school: ${singleSchoolId}\n`);
  } else {
    const rows = await db
      .selectDistinct({ schoolId: schema.scheduleEntries.schoolId })
      .from(schema.scheduleEntries);
    schoolIds = rows.map((r) => r.schoolId);
    console.log(`Found ${schoolIds.length} schools with schedule entries\n`);
  }

  let totalConverted = 0;
  let totalDeleted = 0;
  let totalUnchanged = 0;

  for (const schoolId of schoolIds) {
    // ── Fetch all entries for this school ──
    const entries = await db
      .select()
      .from(schema.scheduleEntries)
      .where(eq(schema.scheduleEntries.schoolId, schoolId));

    if (entries.length === 0) continue;

    const currentType = entries[0].scheduleType;
    const allSameType = entries.every((e) => e.scheduleType === currentType);

    // ── Fetch school's schedule_mode override ──
    const [schoolRow] = await db
      .select({ scheduleMode: schema.schools.scheduleMode })
      .from(schema.schools)
      .where(eq(schema.schools.id, schoolId))
      .limit(1);

    const override = (schoolRow?.scheduleMode as 'auto' | 'weekly' | 'dated' | null) ?? 'auto';

    // ── Detect ideal type ──
    const detected = detectScheduleType(
      entries.map((e) => ({
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        className: e.className,
        date: e.date,
      })),
      override,
    );

    // ── Skip if already correct ──
    if (allSameType && currentType === detected) {
      console.log(`  ─  ${schoolId}: already ${detected} (${entries.length} entries)`);
      totalUnchanged += entries.length;
      continue;
    }

    // ── Convert dated → weekly ──
    if (detected === 'weekly') {
      // Group by (dayOfWeek, startTime, className) — keep first occurrence
      const groups = new Map<string, typeof entries[0]>();
      const toDelete: number[] = [];

      for (const e of entries) {
        const key = tupleKey(e.dayOfWeek, e.startTime, e.className);
        if (!groups.has(key)) {
          groups.set(key, e);
        } else {
          toDelete.push(e.id);
        }
      }

      const keepEntries = [...groups.values()];
      const keepIds = keepEntries.map((e) => e.id);

      console.log(
        `  ✓  ${schoolId}: ${currentType} → weekly — ${entries.length} entries → ${keepIds.length} (${toDelete.length} dupes)`,
      );

      if (!dryRun) {
        // Update kept rows to weekly, clear date
        const BATCH = 100;
        for (let i = 0; i < keepIds.length; i += BATCH) {
          const batch = keepIds.slice(i, i + BATCH);
          const placeholders = batch.map(() => '?').join(',');
          await client.execute({
            sql: `UPDATE schedule_entries
                  SET schedule_type = 'weekly', date = NULL, is_cancelled = 0
                  WHERE id IN (${placeholders})`,
            args: batch,
          });
        }

        // Delete duplicates
        for (let i = 0; i < toDelete.length; i += BATCH) {
          const batch = toDelete.slice(i, i + BATCH);
          const placeholders = batch.map(() => '?').join(',');
          await client.execute({
            sql: `DELETE FROM schedule_entries WHERE id IN (${placeholders})`,
            args: batch,
          });
        }

        // Update school's schedule_mode to 'weekly' if it was 'auto'
        if (override === 'auto') {
          await db
            .update(schema.schools)
            .set({ scheduleMode: 'weekly' })
            .where(eq(schema.schools.id, schoolId));
        }
      }

      totalConverted += keepIds.length;
      totalDeleted += toDelete.length;
      continue;
    }

    // ── Convert weekly → dated (rare — would need dates, so we just flag it) ──
    if (detected === 'dated' && currentType === 'weekly') {
      console.log(
        `  ⚠  ${schoolId}: currently weekly but detected as dated — skipping (weekly→dated needs source dates)`,
      );
      totalUnchanged += entries.length;
      continue;
    }

    totalUnchanged += entries.length;
  }

  console.log(
    `\n✓ Done! Converted ${totalConverted} entries to weekly, deleted ${totalDeleted} duplicates, ${totalUnchanged} unchanged.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Detection failed:', err);
  process.exit(1);
});
