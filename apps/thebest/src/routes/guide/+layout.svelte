<script lang="ts">
	import type { LayoutData } from './$types.js';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<div>
	<header class="flex items-center justify-between border-b px-4 py-3">
		<nav class="flex gap-4">
			<a href="/guide/tours">My Tours</a>
		</nav>
		<div class="flex items-center gap-3">
			<span class="text-sm">{data.user.name}</span>
			<form method="POST" action="/auth/logout">
				<button type="submit" class="btn btn-ghost btn-sm">Log out</button>
			</form>
		</div>
	</header>
	<main>
		{@render children()}
	</main>
</div>
