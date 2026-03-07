<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<section class="p-6 max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold">My Tours</h1>
		<a href="/guide/tours/new" class="asini-btn asini-btn-primary">Create Tour</a>
	</div>

	{#if data.tours.length === 0}
		<div class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface)">
			<div class="p-5 flex flex-col items-center text-center">
				<p style="color: var(--asini-text-3);">No tours yet. Create your first tour to get started.</p>
				<a href="/guide/tours/new" class="asini-btn asini-btn-primary mt-2">Create Tour</a>
			</div>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each data.tours as tour (tour.id)}
				<a href="/guide/tours/{tour.id}" class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface) hover:bg-(--asini-bg-subtle) transition-colors">
					<div class="flex flex-row items-center justify-between py-4 px-5">
						<div>
							<h2 class="text-lg font-semibold">{tour.name}</h2>
							<p class="text-sm" style="color: var(--asini-text-3);">
								{tour.duration} min &middot; {tour.minCapacity}–{tour.maxCapacity} participants
							</p>
						</div>
						<span
							class="asini-badge"
							class:bg-green-50={tour.status === 'active'}
							class:text-green-700={tour.status === 'active'}
							class:border-green-200={tour.status === 'active'}
							class:bg-transparent={tour.status === 'draft'}
							class:border-transparent={tour.status === 'draft'}
						>
							{tour.status}
						</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</section>
