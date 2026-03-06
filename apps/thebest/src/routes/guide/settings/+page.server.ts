import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/login');
	const db = getDb();
	const guide = await db.query.guides.findFirst({ where: eq(guides.id, locals.user.id) });
	return {
		stripeConnected: guide?.stripeOnboardingComplete ?? false,
		stripeAccountId: guide?.stripeAccountId ?? null,
	};
};
