import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema.js';

// Lazy initialization — throws at first use if DATABASE_URL is not set,
// not at module load time (which would break the build process).
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
	if (!_db) {
		const url = env.DATABASE_URL;
		if (!url) throw new Error('DATABASE_URL environment variable is not set');
		const client = postgres(url, { prepare: false });
		_db = drizzle(client, { schema });
	}
	return _db;
}

export type Database = ReturnType<typeof getDb>;
