import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { createDrizzleAdapter } from '$lib/server/scheduler/drizzle-adapter.js';

export const load: PageServerLoad = async ({ params }) => {
	const adapter = createDrizzleAdapter(getDb());
	const tour = await adapter.getTourById(params.tourId);
	if (!tour) {
		error(404, 'Tour not found');
	}
	const now = new Date();
	const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
	const slots = await adapter.getSlots(tour.id, { start: now, end: rangeEnd });
	return { tour, slots };
};

export const actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const form = await request.formData();
		const adapter = createDrizzleAdapter(getDb());

		const existing = await adapter.getTourById(params.tourId);
		if (!existing) return fail(404, { error: 'Tour not found' });

		const name = form.get('name')?.toString().trim();
		const description = form.get('description')?.toString().trim();
		const duration = form.get('duration')?.toString();
		const minCapacity = form.get('minCapacity')?.toString();
		const maxCapacity = form.get('maxCapacity')?.toString();
		const status = form.get('status')?.toString() as 'active' | 'draft' | undefined;

		const patch: Record<string, unknown> = {};
		if (name) patch.name = name;
		if (description !== undefined) patch.description = description;
		if (duration) patch.duration = parseInt(duration, 10);
		if (minCapacity) patch.minCapacity = parseInt(minCapacity, 10);
		if (maxCapacity) {
			const max = parseInt(maxCapacity, 10);
			patch.maxCapacity = max;
			patch.capacity = max;
		}
		if (status && (status === 'active' || status === 'draft')) patch.status = status;

		try {
			await adapter.updateTour(params.tourId, patch);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update tour';
			return fail(500, { error: message });
		}

		return { success: true };
	},
} satisfies Actions;
