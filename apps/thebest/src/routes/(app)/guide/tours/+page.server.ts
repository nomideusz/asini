import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { createDrizzleAdapter } from '$lib/server/scheduler/drizzle-adapter.js';
import { bookings } from '$lib/server/db/schema.js';
import { inArray, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const db = getDb();
	const adapter = createDrizzleAdapter(db);
	const allTours = await adapter.getTours({ guideId: user.id });

	const tourIds = allTours.map((t) => t.id);
	let bookingCounts: Record<string, number> = {};

	if (tourIds.length > 0) {
		const rows = await db
			.select({
				tourId: bookings.tourId,
				count: sql<number>`count(*)::int`,
			})
			.from(bookings)
			.where(inArray(bookings.tourId, tourIds))
			.groupBy(bookings.tourId);

		bookingCounts = Object.fromEntries(rows.map((r) => [r.tourId, r.count]));
	}

	return {
		tours: allTours.map((t) => ({
			id: t.id,
			name: t.name,
			status: t.status,
			duration: t.duration,
			minCapacity: t.minCapacity,
			maxCapacity: t.maxCapacity,
			bookingCount: bookingCounts[t.id] ?? 0,
		})),
	};
};
