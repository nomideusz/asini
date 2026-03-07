import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { createDrizzleAdapter } from '$lib/server/scheduler/drizzle-adapter.js';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const adapter = createDrizzleAdapter(getDb());
	const tours = await adapter.getTours({ guideId: user.id });
	return {
		tours: tours.map((t) => ({
			id: t.id,
			name: t.name,
			status: t.status,
		})),
	};
};
