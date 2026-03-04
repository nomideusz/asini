<script lang="ts">
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

  const totalSchools = $derived(listings.length);

  /** Top 6 cities by school count */
  const popularCities = $derived(
    cities
      .map((city) => ({
        city,
        count: listings.filter((l) => l.city === city).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
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
</svelte:head>

<div class="sf-page-shell">
  <PageHero
    tag="Katalog szkół jogi"
    title="Spokojne<br/>miejsca<br/>do praktyki"
    subtitle="{totalSchools} szkół jogi w {cities.length} miastach, {styles.length} stylów praktyki."
  />

  <SearchBar {cities} {styles} {cityCoords} />

  <!-- Popular cities -->
  <section class="sf-section">
    <SectionLabel text="Popularne miasta" />
    <div class="city-tiles">
      {#each popularCities as { city, count }, i}
        <a
          href="/{city.toLowerCase()}"
          class="city-tile sf-card sf-animate"
          style="animation-delay: {i * 50}ms"
        >
          <span class="city-tile-name">{city}</span>
          <span class="city-tile-count">{count} {count === 1 ? 'szkoła' : count < 5 ? 'szkoły' : 'szkół'}</span>
        </a>
      {/each}
    </div>
  </section>

  <!-- Full table -->
  <section class="sf-section">
    <SectionLabel text="Pełna lista" />
    <YogaSchoolTable schools={listings} />
  </section>

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
  /* ── Page sections ── */
  .sf-section {
    padding: 56px 0 40px;
  }

  /* ── Popular city tiles ── */
  .city-tiles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .city-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 28px 16px;
    text-decoration: none;
    text-align: center;
    gap: 6px;
    transition: border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease, transform var(--dur-fast) var(--ease-out);
  }

  .city-tile:hover {
    border-color: var(--sf-accent);
  }

  .city-tile-name {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 500;
    color: var(--sf-dark);
    line-height: 1.2;
  }

  .city-tile-count {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sf-muted);
    font-weight: 500;
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
    flex-wrap: wrap;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .city-tiles {
      grid-template-columns: repeat(2, 1fr);
    }

    .how-steps {
      grid-template-columns: 1fr;
      gap: 32px;
    }
  }
</style>
