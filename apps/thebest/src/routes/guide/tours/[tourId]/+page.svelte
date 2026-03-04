<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<section>
	<h1>{data.tour.name}</h1>
	<p>{data.tour.description}</p>

	<dl>
		<dt>Duration</dt>
		<dd>{data.tour.duration} minutes</dd>

		<dt>Capacity</dt>
		<dd>{data.tour.minCapacity}–{data.tour.maxCapacity} participants</dd>

		<dt>Status</dt>
		<dd>{data.tour.status}</dd>
	</dl>

	<h2>Upcoming slots</h2>

	{#if data.slots.length === 0}
		<p>No persisted slots in the next 3 months.</p>
	{:else}
		<ul>
			{#each data.slots as slot (slot.id)}
				<li>
					{slot.startTime.toLocaleString()} — {slot.status}
					({slot.bookedSpots}/{slot.availableSpots} booked)
				</li>
			{/each}
		</ul>
	{/if}
</section>
