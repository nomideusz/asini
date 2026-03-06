<script lang="ts">
	import type { PageData } from './$types.js';
	let { data }: { data: PageData } = $props();

	function formatMoney(cents: number, currency: string) {
		return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
	}
</script>

<section class="max-w-xl mx-auto px-4 py-8">
	<h1 class="text-2xl font-bold mb-6">Cancel Booking</h1>

	<div class="card bg-base-200 mb-6">
		<div class="card-body gap-1">
			<p>Tour: <strong>{data.tour?.name}</strong></p>
			<p>Reference: <strong>{data.booking.bookingReference}</strong></p>
			<p>Participants: {data.booking.participants}</p>
			<p>Amount paid: {formatMoney(data.booking.totalAmount, data.booking.currency)}</p>
			{#if data.refundAmount > 0}
				<div class="alert alert-info mt-2">
					<span>Refund: {formatMoney(data.refundAmount, data.booking.currency)}</span>
				</div>
			{:else}
				<div class="alert alert-warning mt-2">
					<span>No refund applies per the cancellation policy.</span>
				</div>
			{/if}
		</div>
	</div>

	<form method="POST" action="?/cancel">
		<button type="submit" class="btn btn-error">Confirm cancellation</button>
		<a href="/tours" class="btn btn-ghost ml-2">Keep my booking</a>
	</form>
</section>
