<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<section class="p-6 max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold">My Tours</h1>
		<a href="/guide/tours/new" class="btn btn-primary">Create Tour</a>
	</div>

	{#if data.tours.length === 0}
		<div class="card bg-base-200">
			<div class="card-body items-center text-center">
				<p class="text-base-content/60">No tours yet. Create your first tour to get started.</p>
				<a href="/guide/tours/new" class="btn btn-primary mt-2">Create Tour</a>
			</div>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each data.tours as tour (tour.id)}
				<a href="/guide/tours/{tour.id}" class="card bg-base-200 hover:bg-base-300 transition-colors">
					<div class="card-body flex-row items-center justify-between py-4">
						<div>
							<h2 class="card-title text-lg">{tour.name}</h2>
							<p class="text-sm text-base-content/60">
								{tour.duration} min &middot; {tour.minCapacity}–{tour.maxCapacity} participants
							</p>
						</div>
						<span class="badge" class:badge-success={tour.status === 'active'} class:badge-ghost={tour.status === 'draft'}>
							{tour.status}
						</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</section>
