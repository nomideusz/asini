import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getStripe } from '$lib/server/stripe.js';
import { getDb } from '$lib/server/db/index.js';
import { guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) redirect(302, '/auth/login');

	const stripe = getStripe();
	const db = getDb();

	const guide = await db.query.guides.findFirst({ where: eq(guides.id, locals.user.id) });
	if (!guide) redirect(302, '/guide');

	let accountId = guide.stripeAccountId;
	if (!accountId) {
		const account = await stripe.accounts.create({
			type: 'express',
			email: guide.email,
			capabilities: {
				card_payments: { requested: true },
				transfers: { requested: true },
			},
		});
		accountId = account.id;
		await db.update(guides).set({ stripeAccountId: accountId }).where(eq(guides.id, guide.id));
	}

	const origin = url.origin;
	const accountLink = await stripe.accountLinks.create({
		account: accountId,
		refresh_url: `${origin}/api/stripe/connect`,
		return_url: `${origin}/api/stripe/connect/return`,
		type: 'account_onboarding',
	});

	redirect(302, accountLink.url);
};
