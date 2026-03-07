<script lang="ts">
	import type { PageData } from './$types.js';
	import { QrCode } from '@nomideusz/svelte-qr';
	let { data }: { data: PageData } = $props();
</script>

<section class="max-w-xl mx-auto px-4 py-12 text-center">
	<div class="text-5xl mb-4">✓</div>
	<h1 class="text-2xl font-bold mb-2">Booking Confirmed!</h1>
	<p class="text-base-content/70 mb-6">
		Thank you for booking <strong>{data.tour?.name}</strong>.
		A confirmation email has been sent to <strong>{data.booking.guestEmail}</strong>.
	</p>
	<div class="stats shadow mb-6">
		<div class="stat">
			<div class="stat-title">Reference</div>
			<div class="stat-value text-lg">{data.booking.bookingReference}</div>
		</div>
	</div>
	<div class="flex flex-col items-center gap-2 mb-6">
		<p class="text-sm text-base-content/60">Show this QR code at your tour</p>
		<QrCode
			data={data.verifyUrl}
			size={200}
			errorCorrection="M"
			label="Booking QR code for {data.booking.bookingReference}"
		/>
	</div>
	<a href="/tours" class="btn btn-outline">Browse more tours</a>
</section>
