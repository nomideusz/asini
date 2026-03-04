<script lang="ts">
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import PageHero from "$lib/components/PageHero.svelte";
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/terms" />
  <title>Regulamin | szkolyjogi.pl</title>
  <meta
    name="description"
    content="Regulamin serwisu szkolyjogi.pl — katalog szkół jogi w Polsce."
  />
  <meta property="og:title" content="Regulamin | szkolyjogi.pl" />
  <meta
    property="og:description"
    content="Regulamin serwisu szkolyjogi.pl — katalog szkół jogi w Polsce."
  />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="sf-page-shell">
  <Breadcrumbs crumbs={[
    { label: "Strona główna", href: "/" },
    { label: "Regulamin" },
  ]} />

  <PageHero
    tag="Regulamin"
    title="Warunki<br/>korzystania"
    subtitle="Zasady korzystania z serwisu szkolyjogi.pl."
    compact
  />

  <div class="terms-content">
    <section class="terms-section">
      <h2 class="section-title">§1 Postanowienia ogólne</h2>
      <ol>
        <li>Serwis szkolyjogi.pl (dalej: „Serwis") jest katalogiem szkół jogi działających na terenie Polski.</li>
        <li>Administratorem Serwisu jest szkolyjogi.pl.</li>
        <li>Korzystanie z Serwisu jest bezpłatne.</li>
      </ol>
    </section>

    <section class="terms-section">
      <h2 class="section-title">§2 Zakres usług</h2>
      <ol>
        <li>Serwis udostępnia informacje o szkołach jogi, w tym: nazwy, adresy, ceny karnetów, style jogi, grafiki zajęć i dane kontaktowe.</li>
        <li>Informacje prezentowane w Serwisie mają charakter informacyjny i mogą nie odzwierciedlać aktualnego stanu oferty danej szkoły.</li>
        <li>Serwis nie pośredniczy w rezerwacji zajęć ani w płatnościach między użytkownikami a szkołami jogi.</li>
      </ol>
    </section>

    <section class="terms-section">
      <h2 class="section-title">§3 Dane szkół jogi</h2>
      <ol>
        <li>Dane szkół jogi są zbierane automatycznie ze źródeł publicznie dostępnych.</li>
        <li>Właściciel studia jogi może przejąć profil swojej szkoły, kontaktując się z administratorem na adres <a href="mailto:kontakt@szkolyjogi.pl">kontakt@szkolyjogi.pl</a>.</li>
        <li>Administrator dokłada starań, aby prezentowane dane były aktualne, jednak nie gwarantuje ich poprawności.</li>
      </ol>
    </section>

    <section class="terms-section">
      <h2 class="section-title">§4 Odpowiedzialność</h2>
      <ol>
        <li>Administrator nie ponosi odpowiedzialności za treści zamieszczone przez szkoły jogi, które przejęły swoje profile.</li>
        <li>Administrator nie ponosi odpowiedzialności za decyzje podjęte na podstawie informacji prezentowanych w Serwisie.</li>
      </ol>
    </section>

    <section class="terms-section">
      <h2 class="section-title">§5 Kontakt</h2>
      <p>
        W sprawach związanych z Serwisem prosimy o kontakt na adres
        <a href="mailto:kontakt@szkolyjogi.pl">kontakt@szkolyjogi.pl</a>.
      </p>
    </section>
  </div>
</div>

<style>
  .terms-content {
    max-width: 640px;
    padding-bottom: var(--spacing-xl);
  }

  .terms-section {
    margin-bottom: var(--spacing-lg);
  }

  .section-title {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--sf-dark);
    margin-bottom: 12px;
  }

  .terms-content p,
  .terms-content li {
    font-size: 0.95rem;
    line-height: 1.8;
    color: var(--sf-text);
  }

  .terms-content ol {
    padding-left: 20px;
    margin-bottom: 0;
  }

  .terms-content li {
    margin-bottom: 8px;
  }

  .terms-content a {
    color: var(--sf-accent);
    text-decoration: none;
  }
  .terms-content a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
