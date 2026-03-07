<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import PageHero from "$lib/components/PageHero.svelte";
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/about" />
  <title>O projekcie | szkolyjogi.pl</title>
  <meta
    name="description"
    content="szkolyjogi.pl to katalog szkół jogi w Polsce — porównuj ceny, style i lokalizacje w jednym miejscu."
  />
  <meta property="og:title" content="O projekcie | szkolyjogi.pl" />
  <meta
    property="og:description"
    content="szkolyjogi.pl to katalog szkół jogi w Polsce — porównuj ceny, style i lokalizacje w jednym miejscu."
  />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[
    { label: "Strona główna", href: "/" },
    { label: "O projekcie" },
  ]} />

  <PageHero
    tag="O projekcie"
    titleLines={["Joga w jednym", "miejscu"]}
    subtitle="Katalog szkół jogi w Polsce — przejrzysty, aktualny, bezpłatny."
    compact
  />

  <div class="about-content">
    <section class="about-section">
      <h2 class="section-title">Czym jest szkolyjogi.pl?</h2>
      <p>
        szkolyjogi.pl to katalog szkół jogi w Polsce. Zbieramy informacje o studiach jogi
        z całego kraju — ich cenach, stylach, grafikach zajęć i lokalizacjach — i udostępniamy
        je w jednym, przejrzystym zestawieniu.
      </p>
      <p>
        Naszym celem jest ułatwienie wyboru szkoły jogi zarówno osobom rozpoczynającym
        przygodę z jogą, jak i doświadczonym praktykującym szukającym nowego studia.
      </p>
    </section>

    <section class="about-section">
      <h2 class="section-title">Dla prowadzących studia</h2>
      <p>
        Jeśli prowadzisz studio jogi, Twoja szkoła może już być w naszym katalogu.
        Przejmij swój profil, aby zarządzać informacjami — zaktualizować grafik, dodać
        zdjęcia i opis. Jest to całkowicie bezpłatne.
      </p>
      <p>
        Masz pytania? Napisz do nas na
        <a href="mailto:joga@zaur.app">joga@zaur.app</a>.
      </p>
    </section>
  </div>
</div>

<style>
  .about-content {
    max-width: 640px;
    padding-bottom: var(--spacing-xl);
  }

  .about-section {
    margin-bottom: var(--spacing-lg);
  }

  .section-title {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--sf-dark);
    margin-bottom: 12px;
  }

  .about-content p {
    font-size: 0.95rem;
    line-height: 1.8;
    color: var(--sf-text);
    margin-bottom: 12px;
  }

  .about-content a {
    color: var(--sf-accent);
    text-decoration: none;
  }
  .about-content a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
