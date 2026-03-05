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
		<div class="alert alert-error mb-4">
			<span>{form.error}</span>
		</div>
	{/if}

	<form method="POST" class="space-y-6">
		<!-- Basic info -->
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-4">
			<legend class="fieldset-legend">Basic Information</legend>

			<label class="fieldset-label" for="name">Name</label>
			<input id="name" name="name" type="text" required class="input input-bordered w-full" placeholder="Walking Tour of Old Town" />

			<label class="fieldset-label mt-3" for="description">Description</label>
			<textarea id="description" name="description" class="textarea textarea-bordered w-full" rows="3" placeholder="Describe your tour..."></textarea>

			<div class="grid grid-cols-2 gap-4 mt-3">
				<div>
					<label class="fieldset-label" for="duration">Duration (minutes)</label>
					<input id="duration" name="duration" type="number" min="15" value="60" class="input input-bordered w-full" />
				</div>
				<div>
					<label class="fieldset-label" for="languages">Languages (comma-separated)</label>
					<input id="languages" name="languages" type="text" value="en" class="input input-bordered w-full" placeholder="en, pl, de" />
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4 mt-3">
				<div>
					<label class="fieldset-label" for="minCapacity">Min participants</label>
					<input id="minCapacity" name="minCapacity" type="number" min="1" value="1" class="input input-bordered w-full" />
				</div>
				<div>
					<label class="fieldset-label" for="maxCapacity">Max participants</label>
					<input id="maxCapacity" name="maxCapacity" type="number" min="1" value="10" class="input input-bordered w-full" />
				</div>
			</div>
		</fieldset>

		<!-- Pricing -->
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-4">
			<legend class="fieldset-legend">Pricing</legend>

			<label class="fieldset-label" for="pricingModel">Pricing model</label>
			<select id="pricingModel" name="pricingModel" class="select select-bordered w-full" bind:value={pricingModel}>
				<option value="per_person">Per person</option>
				<option value="participant_categories">Participant categories</option>
				<option value="group_tiers">Group tiers</option>
				<option value="private_tour">Private tour</option>
			</select>

			<div class="grid grid-cols-2 gap-4 mt-3">
				<div>
					<label class="fieldset-label" for="currency">Currency</label>
					<input id="currency" name="currency" type="text" value="EUR" class="input input-bordered w-full" />
				</div>
				{#if pricingModel === 'per_person'}
					<div>
						<label class="fieldset-label" for="basePrice">Price per person</label>
						<input id="basePrice" name="basePrice" type="number" step="0.01" min="0" value="20" class="input input-bordered w-full" />
					</div>
				{/if}
			</div>

			{#if pricingModel === 'participant_categories'}
				<div class="mt-3 space-y-2">
					<p class="text-sm text-base-content/60">Define categories and prices:</p>
					{#each categoryRows as row, i}
						<div class="grid grid-cols-3 gap-2 items-end">
							<div>
								<input name="catLabel" type="text" bind:value={row.label} class="input input-bordered input-sm w-full" placeholder="Category" />
							</div>
							<div>
								<input name="catPrice" type="number" step="0.01" bind:value={row.price} class="input input-bordered input-sm w-full" placeholder="Price" />
							</div>
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => categoryRows = categoryRows.filter((_, idx) => idx !== i)}>Remove</button>
						</div>
					{/each}
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => categoryRows = [...categoryRows, { label: '', price: '0' }]}>+ Add category</button>
				</div>
				<input type="hidden" name="basePrice" value="0" />
			{/if}

			{#if pricingModel === 'group_tiers'}
				<div class="mt-3 space-y-2">
					<p class="text-sm text-base-content/60">Define group size tiers:</p>
					{#each tierRows as row, i}
						<div class="grid grid-cols-4 gap-2 items-end">
							<input name="tierMin" type="number" bind:value={row.min} class="input input-bordered input-sm w-full" placeholder="Min" />
							<input name="tierMax" type="number" bind:value={row.max} class="input input-bordered input-sm w-full" placeholder="Max" />
							<input name="tierPrice" type="number" step="0.01" bind:value={row.price} class="input input-bordered input-sm w-full" placeholder="Price" />
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => tierRows = tierRows.filter((_, idx) => idx !== i)}>Remove</button>
						</div>
					{/each}
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => tierRows = [...tierRows, { min: '1', max: '1', price: '0' }]}>+ Add tier</button>
				</div>
				<input type="hidden" name="basePrice" value="0" />
			{/if}

			{#if pricingModel === 'private_tour'}
				<div class="mt-3">
					<label class="fieldset-label" for="privateFlatPrice">Flat price</label>
					<input id="privateFlatPrice" name="privateFlatPrice" type="number" step="0.01" min="0" value="200" class="input input-bordered w-full" />
				</div>
				<input type="hidden" name="basePrice" value="0" />
			{/if}
		</fieldset>

		<!-- Schedule -->
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-4">
			<legend class="fieldset-legend">Schedule</legend>

			<label class="fieldset-label" for="schedulePattern">Pattern</label>
			<select id="schedulePattern" name="schedulePattern" class="select select-bordered w-full" bind:value={schedulePattern}>
				<option value="once">One-time</option>
				<option value="weekly">Weekly</option>
			</select>

			{#if schedulePattern === 'weekly'}
				<div class="mt-3">
					<p class="fieldset-label">Days of week</p>
					<div class="flex flex-wrap gap-2 mt-1">
						{#each DAYS as day}
							<label class="label cursor-pointer gap-1">
								<input type="checkbox" name="daysOfWeek" value={day.value} class="checkbox checkbox-sm" />
								<span class="text-sm">{day.label}</span>
							</label>
						{/each}
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-2 gap-4 mt-3">
				<div>
					<label class="fieldset-label" for="startTime">Start time</label>
					<input id="startTime" name="startTime" type="time" value="09:00" class="input input-bordered w-full" />
				</div>
				<div>
					<label class="fieldset-label" for="endTime">End time</label>
					<input id="endTime" name="endTime" type="time" value="10:00" class="input input-bordered w-full" />
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4 mt-3">
				<div>
					<label class="fieldset-label" for="validFrom">Valid from</label>
					<input id="validFrom" name="validFrom" type="date" class="input input-bordered w-full" />
				</div>
				<div>
					<label class="fieldset-label" for="validUntil">Valid until (optional)</label>
					<input id="validUntil" name="validUntil" type="date" class="input input-bordered w-full" />
				</div>
			</div>

			<input type="hidden" name="timezone" value="Europe/Warsaw" />
		</fieldset>

		<!-- Cancellation policy -->
		<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-4">
			<legend class="fieldset-legend">Cancellation Policy</legend>

			<select name="cancellationPolicy" class="select select-bordered w-full" bind:value={cancellationPolicy}>
				{#each data.cancellationPolicies as policy}
					<option value={policy.key}>{policy.name} — {policy.description}</option>
				{/each}
				<option value="custom">Custom</option>
			</select>

			{#if cancellationPolicy === 'custom'}
				<div class="grid grid-cols-2 gap-4 mt-3">
					<div>
						<label class="fieldset-label" for="customHours">Hours before tour</label>
						<input id="customHours" name="customHours" type="number" min="0" value="24" class="input input-bordered w-full" />
					</div>
					<div>
						<label class="fieldset-label" for="customRefund">Refund percentage</label>
						<input id="customRefund" name="customRefund" type="number" min="0" max="100" value="100" class="input input-bordered w-full" />
					</div>
				</div>
			{/if}
		</fieldset>

		<!-- Submit -->
		<div class="flex gap-3">
			<button type="submit" class="btn btn-primary">Create Tour</button>
			<a href="/guide/tours" class="btn btn-ghost">Cancel</a>
		</div>
	</form>
</section>
