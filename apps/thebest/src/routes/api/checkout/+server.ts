import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getStripe } from '$lib/server/stripe.js';
import { getDb } from '$lib/server/db/index.js';
import { bookings, tours, guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, url }) => {
	const { bookingId } = await request.json();
	if (!bookingId) error(400, 'bookingId required');

	const db = getDb();

	const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
	if (!booking) error(404, 'Booking not found');
	if (booking.paymentStatus === 'paid') error(400, 'Already paid');

	const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId));
	if (!tour) error(404, 'Tour not found');

	const [guide] = await db.select().from(guides).where(eq(guides.id, tour.guideId));
	if (!guide?.stripeAccountId || !guide.stripeOnboardingComplete) {
		error(400, 'Guide has not completed Stripe onboarding');
	}

	const stripe = getStripe();
	const origin = url.origin;

	const session = await stripe.checkout.sessions.create({
		mode: 'payment',
		payment_method_types: ['card'],
		line_items: [
			{
				price_data: {
					currency: booking.currency.toLowerCase(),
					product_data: { name: tour.name },
					unit_amount: booking.totalAmount,
				},
				quantity: 1,
			},
		],
		payment_intent_data: {
			transfer_data: { destination: guide.stripeAccountId },
			metadata: { bookingId: booking.id, bookingReference: booking.bookingReference },
		},
		metadata: { bookingId: booking.id, bookingReference: booking.bookingReference },
		success_url: `${origin}/bookings/${booking.bookingReference}/confirmed`,
		cancel_url: booking.slotId ? `${origin}/book/${booking.slotId}` : `${origin}/tours`,
		customer_email: booking.guestEmail,
	});

	return json({ checkoutUrl: session.url });
};
