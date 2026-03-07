<script lang="ts">
  import type { PageData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let { data }: { data: PageData } = $props();
  const t = i18n.t;

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
  <title>{t("tours_page_title")}</title>
  <meta name="description" content={t("tours_page_meta")} />
</svelte:head>

<section class="max-w-6xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-2">{t("tours_heading")}</h1>
  <p class="mb-8" style="color: var(--asini-text-2);">{t("tours_subtitle")}</p>

  {#if data.tours.length === 0}
    <div class="rounded-(--asini-radius) bg-(--asini-surface) p-12 text-center">
      <p class="text-lg" style="color: var(--asini-text-3);">{t("tours_empty")}</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each data.tours as tour (tour.id)}
        <a
          href="/tours/{tour.id}"
          class="rounded-(--asini-radius) bg-(--asini-bg) border border-(--asini-border) hover:shadow-md transition-shadow"
          style="box-shadow: var(--asini-shadow-sm);"
        >
          {#if tour.images.length > 0}
            <div>
              <img
                src={tour.images[0]}
                alt={tour.name}
                class="h-48 w-full object-cover rounded-t-(--asini-radius)"
              />
            </div>
          {:else}
            <div class="bg-(--asini-surface) h-48 flex items-center justify-center rounded-t-(--asini-radius)">
              <span class="text-4xl" style="color: var(--asini-text-3);">&#x1f3d4;</span>
            </div>
          {/if}
          <div class="p-5">
            <h2 class="text-lg font-semibold">{tour.name}</h2>
            {#if tour.description}
              <p class="text-sm line-clamp-2 mt-1" style="color: var(--asini-text-2);">
                {tour.description}
              </p>
            {/if}
            <div class="flex flex-wrap gap-2 mt-2">
              <span class="asini-badge text-[11px]"
                >{tour.duration} min</span
              >
              <span class="asini-badge text-[11px]"
                >{t("tour_group_up_to", { capacity: tour.capacity })}</span
              >
              {#each tour.languages.slice(0, 3) as lang}
                <span class="asini-badge bg-transparent border-transparent text-[11px]"
                  >{lang.toUpperCase()}</span
                >
              {/each}
            </div>
            {#if tour.location}
              <p class="text-xs mt-1" style="color: var(--asini-text-3);">{tour.location}</p>
            {/if}
            <div class="flex justify-end mt-3">
              <span class="font-semibold" style="color: var(--asini-accent);"
                >{formatPrice(tour.pricing)}</span
              >
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>
