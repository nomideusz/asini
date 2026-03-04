import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { createDrizzleAdapter } from '$lib/server/scheduler/drizzle-adapter.js';

export const load: PageServerLoad = async ({ params }) => {
	const adapter = createDrizzleAdapter(getDb());
	const tour = await adapter.getTourById(params.tourId);
	if (!tour) {
		error(404, 'Tour not found');
	}
	const now = new Date();
	const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
	const slots = await adapter.getSlots(tour.id, { start: now, end: rangeEnd });
	return { tour, slots };
};
