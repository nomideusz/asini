/**
 * Migrate Fitssey schedule entries from 'dated' → 'weekly'.
 *
 * For each school whose entries are all source='fitssey' + schedule_type='dated':
 *   1. Group by (school_id, day_of_week, start_time, class_name)
 *   2. Keep one canonical row per group (update to weekly, clear date)
 *   3. Delete duplicate rows
 *
 * Usage:
 *   npx tsx scripts/migrate-schedule-weekly.ts
 *   npx tsx scripts/migrate-schedule-weekly.ts --dry-run
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('🔍 DRY RUN — no changes will be written\n');

  // Find schools with fitssey dated entries
  const schools = await client.execute(
    `SELECT DISTINCT school_id FROM schedule_entries
     WHERE source = 'fitssey' AND schedule_type = 'dated'`
  );

  console.log(`Found ${schools.rows.length} schools with fitssey dated entries\n`);

  let totalKept = 0;
  let totalDeleted = 0;

  for (const row of schools.rows) {
    const schoolId = row.school_id as string;

    // Get all dated entries for this school
    const entries = await client.execute({
      sql: `SELECT id, day_of_week, start_time, end_time, duration, class_name,
                   teacher, level, style, location, total_capacity,
                   waiting_list_capacity, is_free, is_bookable_online, external_id
            FROM schedule_entries
            WHERE school_id = ? AND source = 'fitssey' AND schedule_type = 'dated'
            ORDER BY day_of_week, start_time, id`,
      args: [schoolId],
    });

    // Group by (day_of_week, start_time, class_name) — keep first id per group
    const groups = new Map<string, number>();      // key → id to keep
    const toDelete: number[] = [];

    for (const e of entries.rows) {
      const key = `${e.day_of_week}|${e.start_time}|${e.class_name}`;
      if (!groups.has(key)) {
        groups.set(key, e.id as number);
      } else {
        toDelete.push(e.id as number);
      }
    }

    const keepIds = [...groups.values()];

    console.log(
      `  ${schoolId}: ${entries.rows.length} dated → ${keepIds.length} weekly (${toDelete.length} dupes removed)`
    );

    if (dryRun) {
      totalKept += keepIds.length;
      totalDeleted += toDelete.length;
      continue;
    }

    // Update kept rows: set schedule_type='weekly', date=null
    if (keepIds.length > 0) {
      // Batch in groups of 100 to stay under SQLite variable limits
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
    }

    // Delete duplicate rows
    if (toDelete.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < toDelete.length; i += BATCH) {
        const batch = toDelete.slice(i, i + BATCH);
        const placeholders = batch.map(() => '?').join(',');
        await client.execute({
          sql: `DELETE FROM schedule_entries WHERE id IN (${placeholders})`,
          args: batch,
        });
      }
    }

    totalKept += keepIds.length;
    totalDeleted += toDelete.length;
  }

  // Also update schools.schedule_source where it's empty but has fitssey entries
  if (!dryRun) {
    await client.execute(
      `UPDATE schools SET schedule_source = 'fitssey'
       WHERE id IN (
         SELECT DISTINCT school_id FROM schedule_entries WHERE source = 'fitssey'
       ) AND (schedule_source IS NULL OR schedule_source = '')`
    );
  }

  console.log(`\n✓ Done! Kept ${totalKept} weekly rows, deleted ${totalDeleted} duplicates.`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
