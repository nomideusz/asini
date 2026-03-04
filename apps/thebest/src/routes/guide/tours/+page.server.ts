import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { createDrizzleAdapter } from '$lib/server/scheduler/drizzle-adapter.js';

export const load: PageServerLoad = async () => {
	const adapter = createDrizzleAdapter(getDb());
	// TODO: auth flow — filter by authenticated guide's ID
	const tours = await adapter.getTours();
	return { tours };
};
