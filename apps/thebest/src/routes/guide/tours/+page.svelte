<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<section>
	<h1>My Tours</h1>

	{#if data.tours.length === 0}
		<p>No tours yet. Create your first tour to get started.</p>
	{:else}
		<ul>
			{#each data.tours as tour (tour.id)}
				<li>
					<a href="/guide/tours/{tour.id}">{tour.name}</a>
					<span>{tour.status}</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>
