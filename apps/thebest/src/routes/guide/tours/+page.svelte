<script lang="ts">
	import type { PageData } from './$types.js';
	import { i18n } from '$lib/i18n.js';

	const t = i18n.t;

	let { data }: { data: PageData } = $props();

	let search = $state('');
	let statusFilter = $state<'all' | 'active' | 'draft'>('all');

	let filteredTours = $derived(
		data.tours.filter((tour) => {
			const matchesSearch = tour.name.toLowerCase().includes(search.toLowerCase());
			const matchesStatus = statusFilter === 'all' || tour.status === statusFilter;
			return matchesSearch && matchesStatus;
		})
	);
</script>

<section class="p-6 max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold">{t('guide_my_tours')}</h1>
		<a href="/guide/tours/new" class="asini-btn asini-btn-primary">{t('guide_create_first_tour')}</a>
	</div>

	{#if data.tours.length === 0}
		<div class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface)">
			<div class="p-5 flex flex-col items-center text-center">
				<p style="color: var(--asini-text-3);">{t('guide_dashboard_no_tours')}</p>
				<a href="/guide/tours/new" class="asini-btn asini-btn-primary mt-2">{t('guide_create_first_tour')}</a>
			</div>
		</div>
	{:else}
		<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
			<input
				type="text"
				class="asini-input max-w-xs"
				placeholder={t('guide_tours_search')}
				bind:value={search}
			/>
			<div class="inline-flex items-center gap-0.5 p-1 rounded-(--asini-radius) bg-(--asini-surface) border border-(--asini-border)">
				{#each ['all', 'active', 'draft'] as filter}
					<button
						type="button"
						class="px-3 py-1.5 text-xs font-medium rounded-(--asini-radius-sm) cursor-pointer transition-colors"
						class:shadow-sm={statusFilter === filter}
						style="background: {statusFilter === filter ? 'var(--asini-bg)' : 'transparent'}; color: {statusFilter === filter ? 'var(--asini-text)' : 'var(--asini-text-2)'};"
						onclick={() => statusFilter = filter as 'all' | 'active' | 'draft'}
					>
						{t(`guide_tours_filter_${filter}`)}
					</button>
				{/each}
			</div>
		</div>

		{#if filteredTours.length === 0}
			<div class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface)">
				<div class="p-5 flex flex-col items-center text-center">
					<p style="color: var(--asini-text-3);">{t('guide_tours_empty_filter')}</p>
				</div>
			</div>
		{:else}
			<div class="grid gap-4">
				{#each filteredTours as tour (tour.id)}
					<a href="/guide/tours/{tour.id}" class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface) hover:bg-(--asini-bg-subtle) transition-colors">
						<div class="flex flex-row items-center justify-between py-4 px-5">
							<div>
								<h2 class="text-lg font-semibold">{tour.name}</h2>
								<p class="text-sm" style="color: var(--asini-text-3);">
									{tour.duration} min &middot; {tour.minCapacity}–{tour.maxCapacity} participants
									{#if tour.bookingCount > 0}
										&middot; <span>{t('guide_tours_bookings_count', { count: tour.bookingCount })}</span>
									{/if}
								</p>
							</div>
							<span
								class="asini-badge"
								class:asini-badge-success={tour.status === 'active'}
							>
								{tour.status}
							</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</section>
