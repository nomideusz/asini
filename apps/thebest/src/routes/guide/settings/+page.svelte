<script lang="ts">
  import type { PageData } from './$types.js';
  import { StripeConnectStatus } from '@nomideusz/svelte-payments';
  let { data }: { data: PageData } = $props();
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-8">Settings</h1>

  <div class="card bg-base-200 shadow mb-6">
    <div class="card-body">
      <h2 class="card-title">Stripe Payments</h2>
      <StripeConnectStatus
        connected={data.stripeConnected}
        onboardingHref="/api/stripe/connect"
      />
    </div>
  </div>
</div>
