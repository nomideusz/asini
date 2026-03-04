import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	out: './drizzle',
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		// TODO: auth flow — load from environment in production
		url: process.env.DATABASE_URL ?? '',
	},
});
