<script lang="ts">
  import type { PageData } from "./$types.js";
  import { Calendar } from "@nomideusz/svelte-calendar";
  import type { TimelineEvent } from "@nomideusz/svelte-calendar";
  import { toCalendarAdapter } from "@nomideusz/svelte-scheduler";
  import { createFetchAdapter } from "$lib/fetch-adapter.js";
  import { goto } from "$app/navigation";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;

  const schedulerAdapter = createFetchAdapter();

  // Use the first tour for now — in future, could aggregate across all tours
  const primaryTourId = $derived(
    data.tours.find((t) => t.status === "active")?.id ?? data.tours[0]?.id,
  );
  const calendarAdapter = $derived(
    primaryTourId
      ? toCalendarAdapter(schedulerAdapter, primaryTourId)
      : undefined,
  );

  function handleEventClick(event: TimelineEvent) {
    const slotId = event.data?.slotId as string | undefined;
    if (slotId) {
      goto(`/guide/tours/${event.data?.tourId ?? primaryTourId}`);
    }
  }
</script>

<div class="p-6 md:p-8 max-w-6xl mx-auto min-h-full">
  <div class="flex items-center justify-between mb-8">
    <h1 class="text-3xl font-bold tracking-tight">{t("guide_dashboard")}</h1>
    <div class="flex flex-wrap gap-2 justify-end">
      {#each data.tours as tour}
        <span
          class="asini-badge px-2.5 py-1 text-sm border-0"
          class:bg-green-50={tour.status === "active"}
          class:text-green-700={tour.status === "active"}
          class:bg-amber-50={tour.status === "draft"}
          class:text-amber-700={tour.status === "draft"}
          style="box-shadow: var(--asini-shadow-sm);"
        >
          {tour.name}
        </span>
      {/each}
    </div>
  </div>

  {#if data.tours.length === 0}
    <div
      class="flex flex-col items-center justify-center min-h-[40vh] rounded-3xl p-12 text-center bg-(--asini-bg) border"
      style="box-shadow: 0 2px 20px -8px rgba(0,0,0,0.1); border-color: color-mix(in oklch, var(--asini-border) 60%, transparent);"
    >
      <div
        class="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style="background: color-mix(in oklch, var(--asini-accent) 10%, transparent); color: var(--asini-accent);"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </div>
      <p class="text-lg max-w-md" style="color: var(--asini-text-2);">
        {t("guide_dashboard_no_tours")}
      </p>
      <a
        href="/guide/tours/new"
        class="asini-btn asini-btn-primary asini-btn-lg mt-6 rounded-full px-8"
        style="box-shadow: var(--asini-shadow-sm);"
        >{t("guide_create_first_tour")}</a
      >
    </div>
  {:else if calendarAdapter}
    <div
      class="rounded-[1.5rem] bg-(--asini-bg) p-2 overflow-hidden mb-4 border"
      style="box-shadow: 0 2px 20px -8px rgba(0,0,0,0.1); border-color: color-mix(in oklch, var(--asini-border) 60%, transparent);"
    >
      <div class="rounded-[1.25rem] overflow-hidden">
        <Calendar
          adapter={calendarAdapter}
          view="week-planner"
          height={650}
          showModePills
          showNavigation
          showDates
          readOnly
          oneventclick={handleEventClick}
        />
      </div>
    </div>
    <p class="text-sm font-medium text-center" style="color: var(--asini-text-3);">
      {t("guide_dashboard_click_slot")}
    </p>
  {:else}
    <div
      class="flex flex-col items-center justify-center min-h-[40vh] rounded-3xl p-12 text-center bg-(--asini-bg) border"
      style="box-shadow: 0 2px 20px -8px rgba(0,0,0,0.1); border-color: color-mix(in oklch, var(--asini-border) 60%, transparent);"
    >
      <p class="text-lg" style="color: var(--asini-text-2);">
        No active tours to display on calendar.
      </p>
    </div>
  {/if}
</div>
