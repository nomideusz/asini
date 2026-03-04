import 'dotenv/config';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // Per-school summary
  const summary = await client.execute(`
    SELECT 
      se.school_id,
      s.schedule_mode,
      s.schedule_source,
      se.schedule_type,
      COUNT(*) as total_entries,
      COUNT(DISTINCT se.date) as unique_dates,
      MIN(se.date) as min_date,
      MAX(se.date) as max_date,
      COUNT(DISTINCT se.day_of_week || '|' || se.start_time || '|' || se.class_name) as unique_slots
    FROM schedule_entries se
    JOIN schools s ON s.id = se.school_id
    GROUP BY se.school_id, se.schedule_type
    ORDER BY se.school_id
  `);

  console.log('\n=== Per-school schedule summary ===\n');
  for (const r of summary.rows) {
    const ratio = Number(r.total_entries) / Number(r.unique_slots);
    console.log(
      `${r.school_id}` +
      `\n  mode=${r.schedule_mode} source=${r.schedule_source} type=${r.schedule_type}` +
      `\n  entries=${r.total_entries} unique_slots=${r.unique_slots} ratio=${ratio.toFixed(1)}x` +
      `\n  unique_dates=${r.unique_dates} range=${r.min_date} → ${r.max_date}\n`
    );
  }

  // Sample a large school to see if same class appears on multiple dates
  const big = await client.execute(`
    SELECT school_id, day_of_week, date, start_time, class_name, schedule_type,
           COUNT(*) OVER (PARTITION BY school_id, day_of_week, start_time, class_name) as occurrences
    FROM schedule_entries
    WHERE school_id = 'joga-centrum-bronowice'
    ORDER BY class_name, date, start_time
    LIMIT 40
  `);

  console.log('\n=== joga-centrum-bronowice sample (first 40) ===\n');
  for (const r of big.rows) {
    console.log(`  ${r.date ?? '(null)'} dow=${r.day_of_week} ${r.start_time} ${r.class_name} [${r.schedule_type}] (x${r.occurrences})`);
  }

  // Also check edze (marked weekly) 
  const edze = await client.execute(`
    SELECT day_of_week, date, start_time, class_name, schedule_type
    FROM schedule_entries
    WHERE school_id = 'edze-pilates-studio'
    ORDER BY day_of_week, start_time
    LIMIT 40
  `);

  console.log('\n=== edze-pilates-studio (currently weekly) ===\n');
  for (const r of edze.rows) {
    console.log(`  ${r.date ?? '(null)'} dow=${r.day_of_week} ${r.start_time} ${r.class_name} [${r.schedule_type}]`);
  }

  process.exit(0);
}

main().catch(console.error);
