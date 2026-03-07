import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { createDrizzleAdapter } from '$lib/server/scheduler/drizzle-adapter.js';
import { CANCELLATION_POLICIES } from '@nomideusz/svelte-scheduler';
import type {
	PriceStructure,
	PricingModel,
	CancellationPolicy,
	ScheduleRule,
	ParticipantCategory,
	GroupPricingTier,
} from '@nomideusz/svelte-scheduler';

export const load: PageServerLoad = async () => {
	const policies = Object.entries(CANCELLATION_POLICIES).map(([key, policy]) => ({
		key,
		name: policy.name,
		description: policy.description,
	}));
	return { cancellationPolicies: policies };
};

export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const form = await request.formData();

		const name = form.get('name')?.toString().trim();
		if (!name) return fail(400, { error: 'Name is required' });

		const description = form.get('description')?.toString().trim() ?? '';
		const duration = parseInt(form.get('duration')?.toString() ?? '60', 10);
		const minCapacity = parseInt(form.get('minCapacity')?.toString() ?? '1', 10);
		const maxCapacity = parseInt(form.get('maxCapacity')?.toString() ?? '10', 10);

		const languagesRaw = form.get('languages')?.toString().trim() ?? '';
		const languages = languagesRaw
			.split(',')
			.map((l) => l.trim().toLowerCase())
			.filter(Boolean);

		// Pricing
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
					categories.push({
						id: `cat-${i}`,
						label,
						price,
						sortOrder: i,
					});
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

		// Cancellation policy
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
			cancellationPolicy =
				CANCELLATION_POLICIES[policyKey] ?? CANCELLATION_POLICIES['flexible'];
		}

		// Schedule
		const schedulePattern = form.get('schedulePattern')?.toString() ?? 'once';
		const startTime = form.get('startTime')?.toString() ?? '09:00';
		const endTime = form.get('endTime')?.toString() ?? '10:00';
		const validFrom = form.get('validFrom')?.toString() || form.get('slotDate')?.toString() || new Date().toISOString().slice(0, 10);
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

		// Included items & requirements (from extras section)
		const includedItemsRaw = form.get('includedItems')?.toString().trim() ?? '';
		const includedItems = includedItemsRaw
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
		const requirementsRaw = form.get('requirements')?.toString().trim() ?? '';
		const requirements = requirementsRaw
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);

		const adapter = createDrizzleAdapter(getDb());
		let tour;
		try {
			tour = await adapter.createTourForGuide(locals.user.id, {
				name,
				description,
				duration,
				capacity: maxCapacity,
				minCapacity,
				maxCapacity,
				languages,
				categories: [],
				includedItems,
				requirements,
				images: [],
				isPublic: false,
				status: 'draft',
				pricing,
				cancellationPolicy,
				scheduleRules,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create tour';
			return fail(500, { error: message });
		}

		// After creating the tour, if single-date mode, create a manual slot
		const slotDate = form.get('slotDate')?.toString();
		if (schedulePattern === 'once' && slotDate) {
			const slotStartTime = form.get('startTime')?.toString() ?? '09:00';
			const slotEndTime = form.get('endTime')?.toString() ?? '10:00';
			const slotStart = new Date(`${slotDate}T${slotStartTime}:00`);
			const slotEnd = new Date(`${slotDate}T${slotEndTime}:00`);

			if (!isNaN(slotStart.getTime()) && !isNaN(slotEnd.getTime()) && slotEnd > slotStart) {
				await adapter.createSlot({
					tourId: tour.id,
					startTime: slotStart,
					endTime: slotEnd,
					availableSpots: maxCapacity,
					bookedSpots: 0,
					status: 'open',
					isGenerated: false,
				});
			}
		}

		redirect(303, '/guide/tours');
	},
} satisfies Actions;
