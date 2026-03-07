<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import PageHero from "$lib/components/PageHero.svelte";
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/post" />
  <title>Dodaj studio | szkolyjogi.pl</title>
  <meta
    name="description"
    content="Dodaj lub przejmij profil swojego studia jogi w katalogu szkolyjogi.pl — bezpłatnie."
  />
  <meta property="og:title" content="Dodaj studio | szkolyjogi.pl" />
  <meta
    property="og:description"
    content="Dodaj lub przejmij profil swojego studia jogi w katalogu szkolyjogi.pl — bezpłatnie."
  />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[
    { label: "Strona główna", href: "/" },
    { label: "Dodaj studio" },
  ]} />

  <PageHero
    tag="Prowadzisz studio?"
    titleLines={["Dodaj swoje", "studio"]}
    subtitle="Przejmij profil lub zgłoś nowe studio — bezpłatnie, bez limitu czasu."
    compact
  />

  <div class="post-content">
    <section class="post-section">
      <h2 class="section-title">Twoje studio jest już w katalogu?</h2>
      <p>
        Automatycznie zbieramy dane o szkołach jogi w Polsce. Istnieje duża szansa,
        że Twoje studio już się tutaj znajduje. Wyszukaj je na
        <a href="/">stronie głównej</a>, a następnie kliknij „Przejmij ten profil"
        na stronie studia.
      </p>
    </section>

    <section class="post-section">
      <h2 class="section-title">Nie możesz znaleźć swojego studia?</h2>
      <p>
        Napisz do nas na
        <a href="mailto:joga@zaur.app?subject=Nowe%20studio%20jogi">joga@zaur.app</a>
        z nazwą i adresem studia — dodamy je do katalogu.
      </p>
    </section>

    <section class="post-section">
      <h2 class="section-title">Co zyskujesz?</h2>
      <div class="benefits">
        <div class="benefit">
          <span class="benefit-num">1</span>
          <div>
            <h3 class="benefit-title">Widoczność w katalogu</h3>
            <p>Twoje studio pojawia się w wynikach wyszukiwania i na stronie miasta.</p>
          </div>
        </div>
        <div class="benefit">
          <span class="benefit-num">2</span>
          <div>
            <h3 class="benefit-title">Pełna kontrola nad profilem</h3>
            <p>Edytuj opis, grafik, zdjęcia i dane kontaktowe w dowolnym momencie.</p>
          </div>
        </div>
        <div class="benefit">
          <span class="benefit-num">3</span>
          <div>
            <h3 class="benefit-title">Bezpłatnie, na zawsze</h3>
            <p>Katalog jest darmowy — bez ukrytych opłat i limitów czasowych.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>

<style>
  .post-content {
    max-width: 640px;
    padding-bottom: var(--spacing-xl);
  }

  .post-section {
    margin-bottom: var(--spacing-lg);
  }

  .section-title {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--sf-dark);
    margin-bottom: 12px;
  }

  .post-content p {
    font-size: 0.95rem;
    line-height: 1.8;
    color: var(--sf-text);
    margin-bottom: 12px;
  }

  .post-content a {
    color: var(--sf-accent);
    text-decoration: none;
  }
  .post-content a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .benefits {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .benefit {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .benefit-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1.5px solid var(--sf-line);
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--sf-dark);
  }

  .benefit-title {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--sf-dark);
    margin-bottom: 4px;
  }

  .benefit p {
    margin-bottom: 0;
  }
</style>
