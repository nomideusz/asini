import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { createDrizzleAdapter } from '$lib/server/scheduler/drizzle-adapter.js';

export const load: PageServerLoad = async ({ params }) => {
	const adapter = createDrizzleAdapter(getDb());
	const slot = await adapter.getSlotById(params.slotId);
	if (!slot) {
		error(404, 'Slot not found');
	}
	const tour = await adapter.getTourById(slot.tourId);
	if (!tour) {
		error(404, 'Tour not found');
	}
	return { slot, tour };
};
