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
      confirmed: "badge-success",
      pending: "badge-warning",
      cancelled: "badge-error",
      completed: "badge-ghost",
    };
    return map[status] ?? "badge-neutral";
  }
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-6">{t("guide_bookings_title")}</h1>

  {#if data.bookings.length === 0}
    <div class="text-base-content/50">{t("guide_bookings_empty")}</div>
  {:else}
    <div class="overflow-x-auto">
      <table class="table table-zebra">
        <thead>
          <tr>
            <th>{t("guide_bookings_col_reference")}</th>
            <th>{t("guide_bookings_col_tour")}</th>
            <th>{t("guide_bookings_col_guest")}</th>
            <th>{t("guide_bookings_col_date")}</th>
            <th>{t("guide_bookings_col_participants")}</th>
            <th>{t("guide_bookings_col_amount")}</th>
            <th>{t("guide_bookings_col_status")}</th>
            <th>{t("guide_bookings_col_payment")}</th>
          </tr>
        </thead>
        <tbody>
          {#each data.bookings as b}
            <tr>
              <td class="font-mono text-sm">{b.bookingReference}</td>
              <td>{tourName(b.tourId)}</td>
              <td>
                <div>{b.guestName}</div>
                <div class="text-xs text-base-content/60">{b.guestEmail}</div>
              </td>
              <td class="text-sm"
                >{new Date(b.createdAt).toLocaleDateString()}</td
              >
              <td>{b.participants}</td>
              <td>{(b.totalAmount / 100).toFixed(2)} {b.currency}</td>
              <td
                ><span class="badge {statusBadge(b.status)}">{b.status}</span
                ></td
              >
              <td><span class="badge badge-outline">{b.paymentStatus}</span></td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
