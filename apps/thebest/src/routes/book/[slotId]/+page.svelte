<script lang="ts">
	import type { PageData } from './$types.js';
	import { BookingFlow } from '@nomideusz/svelte-scheduler';
	import { createFetchAdapter } from '$lib/fetch-adapter.js';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const adapter = createFetchAdapter();

	// Rehydrate the slot with Date objects for BookingFlow's initialSlot
	let initialSlot = $derived({
		...data.slot,
		startTime: new Date(data.slot.startTime),
		endTime: new Date(data.slot.endTime),
	});
</script>

<section class="max-w-xl mx-auto px-4 py-8">
	<!-- Breadcrumb -->
	<div class="breadcrumbs text-sm mb-6">
		<ul>
			<li><a href="/">Home</a></li>
			<li><a href="/tours">Tours</a></li>
			<li><a href="/tours/{data.tour.id}">{data.tour.name}</a></li>
			<li>Book</li>
		</ul>
	</div>

	<h1 class="text-2xl font-bold mb-6">Book: {data.tour.name}</h1>

	<BookingFlow
		{adapter}
		slotId={data.slot.id}
		{initialSlot}
		onbooked={() => {
			// Stay on confirmation step (BookingFlow shows it internally)
		}}
		oncancelled={() => goto(`/tours/${data.tour.id}`)}
	/>

	<!-- TODO: Stripe Connect onboarding — integrate payment once guide has completed onboarding -->
</section>
