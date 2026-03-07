import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { tours } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { PriceStructure } from '@nomideusz/svelte-scheduler';

export const load: PageServerLoad = async () => {
	const db = getDb();
	const rows = await db
		.select()
		.from(tours)
		.where(and(eq(tours.isPublic, true), eq(tours.status, 'active')));

	const tourList = rows.map((row) => ({
		id: row.id,
		name: row.name,
		description: row.description,
		duration: row.duration,
		capacity: row.capacity,
		location: row.location,
		categories: row.categories,
		languages: row.languages,
		images: row.images,
		pricing: row.pricingJson as PriceStructure,
	}));

	return { tours: tourList };
};
