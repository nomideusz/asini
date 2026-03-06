<script lang="ts">
	import type { PageData } from './$types.js';
	let { data }: { data: PageData } = $props();
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
	<h1 class="text-2xl font-bold mb-8">Settings</h1>

	<div class="card bg-base-200 shadow mb-6">
		<div class="card-body">
			<h2 class="card-title">Stripe Payments</h2>
			{#if data.stripeConnected}
				<div class="alert alert-success">
					<span>Your Stripe account is connected. You can receive payments.</span>
				</div>
			{:else}
				<p class="text-base-content/70 mb-4">
					Connect your Stripe account to receive payments from tourists.
					You'll be redirected to Stripe to complete the setup.
				</p>
				<a href="/api/stripe/connect" class="btn btn-primary w-fit">
					Connect with Stripe
				</a>
			{/if}
		</div>
	</div>
</div>
