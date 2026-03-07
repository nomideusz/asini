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
  <p class="text-base-content/70 mb-8">{t("tours_subtitle")}</p>

  {#if data.tours.length === 0}
    <div class="card bg-base-200 p-12 text-center">
      <p class="text-base-content/60 text-lg">{t("tours_empty")}</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each data.tours as tour (tour.id)}
        <a
          href="/tours/{tour.id}"
          class="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow"
        >
          {#if tour.images.length > 0}
            <figure>
              <img
                src={tour.images[0]}
                alt={tour.name}
                class="h-48 w-full object-cover"
              />
            </figure>
          {:else}
            <figure class="bg-base-200 h-48 flex items-center justify-center">
              <span class="text-base-content/30 text-4xl">&#x1f3d4;</span>
            </figure>
          {/if}
          <div class="card-body">
            <h2 class="card-title text-lg">{tour.name}</h2>
            {#if tour.description}
              <p class="text-sm text-base-content/70 line-clamp-2">
                {tour.description}
              </p>
            {/if}
            <div class="flex flex-wrap gap-2 mt-2">
              <span class="badge badge-outline badge-sm"
                >{tour.duration} min</span
              >
              <span class="badge badge-outline badge-sm"
                >{t("tour_group_up_to", { capacity: tour.capacity })}</span
              >
              {#each tour.languages.slice(0, 3) as lang}
                <span class="badge badge-ghost badge-sm"
                  >{lang.toUpperCase()}</span
                >
              {/each}
            </div>
            {#if tour.location}
              <p class="text-xs text-base-content/50 mt-1">{tour.location}</p>
            {/if}
            <div class="card-actions justify-end mt-3">
              <span class="text-primary font-semibold"
                >{formatPrice(tour.pricing)}</span
              >
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>
