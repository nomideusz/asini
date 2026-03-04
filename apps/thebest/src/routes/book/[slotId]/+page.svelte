<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<section>
	<h1>Book: {data.tour.name}</h1>

	<dl>
		<dt>Date</dt>
		<dd>{data.slot.startTime.toLocaleString()}</dd>

		<dt>Available spots</dt>
		<dd>{data.slot.availableSpots - data.slot.bookedSpots}</dd>
	</dl>

	<!-- TODO: auth flow — integrate BookingFlow component once auth is implemented -->
	<p>Booking form coming soon.</p>

	<!-- TODO: Stripe Connect onboarding — integrate payment once guide has completed onboarding -->
</section>
