<script lang="ts">
  import type { PageData } from "./$types";
  import CityMap from "$lib/components/CityMap.svelte";
  import YogaSchoolTable from "$lib/components/YogaSchoolTable.svelte";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import PageHero from "$lib/components/PageHero.svelte";

  let { data }: { data: PageData } = $props();
  const googleMapsApiKey = $derived(data.googleMapsApiKey);

  /** Build markers from individual school locations */
  const schoolMarkers = $derived(
    data.schools
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        city: s.name,
        lat: s.latitude!,
        lng: s.longitude!,
        count: 1,
      }))
  );

  /** FAQ structured data for SEO */
  let faqJsonLd = $derived.by(() => {
    const priced = data.schools.filter(s => s.price != null);
    const avgPrice = priced.length > 0 ? Math.round(priced.reduce((sum, s) => sum + s.price!, 0) / priced.length) : null;
    const minPrice = priced.length > 0 ? Math.min(...priced.map(s => s.price!)) : null;
    const maxPrice = priced.length > 0 ? Math.max(...priced.map(s => s.price!)) : null;
    const allStyles = [...new Set(data.schools.flatMap(s => s.styles))].sort();
    const withTrial = data.schools.filter(s => s.trialPrice === 0);

    const faq: Array<{ q: string; a: string }> = [];

    faq.push({
      q: `Ile szkół jogi jest w mieście ${data.city}?`,
      a: `W mieście ${data.city} znajduje się ${data.schools.length} szkół jogi w katalogu szkolyjogi.pl.`,
    });

    if (avgPrice != null && minPrice != null && maxPrice != null) {
      faq.push({
        q: `Ile kosztuje joga w mieście ${data.city}?`,
        a: `Miesięczny karnet na jogę w mieście ${data.city} kosztuje średnio ${avgPrice} PLN. Ceny wahają się od ${minPrice} do ${maxPrice} PLN miesięcznie.`,
      });
    }

    if (allStyles.length > 0) {
      faq.push({
        q: `Jakie style jogi są dostępne w mieście ${data.city}?`,
        a: `W mieście ${data.city} dostępne są następujące style jogi: ${allStyles.join(', ')}.`,
      });
    }

    if (withTrial.length > 0) {
      faq.push({
        q: `Gdzie w mieście ${data.city} są darmowe pierwsze zajęcia jogi?`,
        a: `Bezpłatne pierwsze zajęcia oferuje ${withTrial.length} ${withTrial.length === 1 ? 'studio' : 'studiów'} w mieście ${data.city}, m.in. ${withTrial.slice(0, 3).map(s => s.name).join(', ')}.`,
      });
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.a,
        },
      })),
    };
  });
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
  <meta property="og:url" content="https://szkolyjogi.pl/{data.city?.toLowerCase()}" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Szkoły Jogi ${data.city}`,
    numberOfItems: data.schools.length,
    itemListElement: data.schools.slice(0, 20).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://szkolyjogi.pl/listing/${s.id}`,
      name: s.name,
    })),
  }).replace(/</g, '\\u003c')}</script>`}
  {@html `<script type="application/ld+json">${JSON.stringify(faqJsonLd).replace(/</g, '\\u003c')}</script>`}
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

  {#if googleMapsApiKey && schoolMarkers.length > 0}
    <section class="city-map-section">
      <CityMap cities={schoolMarkers} apiKey={googleMapsApiKey} />
    </section>
  {/if}

  <YogaSchoolTable schools={data.schools} hideCityColumn={true} />
</div>

<style>
  .city-map-section {
    padding: 0 0 32px;
  }
</style>
