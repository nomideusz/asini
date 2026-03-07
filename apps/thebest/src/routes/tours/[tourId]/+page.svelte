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

<section class="max-w-6xl mx-auto px-4 md:px-8 py-8 min-h-screen">
  <!-- Breadcrumb -->
  <div class="flex items-center gap-1 text-xs mb-6" style="color: var(--asini-text-3);">
    <a href="/" class="hover:underline" style="color: var(--asini-accent);"
      >{t("breadcrumb_home")}</a
    >
    <span>/</span>
    <a href="/tours" class="hover:underline" style="color: var(--asini-accent);"
      >{t("breadcrumb_tours")}</a
    >
    <span>/</span>
    <span class="font-medium" style="color: var(--asini-text);">{data.tour.name}</span>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
    <!-- Main content -->
    <div class="lg:col-span-8 space-y-10">
      {#if data.tour.images.length > 0}
        <div
          class="relative w-full aspect-21/9 rounded-4xl overflow-hidden"
          style="box-shadow: var(--asini-shadow-sm);"
        >
          <img
            src={data.tour.images[0]}
            alt={data.tour.name}
            class="w-full h-full object-cover transition-transform duration-1000 hover:scale-105"
          />
        </div>
      {/if}

      <div class="space-y-4">
        <h1
          class="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight"
        >
          {data.tour.name}
        </h1>
        {#if data.tour.description}
          <p
            class="text-lg leading-relaxed font-medium max-w-3xl"
            style="color: var(--asini-text-2);"
          >
            {data.tour.description}
          </p>
        {/if}
      </div>

      <!-- Tour details -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="rounded-2xl p-5 border border-(--asini-border)" style="background: color-mix(in oklch, var(--asini-surface) 50%, transparent);">
          <div
            class="text-sm font-medium mb-1 flex items-center gap-2"
            style="color: var(--asini-text-3);"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><circle cx="12" cy="12" r="10"></circle><polyline
                points="12 6 12 12 16 14"
              ></polyline></svg
            >
            {t("tour_duration")}
          </div>
          <div class="text-xl font-bold">{data.tour.duration} min</div>
        </div>
        <div class="rounded-2xl p-5 border border-(--asini-border)" style="background: color-mix(in oklch, var(--asini-surface) 50%, transparent);">
          <div
            class="text-sm font-medium mb-1 flex items-center gap-2"
            style="color: var(--asini-text-3);"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
              ></path><circle cx="9" cy="7" r="4"></circle><path
                d="M22 21v-2a4 4 0 0 0-3-3.87"
              ></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg
            >
            {t("tour_group_size")}
          </div>
          <div class="text-xl font-bold">
            {t("tour_group_up_to", { capacity: data.tour.capacity })}
          </div>
        </div>
      </div>

      {#if data.tour.languages.length > 0}
        <div>
          <h3 class="text-xl font-bold mb-4">{t("tour_languages")}</h3>
          <div class="flex flex-wrap gap-2">
            {#each data.tour.languages as lang}
              <span
                class="asini-badge py-1 text-sm border-0 font-bold px-4"
                style="background: color-mix(in oklch, var(--asini-accent) 10%, transparent); color: var(--asini-accent);"
                >{lang.toUpperCase()}</span
              >
            {/each}
          </div>
        </div>
      {/if}

      <div
        class="grid sm:grid-cols-2 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-(--asini-border) border-t border-(--asini-border) pt-8 mt-8"
      >
        {#if data.tour.includedItems.length > 0}
          <div class="pt-4 sm:pt-0 sm:pr-8">
            <h3 class="text-xl font-bold mb-4">{t("tour_included")}</h3>
            <ul class="space-y-3">
              {#each data.tour.includedItems as item}
                <li class="flex items-start gap-3" style="color: var(--asini-text-2);">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="shrink-0 mt-0.5"
                    style="color: var(--asini-success);"
                    ><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                    ></path><polyline points="22 4 12 14.01 9 11.01"
                    ></polyline></svg
                  >
                  <span>{item}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if data.tour.requirements.length > 0}
          <div class="pt-8 sm:pt-0 sm:pl-8">
            <h3 class="text-xl font-bold mb-4">{t("tour_requirements")}</h3>
            <ul class="space-y-3">
              {#each data.tour.requirements as req}
                <li class="flex items-start gap-3" style="color: var(--asini-text-2);">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="shrink-0 mt-0.5"
                    style="color: var(--asini-warning);"
                    ><circle cx="12" cy="12" r="10"></circle><line
                      x1="12"
                      y1="8"
                      x2="12"
                      y2="12"
                    ></line><line x1="12" y1="16" x2="12.01" y2="16"
                    ></line></svg
                  >
                  <span>{req}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </div>

    <!-- Sidebar: pricing + calendar -->
    <div class="lg:col-span-4 space-y-6">
      <div
        class="rounded-4xl p-8 sticky top-24 bg-(--asini-bg) border"
        style="box-shadow: 0 8px 30px rgb(0 0 0 / 0.04); border-color: color-mix(in oklch, var(--asini-border) 60%, transparent);"
      >
        <div class="text-3xl font-black tracking-tight mb-1">
          {formatPrice(data.tour.pricing)}
        </div>
        <p class="text-base font-medium mb-6" style="color: var(--asini-text-3);">
          {t("tour_per_person")}
        </p>

        {#if data.tour.location}
          <div
            class="flex items-center gap-2 text-sm mb-4"
            style="color: var(--asini-text-2);"
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
          <div class="flex flex-wrap gap-2 mb-6">
            {#each data.tour.categories as cat}
              <span class="asini-badge px-2.5 py-1 text-sm border-0 bg-(--asini-surface)">{cat}</span>
            {/each}
          </div>
        {/if}

        <!-- Calendar -->
        <h3 class="font-bold text-xl mb-4">{t("tour_available_dates")}</h3>
        <div class="rounded-2xl border border-(--asini-border) overflow-hidden mb-3">
          <Calendar
            view="week-agenda"
            adapter={calendarAdapter}
            height="auto"
            readOnly
            showNavigation
            showDates
            oneventclick={handleEventClick}
          />
        </div>
        <p class="text-sm font-medium text-center" style="color: var(--asini-text-3);">
          {t("tour_click_to_book")}
        </p>

        <!-- Share QR -->
        <div class="mt-10 pt-8 border-t border-(--asini-border) text-center">
          <h3 class="font-bold text-lg mb-4">Share this tour</h3>
          <div
            class="flex justify-center bg-(--asini-surface) p-6 rounded-2xl w-max mx-auto"
          >
            <QrCode
              data={`${typeof window !== "undefined" ? window.location.origin : ""}/tours/${data.tour.id}`}
              size={120}
              errorCorrection="M"
              label="QR code for {data.tour.name}"
            />
          </div>
          <p class="text-xs font-medium mt-4" style="color: var(--asini-text-3);">
            Scan to view this tour on your phone
          </p>
        </div>
      </div>
    </div>
  </div>
</section>
