import 'dotenv/config';
import { createClient } from '@libsql/client';

const c = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });

async function main() {
  const r = await c.execute(`
    SELECT s.id, s.name, s.schedule_mode, s.schedule_source, COUNT(*) as entries
    FROM schools s
    JOIN schedule_entries se ON se.school_id = s.id
    GROUP BY s.id
    ORDER BY s.id
  `);

  r.rows.forEach((x, i) =>
    console.log(`${i + 1}. ${x.id} [mode=${x.schedule_mode}] (${x.entries} entries) — ${x.name}`)
  );
  process.exit(0);
}

main();
