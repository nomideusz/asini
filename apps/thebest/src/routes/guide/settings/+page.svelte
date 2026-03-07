<script lang="ts">
  import type { PageData } from "./$types.js";
  import { StripeConnectStatus } from "@nomideusz/svelte-payments";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-8">{t("settings_title")}</h1>

  <div class="card bg-base-200 shadow mb-6">
    <div class="card-body">
      <h2 class="card-title">{t("settings_avatar")}</h2>
      {#if data.avatar && data.guideId}
        <img
          src="/api/images/avatars/{data.guideId}/thumb_{data.avatar}"
          alt="Your avatar"
          width="80"
          height="80"
          style="border-radius:50%;object-fit:cover;"
        />
      {/if}
      <form
        method="POST"
        action="?/uploadAvatar"
        enctype="multipart/form-data"
        class="flex flex-col gap-2 mt-2"
      >
        <input
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          class="file-input file-input-bordered w-full max-w-xs"
        />
        <button type="submit" class="btn btn-primary w-fit"
          >{t("settings_upload_avatar")}</button
        >
      </form>
    </div>
  </div>

  <div class="card bg-base-200 shadow mb-6">
    <div class="card-body">
      <h2 class="card-title">{t("settings_stripe")}</h2>
      <StripeConnectStatus
        connected={data.stripeConnected}
        onboardingHref="/api/stripe/connect"
      />
    </div>
  </div>
</div>
