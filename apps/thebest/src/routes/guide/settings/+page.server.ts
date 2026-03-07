import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { processAndStore, deleteMedia } from '@nomideusz/svelte-media';
import { getMediaAdapter } from '$lib/server/media.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/login');
	const db = getDb();
	const guide = await db.query.guides.findFirst({ where: eq(guides.id, locals.user.id) });
	return {
		stripeConnected: guide?.stripeOnboardingComplete ?? false,
		stripeAccountId: guide?.stripeAccountId ?? null,
		guideId: guide?.id ?? null,
		avatar: guide?.avatar ?? null,
	};
};

export const actions = {
	uploadAvatar: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const file = formData.get('avatar');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'No file provided' });
		}

		const db = getDb();
		const adapter = getMediaAdapter();

		const existing = await db.query.guides.findFirst({
			where: eq(guides.id, locals.user.id),
		});
		if (existing?.avatar) {
			await deleteMedia(adapter, 'avatars', locals.user.id, existing.avatar).catch(() => {});
		}

		const stored = await processAndStore(adapter, file, 'avatars', locals.user.id);

		await db
			.update(guides)
			.set({ avatar: stored.filename })
			.where(eq(guides.id, locals.user.id));

		return { success: true };
	},
};
