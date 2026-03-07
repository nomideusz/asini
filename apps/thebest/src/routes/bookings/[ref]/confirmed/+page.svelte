<script lang="ts">
  import type { PageData } from "./$types.js";
  import { QrCode } from "@nomideusz/svelte-qr";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;
</script>

<section class="max-w-xl mx-auto px-4 py-12 text-center">
  <div class="text-5xl mb-4">✓</div>
  <h1 class="text-2xl font-bold mb-2" style="color: var(--asini-text);">{t("confirmed_title")}</h1>
  <p class="mb-6" style="color: var(--asini-text-2);">
    {t("confirmed_thanks", { tourName: data.tour?.name ?? "" })}
    {t("confirmed_email_sent", { email: data.booking.guestEmail })}
  </p>
  <div class="inline-flex flex-col items-center rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-bg) p-4 mb-6" style="box-shadow: var(--asini-shadow);">
    <div class="text-xs font-medium" style="color: var(--asini-text-2);">{t("confirmed_reference")}</div>
    <div class="text-lg font-semibold font-mono" style="color: var(--asini-text);">{data.booking.bookingReference}</div>
  </div>
  <div class="flex flex-col items-center gap-2 mb-6">
    <p class="text-sm" style="color: var(--asini-text-3);">{t("confirmed_qr_hint")}</p>
    <QrCode
      data={data.verifyUrl}
      size={200}
      errorCorrection="M"
      label="Booking QR code for {data.booking.bookingReference}"
    />
  </div>
  <a href="/tours" class="asini-btn">{t("confirmed_browse_more")}</a>
</section>
