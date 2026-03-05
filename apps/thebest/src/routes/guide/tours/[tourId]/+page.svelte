<script lang="ts">
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let editing = $state(false);
</script>

<section class="p-6 max-w-3xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<div>
			<a href="/guide/tours" class="text-sm text-base-content/60 hover:text-base-content">&larr; Back to tours</a>
			<h1 class="text-2xl font-bold mt-1">{data.tour.name}</h1>
		</div>
		<div class="flex gap-2">
			<span class="badge" class:badge-success={data.tour.status === 'active'} class:badge-ghost={data.tour.status === 'draft'}>
				{data.tour.status}
			</span>
			<button class="btn btn-sm btn-outline" onclick={() => editing = !editing}>
				{editing ? 'Cancel' : 'Edit'}
			</button>
		</div>
	</div>

	{#if form?.error}
		<div class="alert alert-error mb-4">
			<span>{form.error}</span>
		</div>
	{/if}

	{#if form?.success}
		<div class="alert alert-success mb-4">
			<span>Tour updated successfully.</span>
		</div>
	{/if}

	{#if editing}
		<form method="POST" action="?/update" class="space-y-4">
			<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-4">
				<legend class="fieldset-legend">Edit Tour</legend>

				<label class="fieldset-label" for="name">Name</label>
				<input id="name" name="name" type="text" value={data.tour.name} class="input input-bordered w-full" />

				<label class="fieldset-label mt-3" for="description">Description</label>
				<textarea id="description" name="description" class="textarea textarea-bordered w-full" rows="3">{data.tour.description}</textarea>

				<div class="grid grid-cols-3 gap-4 mt-3">
					<div>
						<label class="fieldset-label" for="duration">Duration (min)</label>
						<input id="duration" name="duration" type="number" value={data.tour.duration} class="input input-bordered w-full" />
					</div>
					<div>
						<label class="fieldset-label" for="minCapacity">Min capacity</label>
						<input id="minCapacity" name="minCapacity" type="number" value={data.tour.minCapacity} class="input input-bordered w-full" />
					</div>
					<div>
						<label class="fieldset-label" for="maxCapacity">Max capacity</label>
						<input id="maxCapacity" name="maxCapacity" type="number" value={data.tour.maxCapacity} class="input input-bordered w-full" />
					</div>
				</div>

				<label class="fieldset-label mt-3" for="status">Status</label>
				<select id="status" name="status" class="select select-bordered w-full">
					<option value="draft" selected={data.tour.status === 'draft'}>Draft</option>
					<option value="active" selected={data.tour.status === 'active'}>Active</option>
				</select>
			</fieldset>

			<div class="flex gap-3">
				<button type="submit" class="btn btn-primary">Save Changes</button>
				<button type="button" class="btn btn-ghost" onclick={() => editing = false}>Cancel</button>
			</div>
		</form>
	{:else}
		<div class="card bg-base-200">
			<div class="card-body">
				<p class="text-base-content/80">{data.tour.description || 'No description'}</p>

				<div class="grid grid-cols-2 gap-4 mt-4">
					<div>
						<dt class="text-sm text-base-content/50">Duration</dt>
						<dd class="font-medium">{data.tour.duration} minutes</dd>
					</div>
					<div>
						<dt class="text-sm text-base-content/50">Capacity</dt>
						<dd class="font-medium">{data.tour.minCapacity}–{data.tour.maxCapacity} participants</dd>
					</div>
					<div>
						<dt class="text-sm text-base-content/50">Languages</dt>
						<dd class="font-medium">{data.tour.languages.length > 0 ? data.tour.languages.join(', ') : 'Not set'}</dd>
					</div>
					<div>
						<dt class="text-sm text-base-content/50">Pricing</dt>
						<dd class="font-medium">{data.tour.pricing.model} &middot; {data.tour.pricing.basePrice} {data.tour.pricing.currency}</dd>
					</div>
				</div>
			</div>
		</div>

		<h2 class="text-lg font-semibold mt-8 mb-4">Upcoming Slots</h2>

		{#if data.slots.length === 0}
			<p class="text-base-content/60">No persisted slots in the next 3 months.</p>
		{:else}
			<div class="space-y-2">
				{#each data.slots as slot (slot.id)}
					<div class="card bg-base-200">
						<div class="card-body py-3 flex-row items-center justify-between">
							<span>{slot.startTime.toLocaleString()}</span>
							<div class="flex items-center gap-2">
								<span class="text-sm">{slot.bookedSpots}/{slot.availableSpots} booked</span>
								<span class="badge badge-sm" class:badge-success={slot.status === 'open'} class:badge-error={slot.status === 'cancelled'} class:badge-warning={slot.status === 'full'}>
									{slot.status}
								</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</section>
