<script lang="ts">
  import type { PageData } from "./$types";
  import YogaSchoolTable from "$lib/components/YogaSchoolTable.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import PageHero from "$lib/components/PageHero.svelte";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/{data.city?.toLowerCase()}" />
  <title
    >Szkoły Jogi {data.city} | Ceny Karnetów, Lokalizacje, Opinie | szkolyjogi.pl</title
  >
  <meta
    name="description"
    content="Baza szkół jogi: {data.city}. Sprawdź opinie, porównaj miesięczne ceny karnetów i znajdź najlepsze studio z darmowymi pierwszymi zajęciami. Zestawienie {data
      .schools.length} placówek."
  />
  <meta
    property="og:title"
    content="Szkoły Jogi {data.city} | Ceny Karnetów, Lokalizacje, Opinie"
  />
  <meta
    property="og:description"
    content="Baza szkół jogi: {data.city}. Sprawdź opinie, porównaj miesięczne ceny karnetów i znajdź najlepsze studio z darmowymi pierwszymi zajęciami."
  />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[
    { label: "Wszystkie szkoły", href: "/" },
    { label: data.city ?? "" },
  ]} />

  <PageHero
    tag="Miasto"
    title={data.city ?? ""}
    subtitle="Porównanie cen, ocen i stylów dla {data.schools.length} szkół jogi w tym mieście."
    compact
  />

  <YogaSchoolTable schools={data.schools} hideCityColumn={true} />
</div>

<style>
  /* Component inherits page-shell padding; no overrides needed */
</style>
