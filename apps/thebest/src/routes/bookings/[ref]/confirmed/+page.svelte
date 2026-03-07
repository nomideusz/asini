<script lang="ts">
  import type { PageData } from "./$types.js";
  import { QrCode } from "@nomideusz/svelte-qr";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;
</script>

<section class="max-w-xl mx-auto px-4 py-12 text-center">
  <div class="text-5xl mb-4">✓</div>
  <h1 class="text-2xl font-bold mb-2">{t("confirmed_title")}</h1>
  <p class="text-base-content/70 mb-6">
    {t("confirmed_thanks", { tourName: data.tour?.name ?? "" })}
    {t("confirmed_email_sent", { email: data.booking.guestEmail })}
  </p>
  <div class="stats shadow mb-6">
    <div class="stat">
      <div class="stat-title">{t("confirmed_reference")}</div>
      <div class="stat-value text-lg">{data.booking.bookingReference}</div>
    </div>
  </div>
  <div class="flex flex-col items-center gap-2 mb-6">
    <p class="text-sm text-base-content/60">{t("confirmed_qr_hint")}</p>
    <QrCode
      data={data.verifyUrl}
      size={200}
      errorCorrection="M"
      label="Booking QR code for {data.booking.bookingReference}"
    />
  </div>
  <a href="/tours" class="btn btn-outline">{t("confirmed_browse_more")}</a>
</section>
