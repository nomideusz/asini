import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { bookings, tours, slots } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getStripe } from '$lib/server/stripe.js';
import { calculateRefund } from '@nomideusz/svelte-scheduler';
import { sendCancellationEmail } from '$lib/server/email.js';
import type { CancellationPolicy } from '@nomideusz/svelte-scheduler';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const [booking] = await db
		.select()
		.from(bookings)
		.where(eq(bookings.bookingReference, params.ref));
	if (!booking) error(404, 'Booking not found');
	if (booking.status === 'cancelled') error(410, 'Booking already cancelled');

	const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId));
	const slot = booking.slotId
		? (await db.select().from(slots).where(eq(slots.id, booking.slotId)))[0]
		: undefined;

	const policy = tour?.cancellationPolicyJson as CancellationPolicy | undefined;
	const slotStart = slot?.startTime ?? new Date();
	const { refundAmount } = policy
		? calculateRefund(booking.totalAmount, policy, slotStart, 'guest')
		: { refundAmount: 0 };

	return { booking, tour, slot, refundAmount };
};

export const actions = {
	cancel: async ({ params }) => {
		const db = getDb();
		const [booking] = await db
			.select()
			.from(bookings)
			.where(eq(bookings.bookingReference, params.ref));
		if (!booking) return fail(404, { error: 'Not found' });
		if (booking.status === 'cancelled') return fail(400, { error: 'Already cancelled' });

		const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId));
		const slot = booking.slotId
			? (await db.select().from(slots).where(eq(slots.id, booking.slotId)))[0]
			: undefined;

		const policy = tour?.cancellationPolicyJson as CancellationPolicy | undefined;
		const slotStart = slot?.startTime ?? new Date();
		const { refundAmount } = policy
			? calculateRefund(booking.totalAmount, policy, slotStart, 'guest')
			: { refundAmount: 0 };

		if (booking.paymentStatus === 'paid' && booking.paymentIntentId && refundAmount > 0) {
			const stripe = getStripe();
			await stripe.refunds.create({
				payment_intent: booking.paymentIntentId,
				amount: refundAmount,
			});
		}

		await db
			.update(bookings)
			.set({
				status: 'cancelled',
				cancelledBy: 'guest',
				paymentStatus: refundAmount > 0 ? 'refunded' : booking.paymentStatus,
			})
			.where(eq(bookings.id, booking.id));

		if (tour && slot) {
			sendCancellationEmail({
				guestName: booking.guestName,
				guestEmail: booking.guestEmail,
				tourName: tour.name,
				slotStartTime: slot.startTime,
				participants: booking.participants,
				totalAmount: booking.totalAmount,
				currency: booking.currency,
				bookingReference: booking.bookingReference,
				cancelledBy: 'guest',
				refundAmount,
			}).catch(console.error);
		}

		redirect(302, `/bookings/${params.ref}/cancelled`);
	},
} satisfies Actions;
