<script lang="ts">
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let pricingModel = $state('per_person');
	let schedulePattern = $state('once');
	let cancellationPolicy = $state('flexible');

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
</script>

<section class="p-6 max-w-2xl mx-auto">
	<h1 class="text-2xl font-bold mb-6">Create Tour</h1>

	{#if form?.error}
		<div class="flex items-center gap-2 px-3 py-2 text-sm rounded-(--asini-radius) bg-red-50 text-red-700 border border-red-200 mb-4">
			<span>{form.error}</span>
		</div>
	{/if}

	<form method="POST" class="space-y-6">
		<!-- Basic info -->
		<fieldset class="space-y-3 bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius) p-4">
			<legend class="text-xs font-medium uppercase tracking-wide mb-3" style="color: var(--asini-text-2);">Basic Information</legend>

			<label class="text-xs font-medium" for="name" style="color: var(--asini-text-2);">Name</label>
			<input id="name" name="name" type="text" required class="asini-input" placeholder="Walking Tour of Old Town" />

			<label class="text-xs font-medium mt-3" for="description" style="color: var(--asini-text-2);">Description</label>
			<textarea id="description" name="description" class="asini-input" rows="3" placeholder="Describe your tour..."></textarea>

			<div class="grid grid-cols-2 gap-4 mt-3">
				<div>
					<label class="text-xs font-medium" for="duration" style="color: var(--asini-text-2);">Duration (minutes)</label>
					<input id="duration" name="duration" type="number" min="15" value="60" class="asini-input" />
				</div>
				<div>
					<label class="text-xs font-medium" for="languages" style="color: var(--asini-text-2);">Languages (comma-separated)</label>
					<input id="languages" name="languages" type="text" value="en" class="asini-input" placeholder="en, pl, de" />
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4 mt-3">
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

		<!-- Pricing -->
		<fieldset class="space-y-3 bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius) p-4">
			<legend class="text-xs font-medium uppercase tracking-wide mb-3" style="color: var(--asini-text-2);">Pricing</legend>

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
						<input id="basePrice" name="basePrice" type="number" step="0.01" min="0" value="20" class="asini-input" />
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
		</fieldset>

		<!-- Schedule -->
		<fieldset class="space-y-3 bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius) p-4">
			<legend class="text-xs font-medium uppercase tracking-wide mb-3" style="color: var(--asini-text-2);">Schedule</legend>

			<label class="text-xs font-medium" for="schedulePattern" style="color: var(--asini-text-2);">Pattern</label>
			<select id="schedulePattern" name="schedulePattern" class="asini-input" bind:value={schedulePattern}>
				<option value="once">One-time</option>
				<option value="weekly">Weekly</option>
			</select>

			{#if schedulePattern === 'weekly'}
				<div class="mt-3">
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
			{/if}

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

			<input type="hidden" name="timezone" value="Europe/Warsaw" />
		</fieldset>

		<!-- Cancellation policy -->
		<fieldset class="space-y-3 bg-(--asini-surface) border border-(--asini-border) rounded-(--asini-radius) p-4">
			<legend class="text-xs font-medium uppercase tracking-wide mb-3" style="color: var(--asini-text-2);">Cancellation Policy</legend>

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
		</fieldset>

		<!-- Submit -->
		<div class="flex gap-3">
			<button type="submit" class="asini-btn asini-btn-primary">Create Tour</button>
			<a href="/guide/tours" class="asini-btn asini-btn-ghost">Cancel</a>
		</div>
	</form>
</section>
