<script lang="ts">
  import type { PageData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;

  function formatMoney(cents: number, currency: string) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(cents / 100);
  }
</script>

<section class="max-w-xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-6" style="color: var(--asini-text);">{t("cancel_title")}</h1>

  <div class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface) p-6 mb-6">
    <div class="flex flex-col gap-1">
      <p style="color: var(--asini-text);">{t("cancel_tour", { tourName: data.tour?.name ?? "" })}</p>
      <p style="color: var(--asini-text);">
        {t("cancel_reference", { reference: data.booking.bookingReference })}
      </p>
      <p style="color: var(--asini-text);">{t("cancel_participants", { count: data.booking.participants })}</p>
      <p style="color: var(--asini-text);">
        {t("cancel_amount_paid", {
          amount: formatMoney(data.booking.totalAmount, data.booking.currency),
        })}
      </p>
      {#if data.refundAmount > 0}
        <div class="asini-alert asini-alert-info mt-2">
          <span
            >{t("cancel_refund", {
              amount: formatMoney(data.refundAmount, data.booking.currency),
            })}</span
          >
        </div>
      {:else}
        <div class="asini-alert asini-alert-warning mt-2">
          <span>{t("cancel_no_refund")}</span>
        </div>
      {/if}
    </div>
  </div>

  <form method="POST" action="?/cancel">
    <button type="submit" class="asini-btn asini-btn-danger">{t("cancel_confirm")}</button>
    <a href="/tours" class="asini-btn asini-btn-ghost ml-2">{t("cancel_keep")}</a>
  </form>
</section>
