import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getStripe } from '$lib/server/stripe.js';
import { getDb } from '$lib/server/db/index.js';
import { bookings, tours, slots, guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { sendBookingConfirmation, sendGuideBookingNotification } from '$lib/server/email.js';
import type Stripe from 'stripe';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const sig = request.headers.get('stripe-signature');
	if (!sig) return json({ error: 'No signature' }, { status: 400 });

	const stripe = getStripe();
	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET!);
	} catch {
		return json({ error: 'Invalid signature' }, { status: 400 });
	}

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as Stripe.Checkout.Session;
		const bookingId = session.metadata?.bookingId;
		if (!bookingId) return json({ ok: true });

		const db = getDb();
		const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
		if (!booking || booking.paymentStatus === 'paid') return json({ ok: true });

		await db
			.update(bookings)
			.set({
				paymentStatus: 'paid',
				status: 'confirmed',
				paymentIntentId:
					typeof session.payment_intent === 'string' ? session.payment_intent : null,
			})
			.where(eq(bookings.id, bookingId));

		const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId));
		const slot = booking.slotId
			? (await db.select().from(slots).where(eq(slots.id, booking.slotId)))[0]
			: undefined;
		const [guide] = tour
			? await db.select().from(guides).where(eq(guides.id, tour.guideId))
			: [undefined];

		const emailData = {
			guestName: booking.guestName,
			guestEmail: booking.guestEmail,
			tourName: tour?.name ?? 'Tour',
			slotStartTime: slot?.startTime ?? new Date(),
			participants: booking.participants,
			totalAmount: booking.totalAmount,
			currency: booking.currency,
			bookingReference: booking.bookingReference,
			guideEmail: guide?.email ?? undefined,
			guideName: guide?.name ?? undefined,
			verifyUrl: `${env.ORIGIN}/verify/${booking.bookingReference}`,
		};

		Promise.all([
			sendBookingConfirmation(emailData),
			sendGuideBookingNotification(emailData),
		]).catch(console.error);
	}

	return json({ ok: true });
};
