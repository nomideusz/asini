<script lang="ts">
  import type { PageData } from "./$types.js";
  import { StripeConnectStatus } from "@nomideusz/svelte-payments";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-8">{t("settings_title")}</h1>

  <!-- Public Profile Link -->
  {#if data.guideId}
    <div class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface) p-5 mb-6" style="box-shadow: var(--asini-shadow);">
      <h2 class="text-base font-semibold">{t("settings_profile")}</h2>
      <p class="text-sm mt-1" style="color: var(--asini-text-3);">{t("settings_profile_desc")}</p>
      <a
        href="/guides/{data.guideId}"
        class="asini-btn asini-btn-sm w-fit mt-2"
        target="_blank"
      >
        {t("settings_view_profile")} →
      </a>
    </div>
  {/if}

  <!-- Avatar -->
  <div class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface) p-5 mb-6" style="box-shadow: var(--asini-shadow);">
    <h2 class="text-base font-semibold">{t("settings_avatar")}</h2>
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
        class="asini-input file:mr-3 file:border-0 file:bg-(--asini-surface) file:text-sm file:font-medium max-w-xs"
      />
      <button type="submit" class="asini-btn asini-btn-primary w-fit"
        >{t("settings_upload_avatar")}</button
      >
    </form>
  </div>

  <!-- Stripe Connect -->
  <div class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface) p-5 mb-6" style="box-shadow: var(--asini-shadow);">
    <h2 class="text-base font-semibold">{t("settings_stripe")}</h2>
    <StripeConnectStatus
      connected={data.stripeConnected}
      onboardingHref="/api/stripe/connect"
    />
  </div>
</div>
