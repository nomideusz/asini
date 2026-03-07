<script lang="ts">
  import type { PageData } from "./$types.js";
  import { Calendar } from "@nomideusz/svelte-calendar";
  import type { TimelineEvent } from "@nomideusz/svelte-calendar";
  import { toCalendarAdapter } from "@nomideusz/svelte-scheduler";
  import { QrCode } from "@nomideusz/svelte-qr";
  import { createFetchAdapter } from "$lib/fetch-adapter.js";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;

  const schedulerAdapter = createFetchAdapter();
  let calendarAdapter = $derived(
    toCalendarAdapter(schedulerAdapter, data.tour.id),
  );

  function handleEventClick(event: TimelineEvent) {
    const slotId = event.data?.slotId as string | undefined;
    if (slotId) {
      goto(`/book/${slotId}`);
    }
  }

  function formatPrice(pricing: {
    model: string;
    currency: string;
    basePrice?: number;
  }): string {
    if (pricing.basePrice != null) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: pricing.currency,
      }).format(pricing.basePrice / 100);
    }
    return t("tours_contact_pricing");
  }
</script>

<svelte:head>
  <title>{data.tour.name} | thebest.travel</title>
  <meta name="description" content={data.tour.description} />
</svelte:head>

<section class="max-w-5xl mx-auto px-4 py-8">
  <!-- Breadcrumb -->
  <div class="breadcrumbs text-sm mb-6">
    <ul>
      <li><a href="/">{t("breadcrumb_home")}</a></li>
      <li><a href="/tours">{t("breadcrumb_tours")}</a></li>
      <li>{data.tour.name}</li>
    </ul>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Main content -->
    <div class="lg:col-span-2 space-y-6">
      {#if data.tour.images.length > 0}
        <img
          src={data.tour.images[0]}
          alt={data.tour.name}
          class="w-full h-64 object-cover rounded-lg"
        />
      {/if}

      <h1 class="text-3xl font-bold">{data.tour.name}</h1>

      {#if data.tour.description}
        <p class="text-base-content/80 leading-relaxed">
          {data.tour.description}
        </p>
      {/if}

      <!-- Tour details -->
      <div class="grid grid-cols-2 gap-4">
        <div class="stat bg-base-200 rounded-lg p-4">
          <div class="stat-title text-xs">{t("tour_duration")}</div>
          <div class="stat-value text-lg">{data.tour.duration} min</div>
        </div>
        <div class="stat bg-base-200 rounded-lg p-4">
          <div class="stat-title text-xs">{t("tour_group_size")}</div>
          <div class="stat-value text-lg">
            {t("tour_group_up_to", { capacity: data.tour.capacity })}
          </div>
        </div>
      </div>

      {#if data.tour.languages.length > 0}
        <div>
          <h3 class="font-semibold mb-2">{t("tour_languages")}</h3>
          <div class="flex gap-2">
            {#each data.tour.languages as lang}
              <span class="badge badge-primary badge-outline"
                >{lang.toUpperCase()}</span
              >
            {/each}
          </div>
        </div>
      {/if}

      {#if data.tour.includedItems.length > 0}
        <div>
          <h3 class="font-semibold mb-2">{t("tour_included")}</h3>
          <ul class="list-disc list-inside text-base-content/80 space-y-1">
            {#each data.tour.includedItems as item}
              <li>{item}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if data.tour.requirements.length > 0}
        <div>
          <h3 class="font-semibold mb-2">{t("tour_requirements")}</h3>
          <ul class="list-disc list-inside text-base-content/80 space-y-1">
            {#each data.tour.requirements as req}
              <li>{req}</li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    <!-- Sidebar: pricing + calendar -->
    <div class="space-y-6">
      <div class="card bg-base-100 shadow border border-base-200 p-6">
        <div class="text-2xl font-bold text-primary mb-1">
          {formatPrice(data.tour.pricing)}
        </div>
        <p class="text-sm text-base-content/60 mb-4">{t("tour_per_person")}</p>

        {#if data.tour.location}
          <div
            class="flex items-center gap-2 text-sm text-base-content/70 mb-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {data.tour.location}
          </div>
        {/if}

        {#if data.tour.categories.length > 0}
          <div class="flex flex-wrap gap-1 mb-4">
            {#each data.tour.categories as cat}
              <span class="badge badge-sm">{cat}</span>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Calendar -->
      <div class="card bg-base-100 shadow border border-base-200 p-4">
        <h3 class="font-semibold mb-3">{t("tour_available_dates")}</h3>
        <Calendar
          view="week-agenda"
          adapter={calendarAdapter}
          height="auto"
          readOnly
          showNavigation
          showDates
          oneventclick={handleEventClick}
        />
        <p class="text-xs text-base-content/50 mt-2">
          {t("tour_click_to_book")}
        </p>
      </div>
    </div>
  </div>

  <!-- Share QR -->
  <div
    class="card bg-base-100 shadow border border-base-200 p-6 mt-8 text-center"
  >
    <h3 class="font-semibold mb-3">Share this tour</h3>
    <div class="flex justify-center">
      <QrCode
        data={`${typeof window !== "undefined" ? window.location.origin : ""}/tours/${data.tour.id}`}
        size={160}
        errorCorrection="M"
        label="QR code for {data.tour.name}"
      />
    </div>
    <p class="text-xs text-base-content/50 mt-2">
      Scan to view this tour on your phone
    </p>
  </div>
</section>
