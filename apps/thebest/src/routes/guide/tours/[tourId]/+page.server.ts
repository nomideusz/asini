import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { createDrizzleAdapter } from '$lib/server/scheduler/drizzle-adapter.js';
import { tours } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { processAndStore, deleteMedia } from '@nomideusz/svelte-media';
import { getMediaAdapter } from '$lib/server/media.js';
import { generateSlots, CANCELLATION_POLICIES } from '@nomideusz/svelte-scheduler';
import type {
	PriceStructure,
	PricingModel,
	CancellationPolicy,
	ScheduleRule,
	ParticipantCategory,
	GroupPricingTier,
} from '@nomideusz/svelte-scheduler';

export const load: PageServerLoad = async ({ params }) => {
	const adapter = createDrizzleAdapter(getDb());
	const tour = await adapter.getTourById(params.tourId);
	if (!tour) {
		error(404, 'Tour not found');
	}
	const now = new Date();
	const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
	const persistedSlots = await adapter.getSlots(tour.id, { start: now, end: rangeEnd });

	// Generate all upcoming slots (lazy generation merges persisted + rule-based)
	let allSlots = persistedSlots;
	if (tour.scheduleRules && tour.scheduleRules.length > 0) {
		try {
			allSlots = generateSlots(tour, persistedSlots, { start: now, end: rangeEnd });
		} catch {
			// Schedule rules may be invalid — fall back to persisted only
		}
	}

	const policies = Object.entries(CANCELLATION_POLICIES).map(([key, policy]) => ({
		key,
		name: policy.name,
		description: policy.description,
	}));

	return { tour, slots: allSlots, cancellationPolicies: policies };
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
		const location = form.get('location')?.toString().trim();
		const languagesRaw = form.get('languages')?.toString().trim();
		const includedItemsRaw = form.get('includedItems')?.toString().trim();
		const requirementsRaw = form.get('requirements')?.toString().trim();

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
		if (location !== undefined) patch.location = location || null;
		if (languagesRaw !== undefined) {
			patch.languages = languagesRaw
				.split(',')
				.map((l) => l.trim().toLowerCase())
				.filter(Boolean);
		}
		if (includedItemsRaw !== undefined) {
			patch.includedItems = includedItemsRaw
				.split('\n')
				.map((l) => l.trim())
				.filter(Boolean);
		}
		if (requirementsRaw !== undefined) {
			patch.requirements = requirementsRaw
				.split('\n')
				.map((l) => l.trim())
				.filter(Boolean);
		}

		try {
			await adapter.updateTour(params.tourId, patch);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update tour';
			return fail(500, { error: message });
		}

		return { success: true };
	},

	updatePricing: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const form = await request.formData();
		const adapter = createDrizzleAdapter(getDb());

		const existing = await adapter.getTourById(params.tourId);
		if (!existing) return fail(404, { error: 'Tour not found' });

		const pricingModel = (form.get('pricingModel')?.toString() ?? 'per_person') as PricingModel;
		const basePrice = parseFloat(form.get('basePrice')?.toString() ?? '0');
		const currency = form.get('currency')?.toString().trim() || 'EUR';

		const pricing: PriceStructure = {
			model: pricingModel,
			basePrice,
			currency,
			guidePaysProcessingFee: false,
		};

		if (pricingModel === 'participant_categories') {
			const catLabels = form.getAll('catLabel');
			const catPrices = form.getAll('catPrice');
			const categories: ParticipantCategory[] = [];
			for (let i = 0; i < catLabels.length; i++) {
				const label = catLabels[i]?.toString().trim();
				const price = parseFloat(catPrices[i]?.toString() ?? '0');
				if (label) {
					categories.push({ id: `cat-${i}`, label, price, sortOrder: i });
				}
			}
			pricing.participantCategories = categories;
		}

		if (pricingModel === 'group_tiers') {
			const tierMins = form.getAll('tierMin');
			const tierMaxs = form.getAll('tierMax');
			const tierPrices = form.getAll('tierPrice');
			const tiers: GroupPricingTier[] = [];
			for (let i = 0; i < tierMins.length; i++) {
				const minP = parseInt(tierMins[i]?.toString() ?? '0', 10);
				const maxP = parseInt(tierMaxs[i]?.toString() ?? '0', 10);
				const price = parseFloat(tierPrices[i]?.toString() ?? '0');
				if (maxP > 0) {
					tiers.push({ id: `tier-${i}`, minParticipants: minP, maxParticipants: maxP, price });
				}
			}
			pricing.groupPricingTiers = tiers;
		}

		if (pricingModel === 'private_tour') {
			const flatPrice = parseFloat(form.get('privateFlatPrice')?.toString() ?? '0');
			pricing.privateTour = { flatPrice };
		}

		try {
			await adapter.updateTour(params.tourId, { pricing });
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update pricing';
			return fail(500, { error: message });
		}
		return { success: true };
	},

	updateSchedule: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const form = await request.formData();
		const adapter = createDrizzleAdapter(getDb());

		const existing = await adapter.getTourById(params.tourId);
		if (!existing) return fail(404, { error: 'Tour not found' });

		const schedulePattern = form.get('schedulePattern')?.toString() ?? 'once';
		const startTime = form.get('startTime')?.toString() ?? '09:00';
		const endTime = form.get('endTime')?.toString() ?? '10:00';
		const validFrom = form.get('validFrom')?.toString() ?? new Date().toISOString().slice(0, 10);
		const validUntil = form.get('validUntil')?.toString() || undefined;
		const timezone = form.get('timezone')?.toString() || 'Europe/Warsaw';

		const scheduleRules: ScheduleRule[] = [];
		if (schedulePattern === 'weekly') {
			const daysRaw = form.getAll('daysOfWeek');
			const daysOfWeek = daysRaw.map((d) => parseInt(d.toString(), 10)).filter((d) => d >= 1 && d <= 7);
			if (daysOfWeek.length > 0) {
				scheduleRules.push({
					id: 'rule-1',
					pattern: 'weekly',
					daysOfWeek,
					startTime,
					endTime,
					validFrom,
					validUntil,
					timezone,
				});
			}
		} else {
			scheduleRules.push({
				id: 'rule-1',
				pattern: 'once',
				startTime,
				endTime,
				validFrom,
				validUntil,
				timezone,
			});
		}

		try {
			await adapter.updateTour(params.tourId, { scheduleRules });
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update schedule';
			return fail(500, { error: message });
		}
		return { success: true };
	},

	updateCancellation: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const form = await request.formData();
		const adapter = createDrizzleAdapter(getDb());

		const existing = await adapter.getTourById(params.tourId);
		if (!existing) return fail(404, { error: 'Tour not found' });

		const policyKey = form.get('cancellationPolicy')?.toString() ?? 'flexible';
		let cancellationPolicy: CancellationPolicy;
		if (policyKey === 'custom') {
			cancellationPolicy = {
				id: 'custom',
				name: 'Custom',
				description: 'Custom cancellation policy',
				rules: [
					{
						hoursBeforeTour: parseInt(form.get('customHours')?.toString() ?? '24', 10),
						refundPercentage: parseInt(form.get('customRefund')?.toString() ?? '100', 10),
						description: 'Custom rule',
					},
					{ hoursBeforeTour: 0, refundPercentage: 0, description: 'No refund after deadline.' },
				],
			};
		} else {
			cancellationPolicy = CANCELLATION_POLICIES[policyKey] ?? CANCELLATION_POLICIES['flexible'];
		}

		try {
			await adapter.updateTour(params.tourId, { cancellationPolicy });
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update cancellation policy';
			return fail(500, { error: message });
		}
		return { success: true };
	},

	togglePublic: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const adapter = createDrizzleAdapter(getDb());
		const existing = await adapter.getTourById(params.tourId);
		if (!existing) return fail(404, { error: 'Tour not found' });

		const newPublic = !existing.isPublic;
		await adapter.updateTour(params.tourId, {
			isPublic: newPublic,
			...(newPublic ? { status: 'active' as const } : {}),
		});

		return { success: true, published: newPublic };
	},

	addSlot: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const form = await request.formData();
		const dateStr = form.get('slotDate')?.toString();
		const startTimeStr = form.get('slotStartTime')?.toString();
		const endTimeStr = form.get('slotEndTime')?.toString();

		if (!dateStr || !startTimeStr || !endTimeStr) {
			return fail(400, { error: 'Date, start time, and end time are required.' });
		}

		const startTime = new Date(`${dateStr}T${startTimeStr}:00`);
		const endTime = new Date(`${dateStr}T${endTimeStr}:00`);

		if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
			return fail(400, { error: 'Invalid date or time.' });
		}
		if (endTime <= startTime) {
			return fail(400, { error: 'End time must be after start time.' });
		}

		const adapter = createDrizzleAdapter(getDb());
		const existing = await adapter.getTourById(params.tourId);
		if (!existing) return fail(404, { error: 'Tour not found' });

		try {
			await adapter.createSlot({
				tourId: params.tourId,
				startTime,
				endTime,
				availableSpots: existing.maxCapacity,
				bookedSpots: 0,
				status: 'open',
				isGenerated: false,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create slot';
			return fail(500, { error: message });
		}

		return { slotAdded: true };
	},

	uploadPhoto: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const file = formData.get('photo');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'No file provided' });
		}

		const db = getDb();
		const adapter = getMediaAdapter();

		const [tour] = await db.select().from(tours).where(eq(tours.id, params.tourId));
		if (!tour || tour.guideId !== locals.user.id) return fail(403, { error: 'Forbidden' });

		const stored = await processAndStore(adapter, file, 'tours', params.tourId);

		await db
			.update(tours)
			.set({ images: [...(tour.images ?? []), stored.filename] })
			.where(eq(tours.id, params.tourId));

		return { success: true };
	},

	deletePhoto: async ({ request, locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const filename = formData.get('filename') as string;
		if (!filename) return fail(400, { error: 'No filename' });

		const db = getDb();
		const adapter = getMediaAdapter();

		const [tour] = await db.select().from(tours).where(eq(tours.id, params.tourId));
		if (!tour || tour.guideId !== locals.user.id) return fail(403, { error: 'Forbidden' });

		await deleteMedia(adapter, 'tours', params.tourId, filename);

		await db
			.update(tours)
			.set({ images: (tour.images ?? []).filter((f) => f !== filename) })
			.where(eq(tours.id, params.tourId));

		return { success: true };
	},
} satisfies Actions;
