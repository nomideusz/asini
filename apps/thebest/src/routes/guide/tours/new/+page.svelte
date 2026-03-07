<script lang="ts">
	import type { ActionData, PageData } from './$types.js';
	import { i18n } from '$lib/i18n.js';

	const t = i18n.t;

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let tourName = $state('');
	let basePrice = $state('20');
	let slotDate = $state('');

	let pricingModel = $state('per_person');
	let schedulePattern = $state('once');
	let cancellationPolicy = $state('flexible');

	let showAdvancedPricing = $state(false);
	let showRecurring = $state(false);
	let showCancellation = $state(false);
	let showExtras = $state(false);

	let categoryRows = $state([{ label: 'Adult', price: '20' }, { label: 'Child', price: '10' }]);
	let tierRows = $state([{ min: '1', max: '4', price: '100' }, { min: '5', max: '10', price: '180' }]);

	const DAYS = [
		{ value: 1, label: 'Mon' },
		{ value: 2, label: 'Tue' },
		{ value: 3, label: 'Wed' },
		{ value: 4, label: 'Thu' },
		{ value: 5, label: 'Fri' },
		{ value: 6, label: 'Sat' },
		{ value: 7, label: 'Sun' },
	];

	let basicsComplete = $derived(tourName.trim().length > 0);
	let pricingComplete = $derived(showAdvancedPricing || parseFloat(basePrice) > 0);
	let whenComplete = $derived(showRecurring || slotDate.length > 0);
</script>

<section class="p-6 max-w-2xl mx-auto pb-24">
	<h1 class="text-2xl font-bold mb-6">{t('guide_create_title')}</h1>

	{#if form?.error}
		<div class="asini-alert asini-alert-danger mb-4">
			<span>{form.error}</span>
		</div>
	{/if}

	<form method="POST" id="create-form" class="space-y-6">
		<!-- Section 1: Basics -->
		<fieldset class="space-y-3 bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius) p-4">
			<legend class="text-xs font-medium uppercase tracking-wide mb-3 flex items-center gap-1.5" style="color: var(--asini-text-2);">
				{t('guide_create_basics')}
				{#if basicsComplete}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--asini-success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				{/if}
			</legend>

			<label class="text-xs font-medium" for="name" style="color: var(--asini-text-2);">Name</label>
			<input id="name" name="name" type="text" required class="asini-input" placeholder="Walking Tour of Old Town" bind:value={tourName} />

			<label class="text-xs font-medium mt-3" for="description" style="color: var(--asini-text-2);">Description</label>
			<textarea id="description" name="description" class="asini-input" rows="3" placeholder="Describe your tour..."></textarea>

			<div class="grid grid-cols-3 gap-4 mt-3">
				<div>
					<label class="text-xs font-medium" for="duration" style="color: var(--asini-text-2);">Duration (min)</label>
					<input id="duration" name="duration" type="number" min="15" value="60" class="asini-input" />
				</div>
				<div>
					<label class="text-xs font-medium" for="minCapacity" style="color: var(--asini-text-2);">Min participants</label>
					<input id="minCapacity" name="minCapacity" type="number" min="1" value="1" class="asini-input" />
				</div>
				<div>
					<label class="text-xs font-medium" for="maxCapacity" style="color: var(--asini-text-2);">Max participants</label>
					<input id="maxCapacity" name="maxCapacity" type="number" min="1" value="10" class="asini-input" />
				</div>
			</div>
		</fieldset>

		<!-- Section 2: Pricing -->
		<fieldset class="space-y-3 bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius) p-4">
			<legend class="text-xs font-medium uppercase tracking-wide mb-3 flex items-center gap-1.5" style="color: var(--asini-text-2);">
				{t('guide_create_pricing')}
				{#if pricingComplete}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--asini-success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				{/if}
			</legend>

			{#if !showAdvancedPricing}
				<!-- Simple pricing: per person + currency -->
				<input type="hidden" name="pricingModel" value="per_person" />
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="text-xs font-medium" for="basePrice" style="color: var(--asini-text-2);">Price per person</label>
						<input id="basePrice" name="basePrice" type="number" step="0.01" min="0" class="asini-input" bind:value={basePrice} />
					</div>
					<div>
						<label class="text-xs font-medium" for="currency" style="color: var(--asini-text-2);">Currency</label>
						<input id="currency" name="currency" type="text" value="EUR" class="asini-input" />
					</div>
				</div>
			{:else}
				<!-- Advanced pricing: full model selector -->
				<label class="text-xs font-medium" for="pricingModel" style="color: var(--asini-text-2);">Pricing model</label>
				<select id="pricingModel" name="pricingModel" class="asini-input" bind:value={pricingModel}>
					<option value="per_person">Per person</option>
					<option value="participant_categories">Participant categories</option>
					<option value="group_tiers">Group tiers</option>
					<option value="private_tour">Private tour</option>
				</select>

				<div class="grid grid-cols-2 gap-4 mt-3">
					<div>
						<label class="text-xs font-medium" for="currency" style="color: var(--asini-text-2);">Currency</label>
						<input id="currency" name="currency" type="text" value="EUR" class="asini-input" />
					</div>
					{#if pricingModel === 'per_person'}
						<div>
							<label class="text-xs font-medium" for="basePrice" style="color: var(--asini-text-2);">Price per person</label>
							<input id="basePrice" name="basePrice" type="number" step="0.01" min="0" class="asini-input" bind:value={basePrice} />
						</div>
					{/if}
				</div>

				{#if pricingModel === 'participant_categories'}
					<div class="mt-3 space-y-2">
						<p class="text-sm" style="color: var(--asini-text-3);">Define categories and prices:</p>
						{#each categoryRows as row, i}
							<div class="grid grid-cols-3 gap-2 items-end">
								<div>
									<input name="catLabel" type="text" bind:value={row.label} class="asini-input py-1 text-xs" placeholder="Category" />
								</div>
								<div>
									<input name="catPrice" type="number" step="0.01" bind:value={row.price} class="asini-input py-1 text-xs" placeholder="Price" />
								</div>
								<button type="button" class="asini-btn asini-btn-ghost asini-btn-sm" onclick={() => categoryRows = categoryRows.filter((_, idx) => idx !== i)}>Remove</button>
							</div>
						{/each}
						<button type="button" class="asini-btn asini-btn-ghost asini-btn-sm" onclick={() => categoryRows = [...categoryRows, { label: '', price: '0' }]}>+ Add category</button>
					</div>
					<input type="hidden" name="basePrice" value="0" />
				{/if}

				{#if pricingModel === 'group_tiers'}
					<div class="mt-3 space-y-2">
						<p class="text-sm" style="color: var(--asini-text-3);">Define group size tiers:</p>
						{#each tierRows as row, i}
							<div class="grid grid-cols-4 gap-2 items-end">
								<input name="tierMin" type="number" bind:value={row.min} class="asini-input py-1 text-xs" placeholder="Min" />
								<input name="tierMax" type="number" bind:value={row.max} class="asini-input py-1 text-xs" placeholder="Max" />
								<input name="tierPrice" type="number" step="0.01" bind:value={row.price} class="asini-input py-1 text-xs" placeholder="Price" />
								<button type="button" class="asini-btn asini-btn-ghost asini-btn-sm" onclick={() => tierRows = tierRows.filter((_, idx) => idx !== i)}>Remove</button>
							</div>
						{/each}
						<button type="button" class="asini-btn asini-btn-ghost asini-btn-sm" onclick={() => tierRows = [...tierRows, { min: '1', max: '1', price: '0' }]}>+ Add tier</button>
					</div>
					<input type="hidden" name="basePrice" value="0" />
				{/if}

				{#if pricingModel === 'private_tour'}
					<div class="mt-3">
						<label class="text-xs font-medium" for="privateFlatPrice" style="color: var(--asini-text-2);">Flat price</label>
						<input id="privateFlatPrice" name="privateFlatPrice" type="number" step="0.01" min="0" value="200" class="asini-input" />
					</div>
					<input type="hidden" name="basePrice" value="0" />
				{/if}
			{/if}

			<button
				type="button"
				class="text-sm font-medium mt-2 cursor-pointer"
				style="color: var(--asini-accent);"
				onclick={() => showAdvancedPricing = !showAdvancedPricing}
			>
				{#if showAdvancedPricing}
					&larr; Simple pricing
				{:else}
					{t('guide_create_advanced_pricing')} &rarr;
				{/if}
			</button>
		</fieldset>

		<!-- Section 3: When -->
		<fieldset class="space-y-3 bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius) p-4">
			<legend class="text-xs font-medium uppercase tracking-wide mb-3 flex items-center gap-1.5" style="color: var(--asini-text-2);">
				{t('guide_create_when')}
				{#if whenComplete}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--asini-success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
				{/if}
			</legend>

			{#if !showRecurring}
				<!-- Simple: single date + times -->
				<input type="hidden" name="schedulePattern" value="once" />
				<div class="grid grid-cols-3 gap-4">
					<div>
						<label class="text-xs font-medium" for="slotDate" style="color: var(--asini-text-2);">Date</label>
						<input id="slotDate" name="slotDate" type="date" class="asini-input" bind:value={slotDate} />
					</div>
					<div>
						<label class="text-xs font-medium" for="startTime" style="color: var(--asini-text-2);">Start time</label>
						<input id="startTime" name="startTime" type="time" value="09:00" class="asini-input" />
					</div>
					<div>
						<label class="text-xs font-medium" for="endTime" style="color: var(--asini-text-2);">End time</label>
						<input id="endTime" name="endTime" type="time" value="10:00" class="asini-input" />
					</div>
				</div>
			{:else}
				<!-- Recurring: weekly schedule -->
				<input type="hidden" name="schedulePattern" value="weekly" />
				<div class="mt-1">
					<p class="text-xs font-medium" style="color: var(--asini-text-2);">Days of week</p>
					<div class="flex flex-wrap gap-2 mt-1">
						{#each DAYS as day}
							<label class="cursor-pointer flex items-center gap-1">
								<input type="checkbox" name="daysOfWeek" value={day.value} class="size-3.5 accent-(--asini-accent)" />
								<span class="text-sm">{day.label}</span>
							</label>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4 mt-3">
					<div>
						<label class="text-xs font-medium" for="startTime" style="color: var(--asini-text-2);">Start time</label>
						<input id="startTime" name="startTime" type="time" value="09:00" class="asini-input" />
					</div>
					<div>
						<label class="text-xs font-medium" for="endTime" style="color: var(--asini-text-2);">End time</label>
						<input id="endTime" name="endTime" type="time" value="10:00" class="asini-input" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4 mt-3">
					<div>
						<label class="text-xs font-medium" for="validFrom" style="color: var(--asini-text-2);">Valid from</label>
						<input id="validFrom" name="validFrom" type="date" class="asini-input" />
					</div>
					<div>
						<label class="text-xs font-medium" for="validUntil" style="color: var(--asini-text-2);">Valid until (optional)</label>
						<input id="validUntil" name="validUntil" type="date" class="asini-input" />
					</div>
				</div>
			{/if}

			<input type="hidden" name="timezone" value="Europe/Warsaw" />

			<button
				type="button"
				class="text-sm font-medium mt-2 cursor-pointer"
				style="color: var(--asini-accent);"
				onclick={() => showRecurring = !showRecurring}
			>
				{#if showRecurring}
					&larr; Single date
				{:else}
					{t('guide_create_recurring')} &rarr;
				{/if}
			</button>
		</fieldset>

		<!-- Section 4: Cancellation policy (collapsed) -->
		<div class="bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius)">
			<button
				type="button"
				class="w-full flex items-center justify-between p-4 cursor-pointer"
				onclick={() => showCancellation = !showCancellation}
			>
				<div class="text-left">
					<span class="text-xs font-medium uppercase tracking-wide" style="color: var(--asini-text-2);">{t('guide_create_cancellation')}</span>
					{#if !showCancellation}
						<p class="text-xs mt-0.5" style="color: var(--asini-text-3);">{t('guide_create_cancellation_summary')}</p>
					{/if}
				</div>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--asini-text-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate({showCancellation ? 180 : 0}deg); transition: transform 150ms;">
					<polyline points="6 9 12 15 18 9"/>
				</svg>
			</button>

			{#if !showCancellation}
				<input type="hidden" name="cancellationPolicy" value="flexible" />
			{/if}

			{#if showCancellation}
				<div class="px-4 pb-4 space-y-3">
					<select name="cancellationPolicy" class="asini-input" bind:value={cancellationPolicy}>
						{#each data.cancellationPolicies as policy}
							<option value={policy.key}>{policy.name} — {policy.description}</option>
						{/each}
						<option value="custom">Custom</option>
					</select>

					{#if cancellationPolicy === 'custom'}
						<div class="grid grid-cols-2 gap-4 mt-3">
							<div>
								<label class="text-xs font-medium" for="customHours" style="color: var(--asini-text-2);">Hours before tour</label>
								<input id="customHours" name="customHours" type="number" min="0" value="24" class="asini-input" />
							</div>
							<div>
								<label class="text-xs font-medium" for="customRefund" style="color: var(--asini-text-2);">Refund percentage</label>
								<input id="customRefund" name="customRefund" type="number" min="0" max="100" value="100" class="asini-input" />
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Section 5: Extras (collapsed) -->
		<div class="bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius)">
			<button
				type="button"
				class="w-full flex items-center justify-between p-4 cursor-pointer"
				onclick={() => showExtras = !showExtras}
			>
				<div class="text-left">
					<span class="text-xs font-medium uppercase tracking-wide" style="color: var(--asini-text-2);">{t('guide_create_extras')}</span>
					{#if !showExtras}
						<p class="text-xs mt-0.5" style="color: var(--asini-text-3);">{t('guide_create_extras_hint')}</p>
					{/if}
				</div>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--asini-text-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate({showExtras ? 180 : 0}deg); transition: transform 150ms;">
					<polyline points="6 9 12 15 18 9"/>
				</svg>
			</button>

			{#if showExtras}
				<div class="px-4 pb-4 space-y-3">
					<div>
						<label class="text-xs font-medium" for="languages" style="color: var(--asini-text-2);">Languages (comma-separated)</label>
						<input id="languages" name="languages" type="text" value="en" class="asini-input" placeholder="en, pl, de" />
					</div>
					<div>
						<label class="text-xs font-medium" for="includedItems" style="color: var(--asini-text-2);">Included items (one per line)</label>
						<textarea id="includedItems" name="includedItems" class="asini-input" rows="3" placeholder="Water bottle&#10;Map&#10;Audio guide"></textarea>
					</div>
					<div>
						<label class="text-xs font-medium" for="requirements" style="color: var(--asini-text-2);">Requirements (one per line)</label>
						<textarea id="requirements" name="requirements" class="asini-input" rows="3" placeholder="Comfortable walking shoes&#10;Weather-appropriate clothing"></textarea>
					</div>
				</div>
			{:else}
				<!-- Default language when extras not opened -->
				<input type="hidden" name="languages" value="en" />
			{/if}
		</div>
	</form>
</section>

<!-- Sticky submit bar -->
<div class="fixed bottom-0 left-0 right-0 lg:left-64 flex items-center gap-3 px-6 py-3 z-30"
     style="background: color-mix(in srgb, var(--asini-bg) 90%, transparent); backdrop-filter: blur(8px); border-top: 1px solid var(--asini-border);">
	<button type="submit" form="create-form" class="asini-btn asini-btn-primary">{t('guide_create_submit')}</button>
	<a href="/guide/tours" class="asini-btn asini-btn-ghost">{t('guide_create_cancel')}</a>
</div>
