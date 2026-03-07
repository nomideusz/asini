<script lang="ts">
  import type { PageData } from "./$types.js";
  import { BookingFlow } from "@nomideusz/svelte-scheduler";
  import { createFetchAdapter } from "$lib/fetch-adapter.js";
  import { goto } from "$app/navigation";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;

  const adapter = createFetchAdapter();

  // Rehydrate the slot with Date objects for BookingFlow's initialSlot
  let initialSlot = $derived({
    ...data.slot,
    startTime: new Date(data.slot.startTime),
    endTime: new Date(data.slot.endTime),
  });
</script>

<section class="max-w-xl mx-auto px-4 py-8">
  <!-- Breadcrumb -->
  <div class="flex items-center gap-1 text-xs mb-6" style="color: var(--asini-text-3);">
    <a href="/" class="hover:underline" style="color: var(--asini-accent);">{t("breadcrumb_home")}</a>
    <span>/</span>
    <a href="/tours" class="hover:underline" style="color: var(--asini-accent);">{t("breadcrumb_tours")}</a>
    <span>/</span>
    <a href="/tours/{data.tour.id}" class="hover:underline" style="color: var(--asini-accent);">{data.tour.name}</a>
    <span>/</span>
    <span class="font-medium" style="color: var(--asini-text);">{t("breadcrumb_book")}</span>
  </div>

  <h1 class="text-2xl font-bold mb-6">
    {t("book_heading", { tourName: data.tour.name })}
  </h1>

  <BookingFlow
    {adapter}
    slotId={data.slot.id}
    {initialSlot}
    onbooked={async (booking) => {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      if (res.ok) {
        const { checkoutUrl } = await res.json();
        window.location.href = checkoutUrl;
      }
    }}
    oncancelled={() => goto(`/tours/${data.tour.id}`)}
  />
</section>
