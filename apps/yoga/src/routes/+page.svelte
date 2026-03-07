<script lang="ts">
  import CityMap from "$lib/components/CityMap.svelte";
  import PageHero from "$lib/components/PageHero.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import SectionLabel from "$lib/components/SectionLabel.svelte";
  import YogaSchoolTable from "$lib/components/YogaSchoolTable.svelte";

  let { data } = $props();
  const listings = $derived(data.listings);
  const cities = $derived(data.cities);
  const styles = $derived(data.styles);
  const cityCoords = $derived(
    Object.entries(data.cityCoords).map(([city, coords]) => ({ city, ...coords }))
  );
  const googleMapsApiKey = $derived(data.googleMapsApiKey);

  const totalSchools = $derived(listings.length);

  /** City markers with school counts for the map */
  const cityMarkers = $derived(
    cityCoords.map((cc) => ({
      ...cc,
      count: listings.filter((l) => l.city === cc.city).length,
    })).filter((c) => c.count > 0)
  );
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/" />
  <title>Katalog Szkół Jogi w Polsce — szkolyjogi.pl</title>
  <meta
    name="description"
    content="Katalog szkół jogi w Polsce — porównaj ceny karnetów, style i lokalizacje w jednym, przejrzystym zestawieniu."
  />
  <meta property="og:title" content="Katalog Szkół Jogi w Polsce — szkolyjogi.pl" />
  <meta
    property="og:description"
    content="Katalog szkół jogi w Polsce — porównaj ceny karnetów, style i lokalizacje w jednym, przejrzystym zestawieniu."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://szkolyjogi.pl/" />
  <meta name="twitter:card" content="summary_large_image" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'szkolyjogi.pl',
    url: 'https://szkolyjogi.pl/',
    description: 'Katalog szkół jogi w Polsce — porównaj ceny karnetów, style i lokalizacje.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://szkolyjogi.pl/{search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }).replace(/</g, '\\u003c')}</script>`}
</svelte:head>

<div class="sf-page-shell">
  <PageHero
    tag="Katalog szkół jogi"
    titleLines={["Spokojne", "miejsca", "do praktyki"]}
  />

  <SearchBar {cities} {styles} {cityCoords} schools={listings.map(l => ({ id: l.id, name: l.name, city: l.city }))} />

  <p class="home-stats">
    {totalSchools} szkół jogi w {cities.length} miastach, {styles.length} stylów praktyki.
  </p>

  <!-- Full table — the core content -->
  <section class="sf-section sf-section--tight">
    <SectionLabel text="Wszystkie szkoły" />
    <YogaSchoolTable schools={listings} />
  </section>

  <!-- Map — secondary discovery -->
  {#if googleMapsApiKey}
    <section class="sf-section">
      <SectionLabel text="Mapa szkół" />
      <CityMap cities={cityMarkers} apiKey={googleMapsApiKey} />
    </section>
  {/if}

  <!-- How it works (studio owners) -->
  <section class="sf-section sf-how">
    <SectionLabel text="Prowadzisz studio?" />
    <div class="how-steps">
      <div class="how-step sf-animate" style="animation-delay: 0ms">
        <span class="how-num">1</span>
        <h3 class="how-title">Znajdź swoje studio</h3>
        <p class="how-desc">Wyszukaj swoją szkołę w katalogu — prawdopodobnie już tu jest.</p>
      </div>
      <div class="how-step sf-animate" style="animation-delay: 80ms">
        <span class="how-num">2</span>
        <h3 class="how-title">Przejmij profil</h3>
        <p class="how-desc">Potwierdź, że to Twoje studio i uzyskaj pełną kontrolę nad treścią.</p>
      </div>
      <div class="how-step sf-animate" style="animation-delay: 160ms">
        <span class="how-num">3</span>
        <h3 class="how-title">Zarządzaj za darmo</h3>
        <p class="how-desc">Dodaj grafik, zdjęcia, opis — wszystko bezpłatnie, bez limitu czasu.</p>
      </div>
    </div>
    <div class="how-cta">
      <a href="/post" class="primary-button">Dodaj studio</a>
      <a href="/about" class="secondary-button">Więcej informacji →</a>
    </div>
  </section>
</div>

<style>
  /* ── Stats below search ── */
  .home-stats {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sf-muted);
    padding: 16px 0 0;
  }

  /* ── Page sections ── */
  .sf-section {
    padding: 56px 0 40px;
  }

  .sf-section--tight {
    padding-top: 36px;
  }

  /* ── How it works ── */
  .sf-how {
    border-top: 1px solid var(--sf-frost);
    margin-top: 24px;
    padding-top: 64px;
  }

  .how-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-bottom: 36px;
  }

  .how-step {
    text-align: center;
  }

  .how-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1.5px solid var(--sf-line);
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--sf-dark);
    margin-bottom: 14px;
  }

  .how-title {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--sf-dark);
    margin-bottom: 6px;
  }

  .how-desc {
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--sf-muted);
    max-width: 260px;
    margin: 0 auto;
  }

  .how-cta {
    display: flex;
    gap: 14px;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .how-steps {
      grid-template-columns: 1fr;
      gap: 32px;
    }
  }
</style>
