<script lang="ts">
  import type { PageData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;

  function formatPrice(pricing: {
    basePrice: number;
    currency: string;
    model: string;
  }) {
    if (pricing.model === "private_tour") return t("tour_private");
    if (pricing.basePrice === 0) return t("tour_free");
    return `${pricing.basePrice} ${pricing.currency}`;
  }
</script>

<svelte:head>
  <title>{data.guide.name} — thebest.travel</title>
  <meta
    name="description"
    content="Tour guide {data.guide.name} on thebest.travel"
  />
</svelte:head>

<section class="max-w-5xl mx-auto px-6 py-12 min-h-[calc(100vh-80px)]">
  <!-- Guide info -->
  <div
    class="flex flex-col md:flex-row items-center md:items-start gap-8 mb-16 bg-(--asini-bg) p-8 rounded-(--asini-radius) border border-(--asini-border)"
    style="box-shadow: var(--asini-shadow-sm);"
  >
    <div class="relative group">
      <div
        class="absolute inset-0 rounded-full blur-xl transition-colors duration-500"
        style="background: color-mix(in oklch, var(--asini-accent) 20%, transparent);"
      ></div>
      {#if data.guide.avatar}
        <img
          src="/api/images/avatars/{data.guide.id}/thumb_{data.guide.avatar}"
          alt={data.guide.name}
          width="128"
          height="128"
          class="relative rounded-full object-cover w-32 h-32 border-4 shadow-md"
          style="border-color: var(--asini-bg);"
        />
      {:else}
        <div
          class="relative w-32 h-32 rounded-full bg-(--asini-surface) flex items-center justify-center text-4xl font-bold border-4 shadow-md"
          style="color: var(--asini-text-3); border-color: var(--asini-bg);"
        >
          {data.guide.name.charAt(0).toUpperCase()}
        </div>
      {/if}
    </div>
    <div class="text-center md:text-left pt-2">
      <h1 class="text-4xl font-bold tracking-tight mb-2" style="color: var(--asini-text);">{data.guide.name}</h1>
      <p
        class="text-base font-medium flex items-center justify-center md:justify-start gap-2"
        style="color: var(--asini-text-3);"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="opacity-70"
          ><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle
            cx="9"
            cy="7"
            r="4"
          ></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path
            d="M16 3.13a4 4 0 0 1 0 7.75"
          ></path></svg
        >
        {t("guide_profile_member_since")}
        {new Date(data.guide.createdAt).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  </div>

  <!-- Tours -->
  <div class="flex items-center justify-between mb-8">
    <h2 class="text-2xl font-bold tracking-tight" style="color: var(--asini-text);">
      {t("guide_profile_tours")}
    </h2>
    <span
      class="asini-badge"
      >{data.tours.length}</span
    >
  </div>

  {#if data.tours.length === 0}
    <div
      class="py-16 text-center rounded-(--asini-radius) border border-(--asini-border)"
      style="background: color-mix(in oklch, var(--asini-bg) 50%, transparent);"
    >
      <p class="text-lg font-medium" style="color: var(--asini-text-3);">
        {t("guide_profile_no_tours")}
      </p>
    </div>
  {:else}
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.tours as tour}
        <a
          href="/tours/{tour.id}"
          class="flex flex-col bg-(--asini-bg) rounded-(--asini-radius) overflow-hidden border border-(--asini-border) hover:-translate-y-1 transition-all duration-300 group"
          style="box-shadow: var(--asini-shadow);"
        >
          {#if tour.images && tour.images.length > 0}
            <div class="relative w-full aspect-4/3 overflow-hidden">
              <img
                src="/api/images/tours/{tour.id}/thumb_{tour.images[0]}"
                alt={tour.name}
                class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div
                class="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"
              ></div>
              <div
                class="absolute bottom-4 left-4 right-4 flex justify-between items-end"
              >
                <span
                  class="asini-badge border-0 bg-white/20 backdrop-blur-md text-white font-medium px-2 py-1 select-none"
                >
                  {tour.duration} min
                </span>
              </div>
            </div>
          {:else}
            <div
              class="w-full aspect-4/3 bg-(--asini-surface) flex items-center justify-center"
              style="color: var(--asini-text-3);"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><rect width="18" height="18" x="3" y="3" rx="2" ry="2"
                ></rect><circle cx="9" cy="9" r="2"></circle><path
                  d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
                ></path></svg
              >
            </div>
          {/if}
          <div class="p-6 flex-1 flex flex-col">
            <h3
              class="text-xl font-bold tracking-tight mb-2 transition-colors"
              style="color: var(--asini-text);"
            >
              {tour.name}
            </h3>
            <p class="text-sm line-clamp-2 mb-4 flex-1" style="color: var(--asini-text-3);">
              {tour.description || "No description"}
            </p>
            <div
              class="flex flex-wrap items-center justify-between pt-4 border-t border-(--asini-border) gap-y-2"
            >
              <div
                class="text-sm font-medium flex items-center gap-1"
                style="color: var(--asini-text-2);"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="opacity-70"
                  ><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                  ></path><circle cx="9" cy="7" r="4"></circle><path
                    d="M22 21v-2a4 4 0 0 0-3-3.87"
                  ></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg
                >
                Up to {tour.maxCapacity}
              </div>
              <div class="font-bold text-lg" style="color: var(--asini-accent);">
                {formatPrice(tour.pricing)}
              </div>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>
