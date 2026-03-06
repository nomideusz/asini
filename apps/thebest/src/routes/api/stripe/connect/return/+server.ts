import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getStripe } from '$lib/server/stripe.js';
import { getDb } from '$lib/server/db/index.js';
import { guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/login');

	const db = getDb();
	const guide = await db.query.guides.findFirst({ where: eq(guides.id, locals.user.id) });

	if (guide?.stripeAccountId) {
		const stripe = getStripe();
		const account = await stripe.accounts.retrieve(guide.stripeAccountId);
		if (account.charges_enabled && account.payouts_enabled) {
			await db
				.update(guides)
				.set({ stripeOnboardingComplete: true })
				.where(eq(guides.id, guide.id));
		}
	}

	redirect(302, '/guide/settings?stripe=done');
};
