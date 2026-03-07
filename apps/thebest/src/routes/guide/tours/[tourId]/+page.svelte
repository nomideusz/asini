<script lang="ts">
  import type { ActionData, PageData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const t = i18n.t;

  let editing = $state(false);

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

  // Default date for new slot = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);
</script>

<section class="p-6 max-w-3xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <div>
      <a
        href="/guide/tours"
        class="text-sm text-base-content/60 hover:text-base-content"
        >&larr; Back to tours</a
      >
      <h1 class="text-2xl font-bold mt-1">{data.tour.name}</h1>
    </div>
    <div class="flex gap-2">
      <span
        class="badge"
        class:badge-success={data.tour.status === "active"}
        class:badge-ghost={data.tour.status === "draft"}
      >
        {data.tour.status}
      </span>
      {#if data.tour.isPublic}
        <span class="badge badge-info">Public</span>
      {:else}
        <span class="badge badge-warning">Private</span>
      {/if}
      <button
        class="btn btn-sm btn-outline"
        onclick={() => (editing = !editing)}
      >
        {editing ? "Cancel" : "Edit"}
      </button>
    </div>
  </div>

  {#if form?.error}
    <div class="alert alert-error mb-4">
      <span>{form.error}</span>
    </div>
  {/if}

  {#if form?.success}
    <div class="alert alert-success mb-4">
      <span>Tour updated successfully.</span>
    </div>
  {/if}

  {#if form?.slotAdded}
    <div class="alert alert-success mb-4">
      <span>Time slot added successfully.</span>
    </div>
  {/if}

  {#if form?.published !== undefined}
    <div class="alert alert-success mb-4">
      <span>{form.published ? "Tour published!" : "Tour unpublished."}</span>
    </div>
  {/if}

  <!-- Publish / Unpublish -->
  <div class="flex gap-3 mb-6">
    <form method="POST" action="?/togglePublic">
      {#if data.tour.isPublic}
        <button type="submit" class="btn btn-warning btn-sm">Unpublish</button>
      {:else}
        <button type="submit" class="btn btn-success btn-sm"
          >Publish Tour</button
        >
      {/if}
    </form>
    {#if data.tour.isPublic}
      <a
        href="/tours/{data.tour.id}"
        class="btn btn-ghost btn-sm"
        target="_blank">View public page →</a
      >
    {/if}
  </div>

  {#if editing}
    <form method="POST" action="?/update" class="space-y-4">
      <fieldset
        class="fieldset bg-base-200 border-base-300 rounded-box border p-4"
      >
        <legend class="fieldset-legend">Edit Tour</legend>

        <label class="fieldset-label" for="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={data.tour.name}
          class="input input-bordered w-full"
        />

        <label class="fieldset-label mt-3" for="description">Description</label>
        <textarea
          id="description"
          name="description"
          class="textarea textarea-bordered w-full"
          rows="3">{data.tour.description}</textarea
        >

        <label class="fieldset-label mt-3" for="location">Location</label>
        <input
          id="location"
          name="location"
          type="text"
          value={data.tour.location ?? ""}
          class="input input-bordered w-full"
          placeholder="e.g. Warsaw, Old Town"
        />

        <label class="fieldset-label mt-3" for="languages"
          >Languages (comma-separated)</label
        >
        <input
          id="languages"
          name="languages"
          type="text"
          value={data.tour.languages.join(", ")}
          class="input input-bordered w-full"
          placeholder="en, pl, de"
        />

        <div class="grid grid-cols-3 gap-4 mt-3">
          <div>
            <label class="fieldset-label" for="duration">Duration (min)</label>
            <input
              id="duration"
              name="duration"
              type="number"
              value={data.tour.duration}
              class="input input-bordered w-full"
            />
          </div>
          <div>
            <label class="fieldset-label" for="minCapacity">Min capacity</label>
            <input
              id="minCapacity"
              name="minCapacity"
              type="number"
              value={data.tour.minCapacity}
              class="input input-bordered w-full"
            />
          </div>
          <div>
            <label class="fieldset-label" for="maxCapacity">Max capacity</label>
            <input
              id="maxCapacity"
              name="maxCapacity"
              type="number"
              value={data.tour.maxCapacity}
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <label class="fieldset-label mt-3" for="status">Status</label>
        <select id="status" name="status" class="select select-bordered w-full">
          <option value="draft" selected={data.tour.status === "draft"}
            >Draft</option
          >
          <option value="active" selected={data.tour.status === "active"}
            >Active</option
          >
        </select>
      </fieldset>

      <div class="flex gap-3">
        <button type="submit" class="btn btn-primary">Save Changes</button>
        <button
          type="button"
          class="btn btn-ghost"
          onclick={() => (editing = false)}>Cancel</button
        >
      </div>
    </form>
  {:else}
    <div class="card bg-base-200">
      <div class="card-body">
        <p class="text-base-content/80">
          {data.tour.description || "No description"}
        </p>

        <div class="grid grid-cols-2 gap-4 mt-4">
          <div>
            <dt class="text-sm text-base-content/50">Duration</dt>
            <dd class="font-medium">{data.tour.duration} minutes</dd>
          </div>
          <div>
            <dt class="text-sm text-base-content/50">Capacity</dt>
            <dd class="font-medium">
              {data.tour.minCapacity}–{data.tour.maxCapacity} participants
            </dd>
          </div>
          <div>
            <dt class="text-sm text-base-content/50">Languages</dt>
            <dd class="font-medium">
              {data.tour.languages.length > 0
                ? data.tour.languages.join(", ")
                : "Not set"}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-base-content/50">Location</dt>
            <dd class="font-medium">{data.tour.location ?? "Not set"}</dd>
          </div>
          <div>
            <dt class="text-sm text-base-content/50">Pricing</dt>
            <dd class="font-medium">
              {data.tour.pricing.model} &middot; {data.tour.pricing.basePrice}
              {data.tour.pricing.currency}
            </dd>
          </div>
        </div>

        {#if data.tour.scheduleRules && data.tour.scheduleRules.length > 0}
          <h3 class="text-sm font-semibold mt-4 text-base-content/50">
            Schedule Rules
          </h3>
          <div class="space-y-1 mt-1">
            {#each data.tour.scheduleRules as rule}
              <div class="badge badge-outline badge-sm">
                {rule.pattern}
                {#if rule.pattern === "weekly" && rule.daysOfWeek}
                  — days: {rule.daysOfWeek.join(", ")}
                {/if}
                {rule.startTime}–{rule.endTime}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Add Time Slot -->
    <h2 class="text-lg font-semibold mt-8 mb-4">Add Time Slot</h2>

    <form method="POST" action="?/addSlot" class="card bg-base-200 mb-6">
      <div class="card-body py-4">
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="fieldset-label" for="slotDate">Date</label>
            <input
              id="slotDate"
              name="slotDate"
              type="date"
              value={defaultDate}
              class="input input-bordered w-full"
              required
            />
          </div>
          <div>
            <label class="fieldset-label" for="slotStartTime">Start time</label>
            <input
              id="slotStartTime"
              name="slotStartTime"
              type="time"
              value="09:00"
              class="input input-bordered w-full"
              required
            />
          </div>
          <div>
            <label class="fieldset-label" for="slotEndTime">End time</label>
            <input
              id="slotEndTime"
              name="slotEndTime"
              type="time"
              value="10:00"
              class="input input-bordered w-full"
              required
            />
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-sm w-fit mt-3"
          >Add Slot</button
        >
      </div>
    </form>

    <!-- Upcoming Slots -->
    <h2 class="text-lg font-semibold mt-4 mb-4">Upcoming Slots</h2>

    {#if data.slots.length === 0}
      <p class="text-base-content/60">
        No upcoming slots. Add a time slot above or configure schedule rules
        when creating a tour.
      </p>
    {:else}
      <div class="space-y-2">
        {#each data.slots as slot (slot.id)}
          <div class="card bg-base-200">
            <div class="card-body py-3 flex-row items-center justify-between">
              <span>{formatSlotTime(slot)}</span>
              <div class="flex items-center gap-2">
                <span class="text-sm"
                  >{slot.bookedSpots}/{slot.availableSpots} booked</span
                >
                <span
                  class="badge badge-sm"
                  class:badge-success={slot.status === "open"}
                  class:badge-error={slot.status === "cancelled"}
                  class:badge-warning={slot.status === "full"}
                >
                  {slot.status}
                </span>
                {#if slot.isGenerated}
                  <span class="badge badge-xs badge-ghost">generated</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Tour Photos -->
    <h2 class="text-lg font-semibold mt-8 mb-4">Tour Photos</h2>

    {#if data.tour.images && data.tour.images.length > 0}
      <div class="flex flex-wrap gap-3 mb-4">
        {#each data.tour.images as filename (filename)}
          <div class="relative">
            <img
              src="/api/images/tours/{data.tour.id}/thumb_{filename}"
              alt="Tour photo thumbnail"
              width="120"
              height="90"
              class="rounded-box object-cover w-[120px] h-[90px]"
            />
            <form
              method="POST"
              action="?/deletePhoto"
              class="absolute top-1 right-1"
            >
              <input type="hidden" name="filename" value={filename} />
              <button
                type="submit"
                class="btn btn-xs btn-error btn-circle"
                title="Delete photo">✕</button
              >
            </form>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-base-content/60 mb-4">No photos yet.</p>
    {/if}

    <form
      method="POST"
      action="?/uploadPhoto"
      enctype="multipart/form-data"
      class="flex flex-col gap-2"
    >
      <input
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp"
        class="file-input file-input-bordered w-full max-w-xs"
      />
      <button type="submit" class="btn btn-primary w-fit">Upload Photo</button>
    </form>
  {/if}
</section>
