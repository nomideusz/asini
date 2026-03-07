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
  <h1 class="text-2xl font-bold mb-6">{t("cancel_title")}</h1>

  <div class="card bg-base-200 mb-6">
    <div class="card-body gap-1">
      <p>{t("cancel_tour", { tourName: data.tour?.name ?? "" })}</p>
      <p>
        {t("cancel_reference", { reference: data.booking.bookingReference })}
      </p>
      <p>{t("cancel_participants", { count: data.booking.participants })}</p>
      <p>
        {t("cancel_amount_paid", {
          amount: formatMoney(data.booking.totalAmount, data.booking.currency),
        })}
      </p>
      {#if data.refundAmount > 0}
        <div class="alert alert-info mt-2">
          <span
            >{t("cancel_refund", {
              amount: formatMoney(data.refundAmount, data.booking.currency),
            })}</span
          >
        </div>
      {:else}
        <div class="alert alert-warning mt-2">
          <span>{t("cancel_no_refund")}</span>
        </div>
      {/if}
    </div>
  </div>

  <form method="POST" action="?/cancel">
    <button type="submit" class="btn btn-error">{t("cancel_confirm")}</button>
    <a href="/tours" class="btn btn-ghost ml-2">{t("cancel_keep")}</a>
  </form>
</section>
