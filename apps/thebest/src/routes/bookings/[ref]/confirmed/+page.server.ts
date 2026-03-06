import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { bookings, tours } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const [booking] = await db
		.select()
		.from(bookings)
		.where(eq(bookings.bookingReference, params.ref));
	if (!booking) error(404, 'Booking not found');
	const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId));
	return { booking, tour };
};
