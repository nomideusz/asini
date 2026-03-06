import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { bookings, tours } from '$lib/server/db/schema.js';
import { eq, desc, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/login');

	const db = getDb();

	const guideTours = await db
		.select({ id: tours.id, name: tours.name })
		.from(tours)
		.where(eq(tours.guideId, locals.user.id));

	if (guideTours.length === 0) return { bookings: [], tours: guideTours };

	const tourIds = guideTours.map((t) => t.id);

	const rows = await db
		.select()
		.from(bookings)
		.where(inArray(bookings.tourId, tourIds))
		.orderBy(desc(bookings.createdAt))
		.limit(200);

	return { bookings: rows, tours: guideTours };
};
