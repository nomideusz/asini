<script lang="ts">
  import type { ActionData, PageData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const t = i18n.t;

  let search = $state('');
  let statusFilter = $state<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  let expandedId = $state<string | null>(null);
  let cancellingId = $state<string | null>(null);

  let filteredBookings = $derived(
    data.bookings.filter((b) => {
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      if (!matchesStatus) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        b.guestName.toLowerCase().includes(q) ||
        b.guestEmail.toLowerCase().includes(q) ||
        b.bookingReference.toLowerCase().includes(q)
      );
    })
  );

  function tourName(tourId: string) {
    return data.tours.find((t) => t.id === tourId)?.name ?? tourId;
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      confirmed: "asini-badge-success",
      pending: "asini-badge-warning",
      cancelled: "asini-badge-danger",
      completed: "bg-transparent border-transparent",
    };
    return map[status] ?? "";
  }

  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
    if (expandedId !== null) cancellingId = null;
  }

  function toggleCancel(id: string) {
    cancellingId = cancellingId === id ? null : id;
  }
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-6">{t("guide_bookings_title")}</h1>

  {#if form?.cancelled}
    <div class="asini-alert asini-alert-success mb-4 text-sm">
      {t("guide_bookings_cancelled_success")}
    </div>
  {/if}

  {#if form?.error}
    <div class="asini-alert asini-alert-danger mb-4 text-sm">
      {form.error}
    </div>
  {/if}

  {#if data.bookings.length === 0}
    <div style="color: var(--asini-text-3);">{t("guide_bookings_empty")}</div>
  {:else}
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
      <input
        type="text"
        class="asini-input max-w-xs"
        placeholder={t("guide_bookings_search")}
        bind:value={search}
      />
      <div class="inline-flex items-center gap-0.5 p-1 rounded-(--asini-radius) bg-(--asini-surface) border border-(--asini-border)">
        {#each ['all', 'confirmed', 'pending', 'cancelled'] as filter}
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-medium rounded-(--asini-radius-sm) cursor-pointer transition-colors"
            class:shadow-sm={statusFilter === filter}
            style="background: {statusFilter === filter ? 'var(--asini-bg)' : 'transparent'}; color: {statusFilter === filter ? 'var(--asini-text)' : 'var(--asini-text-2)'};"
            onclick={() => statusFilter = filter as 'all' | 'confirmed' | 'pending' | 'cancelled'}
          >
            {t(`guide_bookings_filter_${filter}`)}
          </button>
        {/each}
      </div>
    </div>

    {#if filteredBookings.length === 0}
      <div class="rounded-(--asini-radius) border border-(--asini-border) bg-(--asini-surface) p-5 text-center" style="color: var(--asini-text-3);">
        {t("guide_bookings_empty_filter")}
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs font-medium uppercase tracking-wide border-b border-(--asini-border)" style="color: var(--asini-text-3);">
              <th class="text-left py-2 px-3">{t("guide_bookings_col_reference")}</th>
              <th class="text-left py-2 px-3">{t("guide_bookings_col_tour")}</th>
              <th class="text-left py-2 px-3">{t("guide_bookings_col_guest")}</th>
              <th class="text-left py-2 px-3">{t("guide_bookings_col_participants")}</th>
              <th class="text-left py-2 px-3">{t("guide_bookings_col_amount")}</th>
              <th class="text-left py-2 px-3">{t("guide_bookings_col_status")}</th>
              <th class="text-left py-2 px-3">{t("guide_bookings_col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredBookings as b (b.id)}
              <tr class="border-b border-(--asini-border) hover:bg-(--asini-bg-subtle)">
                <td class="py-2 px-3" style="font-family: var(--asini-font-mono); font-size: 0.875rem;">{b.bookingReference}</td>
                <td class="py-2 px-3">{tourName(b.tourId)}</td>
                <td class="py-2 px-3">
                  <div>{b.guestName}</div>
                  <div class="text-xs" style="color: var(--asini-text-3);">{b.guestEmail}</div>
                </td>
                <td class="py-2 px-3">{b.participants}</td>
                <td class="py-2 px-3">{(b.totalAmount / 100).toFixed(2)} {b.currency}</td>
                <td class="py-2 px-3">
                  <span class="asini-badge {statusBadge(b.status)}">{b.status}</span>
                </td>
                <td class="py-2 px-3">
                  <div class="flex items-center gap-1">
                    <!-- View details -->
                    <button
                      type="button"
                      class="asini-btn asini-btn-ghost asini-btn-sm p-1"
                      title={t("guide_bookings_view")}
                      onclick={() => toggleExpand(b.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <!-- Contact guest -->
                    <a
                      href="mailto:{b.guestEmail}?subject=Booking {b.bookingReference}"
                      class="asini-btn asini-btn-ghost asini-btn-sm p-1"
                      title={t("guide_bookings_contact")}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    </a>
                    <!-- Cancel booking -->
                    {#if b.status !== 'cancelled' && b.status !== 'completed'}
                      <button
                        type="button"
                        class="asini-btn asini-btn-ghost asini-btn-sm p-1 text-red-500 hover:text-red-700"
                        title={t("guide_bookings_cancel")}
                        onclick={() => toggleCancel(b.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>

              <!-- Expanded detail row -->
              {#if expandedId === b.id}
                <tr class="bg-(--asini-surface)">
                  <td colspan="7" class="px-3 py-4">
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div class="text-xs font-medium uppercase" style="color: var(--asini-text-3);">{t("guide_bookings_booked_at")}</div>
                        <div class="mt-1">{new Date(b.createdAt).toLocaleString()}</div>
                      </div>
                      <div>
                        <div class="text-xs font-medium uppercase" style="color: var(--asini-text-3);">{t("guide_bookings_col_payment")}</div>
                        <div class="mt-1"><span class="asini-badge">{b.paymentStatus}</span></div>
                      </div>
                      <div>
                        <div class="text-xs font-medium uppercase" style="color: var(--asini-text-3);">Phone</div>
                        <div class="mt-1">{b.guestPhone ?? '—'}</div>
                      </div>
                      <div>
                        <div class="text-xs font-medium uppercase" style="color: var(--asini-text-3);">{t("guide_bookings_special_requests")}</div>
                        <div class="mt-1">{b.specialRequests ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              {/if}

              <!-- Cancel confirmation row -->
              {#if cancellingId === b.id}
                <tr style="background: color-mix(in oklch, var(--asini-danger) 5%, var(--asini-bg));">
                  <td colspan="7" class="px-3 py-3">
                    <div class="flex items-center gap-3 text-sm">
                      <span>{t("guide_bookings_cancel_confirm", { ref: b.bookingReference })}</span>
                      <form method="POST" action="?/cancelBooking" class="inline-flex items-center gap-2">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button type="submit" class="asini-btn asini-btn-danger asini-btn-sm">
                          {t("guide_bookings_cancel_yes")}
                        </button>
                      </form>
                      <button
                        type="button"
                        class="asini-btn asini-btn-ghost asini-btn-sm"
                        onclick={() => cancellingId = null}
                      >
                        {t("guide_bookings_cancel_no")}
                      </button>
                    </div>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>
