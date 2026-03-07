import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
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

export const actions = {
	cancelBooking: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });
		const form = await request.formData();
		const bookingId = form.get('bookingId')?.toString();
		if (!bookingId) return fail(400, { error: 'Missing booking ID' });
		const db = getDb();
		const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
		if (!booking) return fail(404, { error: 'Booking not found' });
		const [tour] = await db
			.select({ guideId: tours.guideId })
			.from(tours)
			.where(eq(tours.id, booking.tourId));
		if (!tour || tour.guideId !== locals.user.id) return fail(403, { error: 'Forbidden' });
		if (booking.status === 'cancelled') return fail(400, { error: 'Already cancelled' });
		await db
			.update(bookings)
			.set({
				status: 'cancelled',
				cancelledBy: 'guide',
				cancellationReason: 'Cancelled by guide',
			})
			.where(eq(bookings.id, bookingId));
		return { cancelled: true, bookingId };
	},
} satisfies Actions;
