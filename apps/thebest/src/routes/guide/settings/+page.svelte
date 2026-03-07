<script lang="ts">
  import type { PageData } from './$types.js';
  import { StripeConnectStatus } from '@nomideusz/svelte-payments';
  let { data }: { data: PageData } = $props();
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-8">Settings</h1>

  <div class="card bg-base-200 shadow mb-6">
    <div class="card-body">
      <h2 class="card-title">Profile Avatar</h2>
      {#if data.avatar && data.guideId}
        <img
          src="/api/images/avatars/{data.guideId}/thumb_{data.avatar}"
          alt="Your avatar"
          width="80"
          height="80"
          style="border-radius:50%;object-fit:cover;"
        />
      {/if}
      <form method="POST" action="?/uploadAvatar" enctype="multipart/form-data" class="flex flex-col gap-2 mt-2">
        <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" class="file-input file-input-bordered w-full max-w-xs" />
        <button type="submit" class="btn btn-primary w-fit">Upload Avatar</button>
      </form>
    </div>
  </div>

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
