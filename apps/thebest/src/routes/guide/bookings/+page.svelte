<script lang="ts">
	import type { PageData } from './$types.js';
	let { data }: { data: PageData } = $props();

	function tourName(tourId: string) {
		return data.tours.find((t) => t.id === tourId)?.name ?? tourId;
	}
	function statusBadge(status: string) {
		const map: Record<string, string> = {
			confirmed: 'badge-success',
			pending: 'badge-warning',
			cancelled: 'badge-error',
			completed: 'badge-ghost',
		};
		return map[status] ?? 'badge-neutral';
	}
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
	<h1 class="text-2xl font-bold mb-6">Bookings</h1>

	{#if data.bookings.length === 0}
		<div class="text-base-content/50">No bookings yet.</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table table-zebra">
				<thead>
					<tr>
						<th>Reference</th>
						<th>Tour</th>
						<th>Guest</th>
						<th>Date booked</th>
						<th>Participants</th>
						<th>Amount</th>
						<th>Status</th>
						<th>Payment</th>
					</tr>
				</thead>
				<tbody>
					{#each data.bookings as b}
						<tr>
							<td class="font-mono text-sm">{b.bookingReference}</td>
							<td>{tourName(b.tourId)}</td>
							<td>
								<div>{b.guestName}</div>
								<div class="text-xs text-base-content/60">{b.guestEmail}</div>
							</td>
							<td class="text-sm">{new Date(b.createdAt).toLocaleDateString()}</td>
							<td>{b.participants}</td>
							<td>{(b.totalAmount / 100).toFixed(2)} {b.currency}</td>
							<td><span class="badge {statusBadge(b.status)}">{b.status}</span></td>
							<td><span class="badge badge-outline">{b.paymentStatus}</span></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
