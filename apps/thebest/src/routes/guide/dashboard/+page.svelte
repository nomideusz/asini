<script lang="ts">
  import type { PageData } from "./$types.js";
  import { Calendar, createCompositeAdapter } from "@nomideusz/svelte-calendar";
  import type { TimelineEvent } from "@nomideusz/svelte-calendar";
  import { toCalendarAdapter } from "@nomideusz/svelte-scheduler";
  import { createFetchAdapter } from "$lib/fetch-adapter.js";
  import { goto } from "$app/navigation";
  import { i18n } from "$lib/i18n.js";
  import { onMount } from "svelte";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;

  const schedulerAdapter = createFetchAdapter();

  // Build a composite calendar adapter merging all active tours
  const calendarAdapter = $derived.by(() => {
    const activeTours = data.tours.filter((t) => t.status === "active");
    if (activeTours.length === 0) return undefined;

    const adapters = activeTours.map((tour) =>
      toCalendarAdapter(schedulerAdapter, tour.id),
    );

    return adapters.length === 1
      ? adapters[0]
      : createCompositeAdapter(adapters);
  });

  function handleEventClick(event: TimelineEvent) {
    const tourId = event.data?.tourId as string | undefined;
    if (tourId) {
      goto(`/guide/tours/${tourId}`);
    }
  }

  // Measure container height for full-viewport calendar
  let containerEl: HTMLDivElement | undefined = $state();
  let calHeight = $state(600);

  onMount(() => {
    if (containerEl) {
      calHeight = containerEl.clientHeight;
      const ro = new ResizeObserver(([entry]) => {
        calHeight = entry.contentRect.height;
      });
      ro.observe(containerEl);
      return () => ro.disconnect();
    }
  });
</script>

<div class="p-2 md:p-3 min-h-full flex flex-col">
  {#if data.tours.length === 0}
    <div
      class="flex flex-col items-center justify-center flex-1 rounded-(--asini-radius) p-12 text-center bg-(--asini-bg) border border-(--asini-border)"
      style="box-shadow: var(--asini-shadow);"
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
      >{t("guide_create_first_tour")}</a>
    </div>
  {:else if calendarAdapter}
    <div
      bind:this={containerEl}
      class="flex-1 min-h-0 rounded-(--asini-radius) overflow-hidden border border-(--asini-border)"
      style="--dt-sans: 'Geist Sans', system-ui, sans-serif; --dt-mono: 'Geist Mono', monospace;"
    >
      <Calendar
        adapter={calendarAdapter}
        view="week-planner"
        height={calHeight}
        showModePills
        showNavigation
        showDates
        readOnly
        oneventclick={handleEventClick}
      />
    </div>
  {:else}
    <div
      class="flex flex-col items-center justify-center flex-1 rounded-(--asini-radius) p-12 text-center bg-(--asini-bg) border border-(--asini-border)"
      style="box-shadow: var(--asini-shadow);"
    >
      <p class="text-lg" style="color: var(--asini-text-2);">
        {t("guide_dashboard_no_active")}
      </p>
    </div>
  {/if}
</div>
