<script lang="ts">
  import type { ActionData, PageData } from "./$types.js";
  import { Calendar } from "@nomideusz/svelte-calendar";
  import type { TimelineEvent } from "@nomideusz/svelte-calendar";
  import { toCalendarAdapter } from "@nomideusz/svelte-scheduler";
  import { createFetchAdapter } from "$lib/fetch-adapter.js";
  import { i18n } from "$lib/i18n.js";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const t = i18n.t;

  let activeTab = $state<
    "overview" | "pricing" | "schedule" | "policy" | "photos"
  >("overview");
  let editing = $state(false);

  // Take a non-reactive copy of initial data to suppress Svelte 5 warnings
  const initTour = data.tour;

  // Pricing form state
  let pricingModel = $state(initTour.pricing.model);
  let categoryRows = $state(
    initTour.pricing.participantCategories?.map((c) => ({
      label: c.label,
      price: String(c.price),
    })) ?? [
      { label: "Adult", price: "20" },
      { label: "Child", price: "10" },
    ],
  );
  let tierRows = $state(
    initTour.pricing.groupPricingTiers?.map((t) => ({
      min: String(t.minParticipants),
      max: String(t.maxParticipants),
      price: String(t.price),
    })) ?? [
      { min: "1", max: "4", price: "100" },
      { min: "5", max: "10", price: "180" },
    ],
  );

  // Schedule form state
  let schedulePattern = $state(initTour.scheduleRules?.[0]?.pattern ?? "once");
  let cancellationPolicy = $state(
    initTour.cancellationPolicy?.id ?? "flexible",
  );

  const DAYS = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 7, label: "Sun" },
  ];

  // Calendar adapter for slot preview
  const schedulerAdapter = createFetchAdapter();
  const calendarAdapter = $derived(
    toCalendarAdapter(schedulerAdapter, data.tour.id),
  );

  function formatSlotTime(slot: {
    startTime: Date | string;
    endTime: Date | string;
  }) {
    const start =
      slot.startTime instanceof Date
        ? slot.startTime
        : new Date(slot.startTime);
    const end =
      slot.endTime instanceof Date ? slot.endTime : new Date(slot.endTime);
    const dateStr = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeStr = `${start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
    return `${dateStr}, ${timeStr}`;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);
</script>

<section class="max-w-5xl mx-auto p-4 md:p-8 min-h-full">
  <!-- Header -->
  <div
    class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-(--asini-bg) rounded-(--asini-radius) border border-(--asini-border) p-6"
    style="box-shadow: var(--asini-shadow);"
  >
    <div>
      <a
        href="/guide/tours"
        class="text-sm font-medium flex items-center gap-1 transition-colors hover:opacity-80"
        style="color: var(--asini-text-3);"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          /></svg
        >
        Back to tours
      </a>
      <h1 class="text-3xl font-bold tracking-tight mt-2" style="color: var(--asini-text);">{data.tour.name}</h1>
    </div>
    <div class="flex flex-wrap gap-2 items-center">
      {#if data.tour.status === "active"}
        <span
          class="asini-badge px-2.5 py-1 text-sm bg-green-50 text-green-700 border-green-200"
        >
          {data.tour.status}
        </span>
      {:else}
        <span
          class="asini-badge px-2.5 py-1 text-sm"
        >
          {data.tour.status}
        </span>
      {/if}
      {#if data.tour.isPublic}
        <span class="asini-badge px-2.5 py-1 text-sm bg-blue-50 text-blue-700 border-blue-200">Public</span>
      {:else}
        <span class="asini-badge px-2.5 py-1 text-sm bg-amber-50 text-amber-700 border-amber-200"
          >Private</span
        >
      {/if}
      <form method="POST" action="?/togglePublic">
        {#if data.tour.isPublic}
          <button
            type="submit"
            class="asini-btn asini-btn-sm"
            style="background: var(--asini-warning); color: #fff; border-color: transparent;"
            >Unpublish</button
          >
        {:else}
          <button
            type="submit"
            class="asini-btn asini-btn-sm"
            style="background: var(--asini-success); color: #fff; border-color: transparent;"
            >Publish</button
          >
        {/if}
      </form>
      {#if data.tour.isPublic}
        <a
          href="/tours/{data.tour.id}"
          class="asini-btn asini-btn-sm"
          target="_blank"
          >View Live <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
            ></path><polyline points="15 3 21 3 21 9"></polyline><line
              x1="10"
              y1="14"
              x2="21"
              y2="3"
            ></line></svg
          ></a
        >
      {/if}
    </div>
  </div>

  <!-- Feedback alerts -->
  {#if form?.error}
    <div class="flex items-center gap-2 px-3 py-2 text-sm rounded-(--asini-radius) bg-red-50 text-red-700 border border-red-200 mb-6">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        /></svg
      >
      <span>{form.error}</span>
    </div>
  {/if}
  {#if form?.success}
    <div
      class="flex items-center gap-2 px-3 py-2 text-sm rounded-(--asini-radius) bg-green-50 text-green-700 border border-green-200 mb-6"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        /></svg
      >
      <span>Updated successfully.</span>
    </div>
  {/if}
  {#if form?.slotAdded}
    <div
      class="flex items-center gap-2 px-3 py-2 text-sm rounded-(--asini-radius) bg-green-50 text-green-700 border border-green-200 mb-6"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        /></svg
      >
      <span>Time slot added.</span>
    </div>
  {/if}
  {#if form?.published !== undefined}
    <div class="flex items-center gap-2 px-3 py-2 text-sm rounded-(--asini-radius) bg-green-50 text-green-700 border border-green-200 mb-4">
      <span>{form.published ? "Tour published!" : "Tour unpublished."}</span>
    </div>
  {/if}

  <!-- Tabs -->
  <div
    class="inline-flex items-center gap-0.5 p-1 rounded-(--asini-radius) bg-(--asini-surface) border border-(--asini-border) mb-8"
  >
    <button
      role="tab"
      class="px-3 py-1.5 text-xs font-medium rounded-(--asini-radius-sm) cursor-pointer transition-colors {activeTab === 'overview' ? 'shadow-sm bg-(--asini-bg)' : ''}"
      style="color: {activeTab === 'overview' ? 'var(--asini-text)' : 'var(--asini-text-2)'};"
      onclick={() => (activeTab = "overview")}>Overview</button
    >
    <button
      role="tab"
      class="px-3 py-1.5 text-xs font-medium rounded-(--asini-radius-sm) cursor-pointer transition-colors {activeTab === 'pricing' ? 'shadow-sm bg-(--asini-bg)' : ''}"
      style="color: {activeTab === 'pricing' ? 'var(--asini-text)' : 'var(--asini-text-2)'};"
      onclick={() => (activeTab = "pricing")}>Pricing</button
    >
    <button
      role="tab"
      class="px-3 py-1.5 text-xs font-medium rounded-(--asini-radius-sm) cursor-pointer transition-colors {activeTab === 'schedule' ? 'shadow-sm bg-(--asini-bg)' : ''}"
      style="color: {activeTab === 'schedule' ? 'var(--asini-text)' : 'var(--asini-text-2)'};"
      onclick={() => (activeTab = "schedule")}>Schedule</button
    >
    <button
      role="tab"
      class="px-3 py-1.5 text-xs font-medium rounded-(--asini-radius-sm) cursor-pointer transition-colors {activeTab === 'policy' ? 'shadow-sm bg-(--asini-bg)' : ''}"
      style="color: {activeTab === 'policy' ? 'var(--asini-text)' : 'var(--asini-text-2)'};"
      onclick={() => (activeTab = "policy")}>Cancellation</button
    >
    <button
      role="tab"
      class="px-3 py-1.5 text-xs font-medium rounded-(--asini-radius-sm) cursor-pointer transition-colors {activeTab === 'photos' ? 'shadow-sm bg-(--asini-bg)' : ''}"
      style="color: {activeTab === 'photos' ? 'var(--asini-text)' : 'var(--asini-text-2)'};"
      onclick={() => (activeTab = "photos")}>Photos</button
    >
  </div>

  <!-- ═══ Overview ═══ -->
  {#if activeTab === "overview"}
    <div class="flex justify-end mb-4">
      <button
        class="asini-btn asini-btn-sm"
        onclick={() => (editing = !editing)}
      >
        {editing ? "Cancel" : "Edit"}
      </button>
    </div>

    {#if editing}
      <form method="POST" action="?/update" class="space-y-6">
        <fieldset
          class="space-y-3 bg-(--asini-bg) rounded-(--asini-radius) border border-(--asini-border) p-6"
          style="box-shadow: var(--asini-shadow);"
        >
          <legend class="text-xs font-medium uppercase tracking-wide mb-3" style="color: var(--asini-text-2);">Tour Details</legend>

          <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={data.tour.name}
            class="asini-input w-full"
          />

          <label class="text-xs font-medium mt-3" style="color: var(--asini-text-2);" for="description"
            >Description</label
          >
          <textarea
            id="description"
            name="description"
            class="asini-input w-full"
            rows="3">{data.tour.description}</textarea
          >

          <label class="text-xs font-medium mt-3" style="color: var(--asini-text-2);" for="location">Location</label>
          <input
            id="location"
            name="location"
            type="text"
            value={data.tour.location ?? ""}
            class="asini-input w-full"
            placeholder="e.g. Warsaw, Old Town"
          />

          <label class="text-xs font-medium mt-3" style="color: var(--asini-text-2);" for="languages"
            >Languages (comma-separated)</label
          >
          <input
            id="languages"
            name="languages"
            type="text"
            value={data.tour.languages.join(", ")}
            class="asini-input w-full"
          />

          <div class="grid grid-cols-3 gap-4 mt-3">
            <div>
              <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="duration">Duration (min)</label
              >
              <input
                id="duration"
                name="duration"
                type="number"
                value={data.tour.duration}
                class="asini-input w-full"
              />
            </div>
            <div>
              <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="minCapacity"
                >Min capacity</label
              >
              <input
                id="minCapacity"
                name="minCapacity"
                type="number"
                value={data.tour.minCapacity}
                class="asini-input w-full"
              />
            </div>
            <div>
              <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="maxCapacity"
                >Max capacity</label
              >
              <input
                id="maxCapacity"
                name="maxCapacity"
                type="number"
                value={data.tour.maxCapacity}
                class="asini-input w-full"
              />
            </div>
          </div>

          <label class="text-xs font-medium mt-3" style="color: var(--asini-text-2);" for="includedItems"
            >Included items (one per line)</label
          >
          <textarea
            id="includedItems"
            name="includedItems"
            class="asini-input w-full"
            rows="3">{(data.tour.includedItems ?? []).join("\n")}</textarea
          >

          <label class="text-xs font-medium mt-3" style="color: var(--asini-text-2);" for="requirements"
            >Requirements (one per line)</label
          >
          <textarea
            id="requirements"
            name="requirements"
            class="asini-input w-full"
            rows="3">{(data.tour.requirements ?? []).join("\n")}</textarea
          >

          <label class="text-xs font-medium mt-3" style="color: var(--asini-text-2);" for="status">Status</label>
          <select
            id="status"
            name="status"
            class="asini-input w-full"
          >
            <option value="draft" selected={data.tour.status === "draft"}
              >Draft</option
            >
            <option value="active" selected={data.tour.status === "active"}
              >Active</option
            >
          </select>
        </fieldset>

        <div class="flex gap-3">
          <button
            type="submit"
            class="asini-btn asini-btn-primary"
            >Save Changes</button
          >
          <button
            type="button"
            class="asini-btn asini-btn-ghost"
            onclick={() => (editing = false)}>Cancel</button
          >
        </div>
      </form>
    {:else}
      <div
        class="bg-(--asini-bg) rounded-(--asini-radius) border border-(--asini-border)"
        style="box-shadow: var(--asini-shadow);"
      >
        <div class="p-6 md:p-8">
          <p class="text-lg leading-relaxed" style="color: var(--asini-text-2);">
            {data.tour.description || "No description"}
          </p>

          <div class="grid grid-cols-2 gap-4 mt-4">
            <div>
              <dt class="text-sm" style="color: var(--asini-text-3);">Duration</dt>
              <dd class="font-medium">{data.tour.duration} min</dd>
            </div>
            <div>
              <dt class="text-sm" style="color: var(--asini-text-3);">Capacity</dt>
              <dd class="font-medium">
                {data.tour.minCapacity}–{data.tour.maxCapacity}
              </dd>
            </div>
            <div>
              <dt class="text-sm" style="color: var(--asini-text-3);">Languages</dt>
              <dd class="font-medium">
                {data.tour.languages.length > 0
                  ? data.tour.languages.join(", ")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt class="text-sm" style="color: var(--asini-text-3);">Location</dt>
              <dd class="font-medium">{data.tour.location ?? "—"}</dd>
            </div>
            <div>
              <dt class="text-sm" style="color: var(--asini-text-3);">Pricing</dt>
              <dd class="font-medium">
                {data.tour.pricing.model} · {data.tour.pricing.basePrice}
                {data.tour.pricing.currency}
              </dd>
            </div>
          </div>

          {#if data.tour.includedItems && data.tour.includedItems.length > 0}
            <h3 class="text-sm font-semibold mt-4" style="color: var(--asini-text-3);">
              Included
            </h3>
            <ul class="list-disc list-inside text-sm">
              {#each data.tour.includedItems as item}<li>{item}</li>{/each}
            </ul>
          {/if}

          {#if data.tour.requirements && data.tour.requirements.length > 0}
            <h3 class="text-sm font-semibold mt-4" style="color: var(--asini-text-3);">
              Requirements
            </h3>
            <ul class="list-disc list-inside text-sm">
              {#each data.tour.requirements as req}<li>{req}</li>{/each}
            </ul>
          {/if}
        </div>
      </div>
    {/if}

    <!-- ═══ Pricing ═══ -->
  {:else if activeTab === "pricing"}
    <form method="POST" action="?/updatePricing" class="space-y-6">
      <fieldset
        class="space-y-3 bg-(--asini-bg) rounded-(--asini-radius) border border-(--asini-border) p-6"
        style="box-shadow: var(--asini-shadow);"
      >
        <legend class="text-xs font-medium uppercase tracking-wide mb-3" style="color: var(--asini-text-2);">Pricing</legend>

        <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="pricingModel">Pricing model</label>
        <select
          id="pricingModel"
          name="pricingModel"
          class="asini-input w-full"
          bind:value={pricingModel}
        >
          <option value="per_person">Per person</option>
          <option value="participant_categories">Participant categories</option>
          <option value="group_tiers">Group tiers</option>
          <option value="private_tour">Private tour</option>
        </select>

        <div class="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="currency">Currency</label>
            <input
              id="currency"
              name="currency"
              type="text"
              value={data.tour.pricing.currency}
              class="asini-input w-full"
            />
          </div>
          {#if pricingModel === "per_person"}
            <div>
              <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="basePrice"
                >Price per person</label
              >
              <input
                id="basePrice"
                name="basePrice"
                type="number"
                step="0.01"
                min="0"
                value={data.tour.pricing.basePrice}
                class="asini-input w-full"
              />
            </div>
          {/if}
        </div>

        {#if pricingModel === "participant_categories"}
          <div class="mt-3 space-y-2">
            <p class="text-sm" style="color: var(--asini-text-3);">Categories and prices:</p>
            {#each categoryRows as row, i}
              <div class="grid grid-cols-3 gap-2 items-end">
                <input
                  name="catLabel"
                  type="text"
                  bind:value={row.label}
                  class="asini-input py-1 text-xs w-full"
                  placeholder="Category"
                />
                <input
                  name="catPrice"
                  type="number"
                  step="0.01"
                  bind:value={row.price}
                  class="asini-input py-1 text-xs w-full"
                  placeholder="Price"
                />
                <button
                  type="button"
                  class="asini-btn asini-btn-ghost asini-btn-sm"
                  onclick={() =>
                    (categoryRows = categoryRows.filter((_, idx) => idx !== i))}
                  >Remove</button
                >
              </div>
            {/each}
            <button
              type="button"
              class="asini-btn asini-btn-ghost asini-btn-sm"
              onclick={() =>
                (categoryRows = [...categoryRows, { label: "", price: "0" }])}
              >+ Add category</button
            >
          </div>
          <input type="hidden" name="basePrice" value="0" />
        {/if}

        {#if pricingModel === "group_tiers"}
          <div class="mt-3 space-y-2">
            <p class="text-sm" style="color: var(--asini-text-3);">Group size tiers:</p>
            {#each tierRows as row, i}
              <div class="grid grid-cols-4 gap-2 items-end">
                <input
                  name="tierMin"
                  type="number"
                  bind:value={row.min}
                  class="asini-input py-1 text-xs w-full"
                  placeholder="Min"
                />
                <input
                  name="tierMax"
                  type="number"
                  bind:value={row.max}
                  class="asini-input py-1 text-xs w-full"
                  placeholder="Max"
                />
                <input
                  name="tierPrice"
                  type="number"
                  step="0.01"
                  bind:value={row.price}
                  class="asini-input py-1 text-xs w-full"
                  placeholder="Price"
                />
                <button
                  type="button"
                  class="asini-btn asini-btn-ghost asini-btn-sm"
                  onclick={() =>
                    (tierRows = tierRows.filter((_, idx) => idx !== i))}
                  >Remove</button
                >
              </div>
            {/each}
            <button
              type="button"
              class="asini-btn asini-btn-ghost asini-btn-sm"
              onclick={() =>
                (tierRows = [...tierRows, { min: "1", max: "1", price: "0" }])}
              >+ Add tier</button
            >
          </div>
          <input type="hidden" name="basePrice" value="0" />
        {/if}

        {#if pricingModel === "private_tour"}
          <div class="mt-3">
            <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="privateFlatPrice"
              >Flat price</label
            >
            <input
              id="privateFlatPrice"
              name="privateFlatPrice"
              type="number"
              step="0.01"
              min="0"
              value={data.tour.pricing.privateTour?.flatPrice ?? 200}
              class="asini-input w-full"
            />
          </div>
          <input type="hidden" name="basePrice" value="0" />
        {/if}
      </fieldset>

      <div
        class="flex items-center gap-2 px-3 py-2 text-sm rounded-(--asini-radius) bg-amber-50 text-amber-700 border border-amber-200 mt-4"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          /></svg
        >
        <span>Changing pricing does not affect existing bookings.</span>
      </div>

      <button
        type="submit"
        class="asini-btn asini-btn-primary mt-4"
        >Save Pricing</button
      >
    </form>

    <!-- ═══ Schedule ═══ -->
  {:else if activeTab === "schedule"}
    <!-- Schedule rules editor -->
    <form method="POST" action="?/updateSchedule" class="space-y-6 mb-12">
      <fieldset
        class="space-y-3 bg-(--asini-bg) rounded-(--asini-radius) border border-(--asini-border) p-6"
        style="box-shadow: var(--asini-shadow);"
      >
        <legend class="text-xs font-medium uppercase tracking-wide mb-3" style="color: var(--asini-text-2);">Schedule Rules</legend>

        <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="schedulePattern">Pattern</label>
        <select
          id="schedulePattern"
          name="schedulePattern"
          class="asini-input w-full"
          bind:value={schedulePattern}
        >
          <option value="once">One-time</option>
          <option value="weekly">Weekly (recurring)</option>
        </select>

        {#if schedulePattern === "weekly"}
          <div class="mt-3">
            <p class="text-xs font-medium" style="color: var(--asini-text-2);">Days of week</p>
            <div class="flex flex-wrap gap-2 mt-1">
              {#each DAYS as day}
                <label class="label cursor-pointer gap-1">
                  <input
                    type="checkbox"
                    name="daysOfWeek"
                    value={day.value}
                    class="size-3.5 accent-(--asini-accent)"
                    checked={data.tour.scheduleRules?.[0]?.daysOfWeek?.includes(
                      day.value,
                    ) ?? false}
                  />
                  <span class="text-sm">{day.label}</span>
                </label>
              {/each}
            </div>
          </div>
        {/if}

        <div class="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="startTime">Start time</label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              value={data.tour.scheduleRules?.[0]?.startTime ?? "09:00"}
              class="asini-input w-full"
            />
          </div>
          <div>
            <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="endTime">End time</label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              value={data.tour.scheduleRules?.[0]?.endTime ?? "10:00"}
              class="asini-input w-full"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="validFrom">Valid from</label>
            <input
              id="validFrom"
              name="validFrom"
              type="date"
              value={data.tour.scheduleRules?.[0]?.validFrom ?? ""}
              class="asini-input w-full"
            />
          </div>
          <div>
            <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="validUntil"
              >Valid until (optional)</label
            >
            <input
              id="validUntil"
              name="validUntil"
              type="date"
              value={data.tour.scheduleRules?.[0]?.validUntil ?? ""}
              class="asini-input w-full"
            />
          </div>
        </div>
        <input type="hidden" name="timezone" value="Europe/Warsaw" />
      </fieldset>
      <button
        type="submit"
        class="asini-btn asini-btn-primary mt-2"
        >Save Schedule</button
      >
    </form>

    <!-- Add manual slot -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xl font-bold tracking-tight" style="color: var(--asini-text);">Add Manual Time Slot</h3>
    </div>
    <form
      method="POST"
      action="?/addSlot"
      class="bg-(--asini-bg) rounded-(--asini-radius) border border-(--asini-border) mb-10 overflow-hidden"
      style="box-shadow: var(--asini-shadow);"
    >
      <div class="p-6">
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="slotDate">Date</label>
            <input
              id="slotDate"
              name="slotDate"
              type="date"
              value={defaultDate}
              class="asini-input w-full"
              required
            />
          </div>
          <div>
            <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="slotStartTime">Start</label>
            <input
              id="slotStartTime"
              name="slotStartTime"
              type="time"
              value="09:00"
              class="asini-input w-full"
              required
            />
          </div>
          <div>
            <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="slotEndTime">End</label>
            <input
              id="slotEndTime"
              name="slotEndTime"
              type="time"
              value="10:00"
              class="asini-input w-full"
              required
            />
          </div>
        </div>
        <button type="submit" class="asini-btn asini-btn-primary asini-btn-sm w-fit mt-3"
          >Add Slot</button
        >
      </div>
    </form>

    <!-- Calendar preview -->
    <h3 class="text-lg font-semibold mb-3" style="color: var(--asini-text);">Calendar Preview</h3>
    <div class="border-(--asini-border) rounded-(--asini-radius) overflow-hidden border mb-6">
      <Calendar
        adapter={calendarAdapter}
        view="week-planner"
        height={500}
        showModePills
        showNavigation
        showDates
        readOnly
      />
    </div>

    <!-- Slot list -->
    <h3 class="text-lg font-semibold mb-3" style="color: var(--asini-text);">
      Upcoming Slots ({data.slots.length})
    </h3>
    {#if data.slots.length === 0}
      <p style="color: var(--asini-text-3);">No upcoming slots.</p>
    {:else}
      <div class="space-y-2">
        {#each data.slots as slot (slot.id)}
          <div
            class="bg-(--asini-bg) rounded-(--asini-radius) border border-(--asini-border) p-4 flex flex-row items-center justify-between"
            style="box-shadow: var(--asini-shadow);"
          >
            <span class="text-sm font-medium">{formatSlotTime(slot)}</span>
            <div class="flex items-center gap-3">
              <span class="text-xs font-semibold" style="color: var(--asini-text-3);"
                >{slot.bookedSpots}/{slot.availableSpots} booked</span
              >
              {#if slot.status === "open"}
                <span class="asini-badge text-[11px] bg-green-50 text-green-700 border-green-200">
                  {slot.status}
                </span>
              {:else if slot.status === "cancelled"}
                <span class="asini-badge text-[11px] bg-red-50 text-red-700 border-red-200">
                  {slot.status}
                </span>
              {:else if slot.status === "full"}
                <span class="asini-badge text-[11px] bg-amber-50 text-amber-700 border-amber-200">
                  {slot.status}
                </span>
              {:else}
                <span class="asini-badge text-[11px]">
                  {slot.status}
                </span>
              {/if}
              {#if slot.isGenerated}
                <span class="asini-badge text-[11px] bg-transparent border-transparent">auto</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- ═══ Cancellation Policy ═══ -->
  {:else if activeTab === "policy"}
    <form method="POST" action="?/updateCancellation" class="space-y-6">
      <fieldset
        class="space-y-3 bg-(--asini-bg) rounded-(--asini-radius) border border-(--asini-border) p-6"
        style="box-shadow: var(--asini-shadow);"
      >
        <legend class="text-xs font-medium uppercase tracking-wide mb-3" style="color: var(--asini-text-2);">Cancellation Policy</legend>

        <select
          name="cancellationPolicy"
          class="asini-input w-full"
          bind:value={cancellationPolicy}
        >
          {#each data.cancellationPolicies as policy}
            <option value={policy.key}
              >{policy.name} — {policy.description}</option
            >
          {/each}
          <option value="custom">Custom</option>
        </select>

        {#if cancellationPolicy === "custom"}
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="customHours"
                >Hours before tour</label
              >
              <input
                id="customHours"
                name="customHours"
                type="number"
                min="0"
                value="24"
                class="asini-input w-full"
              />
            </div>
            <div>
              <label class="text-xs font-medium" style="color: var(--asini-text-2);" for="customRefund"
                >Refund percentage</label
              >
              <input
                id="customRefund"
                name="customRefund"
                type="number"
                min="0"
                max="100"
                value="100"
                class="asini-input w-full"
              />
            </div>
          </div>
        {/if}

        {#if data.tour.cancellationPolicy}
          <div
            class="mt-6 p-4 bg-(--asini-surface) rounded-(--asini-radius) border border-(--asini-border)"
          >
            <p class="font-bold">{data.tour.cancellationPolicy.name}</p>
            <p class="text-sm mt-1" style="color: var(--asini-text-2);">
              {data.tour.cancellationPolicy.description}
            </p>
          </div>
        {/if}
      </fieldset>
      <button type="submit" class="asini-btn asini-btn-primary"
        >Save Policy</button
      >
    </form>

    <!-- ═══ Photos ═══ -->
  {:else if activeTab === "photos"}
    <div
      class="bg-(--asini-bg) rounded-(--asini-radius) border border-(--asini-border) p-6"
      style="box-shadow: var(--asini-shadow);"
    >
      <h3 class="text-xl font-bold tracking-tight mb-4" style="color: var(--asini-text);">Tour Photos</h3>
      {#if data.tour.images && data.tour.images.length > 0}
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
          {#each data.tour.images as filename (filename)}
            <div
              class="relative group aspect-[4/3] rounded-(--asini-radius) overflow-hidden border border-(--asini-border)"
              style="box-shadow: var(--asini-shadow);"
            >
              <img
                src="/api/images/tours/{data.tour.id}/thumb_{filename}"
                alt={data.tour.name}
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <form
                method="POST"
                action="?/deletePhoto"
                class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <input type="hidden" name="filename" value={filename} />
                <button
                  type="submit"
                  class="asini-btn asini-btn-danger asini-btn-sm p-1.5 rounded-full"
                  title="Delete">✕</button
                >
              </form>
            </div>
          {/each}
        </div>
      {:else}
        <div
          class="py-12 flex flex-col items-center justify-center border border-dashed border-(--asini-border) rounded-(--asini-radius) mb-8 bg-(--asini-bg)"
        >
          <p class="font-medium text-lg" style="color: var(--asini-text-3);">
            No photos uploaded yet.
          </p>
          <p class="text-sm mt-1" style="color: var(--asini-text-3); opacity: 0.7;">
            Upload high quality images to attract guests
          </p>
        </div>
      {/if}

      <form
        method="POST"
        action="?/uploadPhoto"
        enctype="multipart/form-data"
        class="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-(--asini-surface) p-4 rounded-(--asini-radius) border border-(--asini-border)"
      >
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          class="asini-input file:mr-3 file:border-0 file:bg-(--asini-surface) file:text-sm file:font-medium w-full max-w-sm"
        />
        <button
          type="submit"
          class="asini-btn asini-btn-primary"
          >Upload Photo</button
        >
      </form>
    </div>
  {/if}
</section>
