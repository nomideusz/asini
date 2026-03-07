import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { guides, tours } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { PriceStructure } from '@nomideusz/svelte-scheduler';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();

	const [guide] = await db
		.select({
			id: guides.id,
			name: guides.name,
			avatar: guides.avatar,
			createdAt: guides.createdAt,
		})
		.from(guides)
		.where(eq(guides.id, params.guideId));

	if (!guide) {
		error(404, 'Guide not found');
	}

	const guideToursRaw = await db
		.select({
			id: tours.id,
			name: tours.name,
			description: tours.description,
			duration: tours.duration,
			maxCapacity: tours.maxCapacity,
			languages: tours.languages,
			images: tours.images,
			pricingJson: tours.pricingJson,
			location: tours.location,
		})
		.from(tours)
		.where(and(eq(tours.guideId, guide.id), eq(tours.isPublic, true), eq(tours.status, 'active')));

	const guideTours = guideToursRaw.map(t => ({
		...t,
		pricing: t.pricingJson as unknown as PriceStructure
	}));

	return { guide, tours: guideTours };
};
