<script lang="ts">
  import type { PageData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;

  function tourName(tourId: string) {
    return data.tours.find((t) => t.id === tourId)?.name ?? tourId;
  }
  function statusBadge(status: string) {
    const map: Record<string, string> = {
      confirmed: "bg-green-50 text-green-700 border-green-200",
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      cancelled: "bg-red-50 text-red-700 border-red-200",
      completed: "bg-transparent border-transparent",
    };
    return map[status] ?? "";
  }
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-6">{t("guide_bookings_title")}</h1>

  {#if data.bookings.length === 0}
    <div style="color: var(--asini-text-3);">{t("guide_bookings_empty")}</div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-xs font-medium uppercase tracking-wide border-b border-(--asini-border)" style="color: var(--asini-text-3);">
            <th class="text-left py-2 px-3">{t("guide_bookings_col_reference")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_tour")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_guest")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_date")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_participants")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_amount")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_status")}</th>
            <th class="text-left py-2 px-3">{t("guide_bookings_col_payment")}</th>
          </tr>
        </thead>
        <tbody>
          {#each data.bookings as b}
            <tr class="border-b border-(--asini-border) hover:bg-(--asini-bg-subtle)">
              <td class="py-2 px-3" style="font-family: var(--asini-font-mono); font-size: 0.875rem;">{b.bookingReference}</td>
              <td class="py-2 px-3">{tourName(b.tourId)}</td>
              <td class="py-2 px-3">
                <div>{b.guestName}</div>
                <div class="text-xs" style="color: var(--asini-text-3);">{b.guestEmail}</div>
              </td>
              <td class="py-2 px-3 text-sm"
                >{new Date(b.createdAt).toLocaleDateString()}</td
              >
              <td class="py-2 px-3">{b.participants}</td>
              <td class="py-2 px-3">{(b.totalAmount / 100).toFixed(2)} {b.currency}</td>
              <td class="py-2 px-3"
                ><span class="asini-badge {statusBadge(b.status)}">{b.status}</span
                ></td
              >
              <td class="py-2 px-3"><span class="asini-badge">{b.paymentStatus}</span></td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
