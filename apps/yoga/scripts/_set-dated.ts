import 'dotenv/config';
import { createClient } from '@libsql/client';

const c = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });

const DATED_SCHOOLS = [
  'aerial-joga-gdansk-przymorze-artecarpediem-karolina-krawczyk',
  'air-space-studio',
  'czarujaca-studio-treningowe',
  'edze-pilates-studio',
  'elflex-studio-pilates-stretching-joga-barre-aero',
  'joga-centrum-bronowice',
];

async function main() {
  for (const id of DATED_SCHOOLS) {
    // Update school mode
    await c.execute({ sql: `UPDATE schools SET schedule_mode = 'dated' WHERE id = ?`, args: [id] });

    // Check current entry state
    const info = await c.execute({
      sql: `SELECT schedule_type, COUNT(*) as cnt, COUNT(date) as has_date FROM schedule_entries WHERE school_id = ? GROUP BY schedule_type`,
      args: [id],
    });

    for (const r of info.rows) {
      if (r.schedule_type === 'weekly' && Number(r.has_date) === 0) {
        console.log(`  ⚠  ${id}: ${r.cnt} entries are weekly with NO dates — need re-scrape to restore dates`);
      } else {
        console.log(`  ✓  ${id}: ${r.cnt} entries (type=${r.schedule_type}, ${r.has_date} have dates)`);
      }
    }
  }

  console.log('\nDone — schedule_mode set to "dated" for 6 schools.');
  process.exit(0);
}

main().catch(console.error);
