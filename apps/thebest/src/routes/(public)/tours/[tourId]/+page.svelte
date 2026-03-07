<script lang="ts">
  import type { PageData } from "./$types.js";
  import { Calendar } from "@nomideusz/svelte-calendar";
  import type { TimelineEvent } from "@nomideusz/svelte-calendar";
  import { toCalendarAdapter } from "@nomideusz/svelte-scheduler";
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

<section class="max-w-5xl mx-auto px-4 py-6">
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

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Main content -->
    <div class="lg:col-span-2 space-y-6">
      {#if data.tour.images.length > 0}
        <img
          src={data.tour.images[0]}
          alt={data.tour.name}
          class="w-full aspect-video object-cover rounded-(--asini-radius)"
        />
      {/if}

      <div class="space-y-2">
        <h1 class="text-xl font-semibold tracking-tight">
          {data.tour.name}
        </h1>
        {#if data.tour.description}
          <p class="text-sm leading-relaxed max-w-2xl" style="color: var(--asini-text-2);">
            {data.tour.description}
          </p>
        {/if}
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style="color: var(--asini-text-2);">
        <span>{data.tour.duration} min</span>
        <span style="color: var(--asini-text-3);">&middot;</span>
        <span>{t("tour_group_up_to", { capacity: data.tour.capacity })}</span>
        {#if data.tour.location}
          <span style="color: var(--asini-text-3);">&middot;</span>
          <span>{data.tour.location}</span>
        {/if}
        {#if data.tour.languages.length > 0}
          <span style="color: var(--asini-text-3);">&middot;</span>
          <span>{data.tour.languages.map(l => l.toUpperCase()).join(", ")}</span>
        {/if}
      </div>

      {#if data.tour.languages.length > 0}
        <div>
          <h3 class="text-xs font-mono uppercase tracking-wide mb-2" style="color: var(--asini-text-3);">{t("tour_languages")}</h3>
          <div class="flex flex-wrap gap-1.5">
            {#each data.tour.languages as lang}
              <span class="asini-badge text-[11px]">{lang.toUpperCase()}</span>
            {/each}
          </div>
        </div>
      {/if}

      <div class="grid sm:grid-cols-2 gap-6">
        {#if data.tour.includedItems.length > 0}
          <div>
            <h3 class="text-xs font-mono uppercase tracking-wide mb-2" style="color: var(--asini-text-3);">{t("tour_included")}</h3>
            <ul class="space-y-1.5">
              {#each data.tour.includedItems as item}
                <li class="flex items-start gap-2 text-sm" style="color: var(--asini-text-2);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5" style="color: var(--asini-success);"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>{item}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if data.tour.requirements.length > 0}
          <div>
            <h3 class="text-xs font-mono uppercase tracking-wide mb-2" style="color: var(--asini-text-3);">{t("tour_requirements")}</h3>
            <ul class="space-y-1.5">
              {#each data.tour.requirements as req}
                <li class="flex items-start gap-2 text-sm" style="color: var(--asini-text-2);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5" style="color: var(--asini-warning);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>{req}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </div>

    <!-- Sidebar: pricing + calendar -->
    <div>
      <div
        class="rounded-(--asini-radius) border border-(--asini-border) p-4 sticky top-20 bg-(--asini-bg)"
        style="box-shadow: var(--asini-shadow);"
      >
        <p class="text-xs font-mono uppercase tracking-wide mb-1" style="color: var(--asini-text-3);">
          {t("tour_per_person")}
        </p>
        <div class="text-lg font-semibold mb-4">
          {formatPrice(data.tour.pricing)}
        </div>

        {#if data.tour.location}
          <div class="flex items-center gap-2 text-sm mb-3" style="color: var(--asini-text-2);">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {data.tour.location}
          </div>
        {/if}

        {#if data.tour.categories.length > 0}
          <div class="flex flex-wrap gap-1.5 mb-4">
            {#each data.tour.categories as cat}
              <span class="asini-badge text-[11px]">{cat}</span>
            {/each}
          </div>
        {/if}

        <p class="text-xs font-mono uppercase tracking-wide mb-2" style="color: var(--asini-text-3);">
          {t("tour_available_dates")}
        </p>
        <div class="rounded-(--asini-radius) border border-(--asini-border) overflow-hidden mb-2" style="--dt-sans: 'Geist Sans', system-ui, sans-serif; --dt-mono: 'Geist Mono', monospace;">
          <Calendar
            view="day-agenda"
            adapter={calendarAdapter}
            height="auto"
            readOnly
            showNavigation
            showDates
            oneventclick={handleEventClick}
          />
        </div>
        <p class="text-xs text-center" style="color: var(--asini-text-3);">
          {t("tour_click_to_book")}
        </p>
      </div>
    </div>
  </div>
</section>
