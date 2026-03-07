<script lang="ts">
  import type { PageData } from "./$types";
  import { priceFreshness, formatDateEU } from "$lib/data";
  import type { ScheduleEntry } from "$lib/data";
  import Breadcrumbs from "$lib/components/Breadcrumbs.svelte";
  import ListingMap from "$lib/components/ListingMap.svelte";
  import {
    Calendar,
    createRecurringAdapter,
    createMemoryAdapter,
  } from "@nomideusz/svelte-calendar";
  import type {
    RecurringEvent,
    TimelineEvent,
  } from "@nomideusz/svelte-calendar";

  let { data }: { data: PageData } = $props();
  let listing = $derived(data.listing);
  let freshness = $derived(priceFreshness(listing));
  let googleMapsApiKey = $derived(data.googleMapsApiKey);

  let schedule = $derived(listing.schedule ?? []);
  let hasSchedule = $derived(schedule.length > 0);
  let isClaimed = $derived(listing.source === "manual");
  let isUnclaimed = $derived(!isClaimed);

  // ── Per-school schedule mode ──────────────────────────────
  let scheduleMode = $derived(
    schedule.length > 0 ? schedule[0].scheduleType : null
  );

  /** True when the school has a schedule URL but we have no schedule data yet */
  let hasScheduleUrl = $derived(!!listing.scheduleUrl);
  let showScheduleEmpty = $derived(!hasSchedule && hasScheduleUrl);

  /** For dated schedules, check if all dates are in the past */
  let datedIsStale = $derived.by(() => {
    if (scheduleMode !== 'dated' || schedule.length === 0) return false;
    const today = new Date().toISOString().slice(0, 10);
    return schedule.every(e => e.date != null && e.date < today);
  });

  // ── Calendar integration ──────────────────────────────────

  /** Compute endTime fallback: startTime + 60 min */
  function fallbackEnd(start: string): string {
    const [h, m] = start.split(':').map(Number);
    const total = h * 60 + m + 60;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function scheduleToRecurring(entries: ScheduleEntry[]): RecurringEvent[] {
    return entries.map((e, i) => {
      const status = e.isCancelled ? 'cancelled' as const : undefined;
      return {
        id: `sched-${e.id ?? i}`,
        title: e.className,
        dayOfWeek: e.dayOfWeek + 1,               // adapter uses 1=Mon…7=Sun
        startTime: e.startTime,
        endTime: e.endTime ?? fallbackEnd(e.startTime),
        subtitle: e.teacher ?? undefined,
        tags: [...(e.isFree ? ['Bezpłatne'] : []), ...(e.level ? [e.level] : [])],
        category: e.style ?? e.className,
        location: e.location ?? undefined,
        ...(status && { status }),
      };
    });
  }

  /** Convert dated entries to TimelineEvent[] for the memory adapter */
  function scheduleToDated(entries: ScheduleEntry[]): TimelineEvent[] {
    return entries.map((e, i) => {
      const end = e.endTime ?? fallbackEnd(e.startTime);

      const start = new Date(`${e.date}T${e.startTime}:00`);
      const endDate = new Date(`${e.date}T${end}:00`);

      return {
        id: `sched-${e.id ?? i}`,
        title: e.className,
        start,
        end: endDate,
        subtitle: e.teacher ?? undefined,
        tags: [...(e.isFree ? ['Bezpłatne'] : []), ...(e.level ? [e.level] : [])],
        category: e.style ?? e.className,
        location: e.location ?? undefined,
        status: e.isCancelled ? 'cancelled' as const : undefined,
      };
    });
  }

  function buildAdapter(entries: ScheduleEntry[]) {
    if (scheduleMode === 'dated') {
      return createMemoryAdapter(scheduleToDated(entries));
    }
    return createRecurringAdapter(scheduleToRecurring(entries));
  }

  /** For dated mode, start on the earliest date in the schedule */
  let initialDate = $derived(
    scheduleMode === 'dated' && schedule.length > 0
      ? new Date(schedule.reduce((min, e) => (e.date && e.date < min ? e.date : min), schedule[0].date ?? ''))
      : undefined
  );

  let calendarAdapter = $derived(buildAdapter(schedule));

  // ── Meta description ────────────────────────────────────
  let metaDescription = $derived.by(() => {
    if (listing.description) {
      const clean = listing.description.replace(/\*\*/g, '');
      return clean.length > 155 ? clean.slice(0, 152) + '...' : clean;
    }
    const parts: string[] = [`Studio jogi: ${listing.name} (${listing.address ? listing.address + (!listing.address.includes(listing.city) ? `, ${listing.city}` : '') : listing.city}).`];
    if (listing.price) parts.push(`Miesięczny karnet: ${listing.price} PLN.`);
    parts.push(`Style: ${listing.styles.length ? listing.styles.join(', ') : 'Joga'}.`);
    parts.push('Sprawdź szczegóły na szkolyjogi.pl.');
    return parts.join(' ');
  });

  // ── JSON-LD structured data ──────────────────────────────
  let jsonLd = $derived.by(() => {
    const ld: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'SportsActivityLocation',
      name: listing.name,
      url: listing.websiteUrl ?? `https://szkolyjogi.pl/listing/${listing.id}`,
      telephone: listing.phone ?? undefined,
      email: listing.email ?? undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: listing.address || undefined,
        addressLocality: listing.city,
        addressCountry: 'PL',
      },
    };

    // Description: prefer editorial, fall back to Google editorial summary
    const desc = listing.description || listing.editorialSummary;
    if (desc) {
      ld.description = desc.replace(/\*\*/g, '');
    }

    if (listing.latitude != null && listing.longitude != null) {
      ld.geo = {
        '@type': 'GeoCoordinates',
        latitude: listing.latitude,
        longitude: listing.longitude,
      };
    }

    if (listing.imageUrl) {
      ld.image = listing.imageUrl;
    }

    if (listing.rating != null) {
      ld.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: listing.rating,
        reviewCount: listing.reviews ?? 0,
        bestRating: 5,
      };
    }

    if (listing.price != null) {
      ld.priceRange = `$$`;
    }

    // Opening hours from pipe-separated string
    if (listing.openingHours) {
      const dayMap: Record<string, string> = {
        'poniedziałek': 'Mo', 'wtorek': 'Tu', 'środa': 'We',
        'czwartek': 'Th', 'piątek': 'Fr', 'sobota': 'Sa', 'niedziela': 'Su',
      };
      const specs = listing.openingHours.split('|').map(s => s.trim()).filter(Boolean).map(entry => {
        const match = entry.match(/^(\S+):\s*(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/);
        if (!match) return null;
        const [, dayPl, opens, closes] = match;
        const dayEn = dayMap[dayPl.toLowerCase()];
        if (!dayEn) return null;
        return {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: `https://schema.org/${dayEn === 'Mo' ? 'Monday' : dayEn === 'Tu' ? 'Tuesday' : dayEn === 'We' ? 'Wednesday' : dayEn === 'Th' ? 'Thursday' : dayEn === 'Fr' ? 'Friday' : dayEn === 'Sa' ? 'Saturday' : 'Sunday'}`,
          opens,
          closes,
        };
      }).filter(Boolean);
      if (specs.length > 0) {
        ld.openingHoursSpecification = specs;
      }
    }

    // sameAs: link to Google Maps
    if (listing.googleMapsUrl) {
      ld.sameAs = listing.googleMapsUrl;
    }

    // Offer catalog for single class price
    if (listing.singleClassPrice != null) {
      ld.hasOfferCatalog = {
        '@type': 'OfferCatalog',
        name: 'Zajęcia jogi',
        itemListElement: [{
          '@type': 'Offer',
          name: 'Wejście jednorazowe',
          price: listing.singleClassPrice,
          priceCurrency: 'PLN',
        }],
      };
    }

    return ld;
  });
</script>

<svelte:head>
  <link rel="canonical" href="https://szkolyjogi.pl/listing/{listing.id}" />
  <title>{listing.name} | Joga {listing.city} | szkolyjogi.pl</title>
  <meta
    name="description"
    content={metaDescription}
  />
  <meta property="og:title" content="{listing.name} | Joga {listing.city}" />
  <meta
    property="og:description"
    content="{listing.price
      ? `Miesięczny karnet: ${listing.price} PLN. `
      : ''}Style: {listing.styles.length
      ? listing.styles.join(', ')
      : 'Joga'}. Sprawdź szczegóły na szkolyjogi.pl"
  />
  <meta property="og:type" content="article" />
  {#if listing.imageUrl}
    <meta property="og:image" content={listing.imageUrl} />
  {/if}
  <meta name="twitter:card" content="summary_large_image" />
  {@html `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`}
</svelte:head>

<article class="sf-page-shell">
  <Breadcrumbs
    crumbs={[
      { label: "Wszystkie szkoły", href: "/" },
      { label: listing.city, href: `/${listing.city.toLowerCase()}` },
      { label: listing.name },
    ]}
  />

  <!-- ═══ HEADER ═══ -->
  <header class="listing-header">
    <h1 class="listing-name">{listing.name}</h1>

    <div class="listing-meta-row">
      <span class="listing-location">
        {listing.address}{listing.address && !listing.address.includes(listing.city) ? `, ${listing.city}` : !listing.address ? listing.city : ''}
      </span>
      {#if listing.rating != null}
        <span class="listing-meta-dot">·</span>
        <span class="listing-rating">
          <span class="listing-rating-star" aria-hidden="true">★</span>
          {listing.rating.toFixed(1)}
          {#if listing.reviews != null}
            <span class="listing-rating-count">({listing.reviews})</span>
          {/if}
        </span>
      {/if}
      {#if listing.styles.length > 0}
        <span class="listing-meta-dot">·</span>
        <span class="listing-styles-inline">
          {#each listing.styles as style, i (i)}
            <a href="/category/{style.toLowerCase()}" class="style-link">{style}</a>{#if i < listing.styles.length - 1}<span class="style-sep">,</span>{/if}
          {/each}
        </span>
      {/if}
    </div>

    <div class="action-bar">
      {#if listing.phone}
        <a href="tel:{listing.phone}" class="action-btn">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.5 9.5c1.1 1.1 2.4 1.9 3.5 2.3l1.2-1.2a.8.8 0 0 1 .9-.2c1 .3 2 .5 3 .5a.8.8 0 0 1 .8.8V14a.8.8 0 0 1-.8.8A13.2 13.2 0 0 1 1.2 1a.8.8 0 0 1 .8-.8h2.3a.8.8 0 0 1 .8.8c0 1 .2 2 .5 3a.8.8 0 0 1-.2.9L4.2 6c.4 1.1 1.2 2.4 2.3 3.5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {listing.phone}
        </a>
      {/if}
      {#if listing.email}
        <a href="mailto:{listing.email}" class="action-btn">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 4.5L8 9l6.5-4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          E-mail
        </a>
      {/if}
      <a
        href={`https://maps.google.com/?q=${encodeURIComponent(listing.name + " " + listing.address + " " + listing.city)}`}
        target="_blank"
        rel="noopener noreferrer"
        class="action-btn"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1C5.2 1 3 3.1 3 5.8 3 9.5 8 15 8 15s5-5.5 5-9.2C13 3.1 10.8 1 8 1z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="5.8" r="1.8" stroke="currentColor" stroke-width="1.3"/></svg>
        Mapa
      </a>
      {#if listing.scheduleUrl}
        <a href={listing.scheduleUrl} target="_blank" rel="noopener noreferrer" class="action-btn">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M2 6h12M5.5 1v3M10.5 1v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          Rezerwacja
        </a>
      {/if}
      {#if listing.websiteUrl}
        <a href={listing.websiteUrl} target="_blank" rel="noopener noreferrer" class="action-link">
          {listing.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
        </a>
      {/if}
    </div>
  </header>

  {#if listing.imageUrl && isClaimed}
    <img src={listing.imageUrl} alt={listing.name} class="cover" />
  {/if}

  <!-- ═══ MAIN CONTENT ═══ -->
  <div class="listing-grid">
    <!-- Left column: description + schedule -->
    <div class="listing-main">
      {#if listing.description || listing.editorialSummary}
        <section class="description-section">
          <p class="lead">
            {(listing.description || listing.editorialSummary || '').replace(/\*\*/g, "")}
          </p>
        </section>
      {/if}

      {#if hasSchedule}
        <section class="schedule-calendar-section">
          <h2 class="panel-label">Grafik zajęć</h2>
          {#if datedIsStale}
            <div class="schedule-stale-notice">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5V8.5M8 10.5V11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              Grafik może być nieaktualny — ostatnie zajęcia w przeszłości.
            </div>
          {/if}
          {#key listing.id}
            {#if scheduleMode === 'dated'}
              <Calendar
                view="week-agenda"
                adapter={calendarAdapter}
                locale="pl-PL"
                height="auto"
                readOnly
                showNavigation
                showDates
                equalDays
                initialDate={initialDate}
              />
            {:else}
              <Calendar
                view="week-agenda"
                adapter={calendarAdapter}
                locale="pl-PL"
                height="auto"
                readOnly
                showNavigation={false}
                showDates={false}
                equalDays
              />
            {/if}
          {/key}
        </section>
      {:else if showScheduleEmpty}
        <section class="schedule-empty-section">
          <div class="schedule-empty-inner">
            <svg class="schedule-empty-icon" width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect x="6" y="10" width="36" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
              <path d="M6 20h36" stroke="currentColor" stroke-width="2"/>
              <path d="M16 6v8M32 6v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="24" cy="32" r="4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>
            </svg>
            <h2 class="schedule-empty-title">Grafik w przygotowaniu</h2>
            <p class="schedule-empty-text">
              Pracujemy nad automatycznym pobieraniem grafiku zajęć dla tego studia.
              Wkrótce grafik pojawi się na tej stronie.
            </p>
          </div>
        </section>
      {:else}
        <section class="schedule-empty-section schedule-empty-minimal">
          <div class="schedule-empty-inner">
            <svg class="schedule-empty-icon" width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect x="6" y="10" width="36" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
              <path d="M6 20h36" stroke="currentColor" stroke-width="2"/>
              <path d="M16 6v8M32 6v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <p class="schedule-empty-text">
              Grafik zajęć nie jest jeszcze dostępny dla tego studia.
            </p>
          </div>
        </section>
      {/if}
    </div>

    <!-- Right column: pricing + contact -->
    <aside class="listing-sidebar">
      <section class="panel sf-card pricing-card">
        <h2 class="panel-label">Cennik</h2>
        <div class="price-hero">
          <span class="price-hero-value">{listing.price != null ? `${listing.price}` : '—'}</span>
          <span class="price-hero-unit">{listing.price != null ? (listing.priceEstimated ? '~PLN / miesiąc' : 'PLN / miesiąc') : ''}</span>
          {#if listing.priceEstimated}
            <span class="estimated-badge" title="Cena szacunkowa obliczona na podstawie pakietów wejść (3x/tydzień)">szacunkowy</span>
          {/if}
          {#if listing.trialPrice === 0}
            <span class="trial-badge">Pierwsze zajęcia gratis</span>
          {/if}
        </div>
        {#if listing.price != null}
          <div class="freshness freshness-{freshness}">
            Weryfikacja: {formatDateEU(listing.lastPriceCheck)}
            <span class="freshness-label">
              {freshness === 'fresh' ? '· aktualne' : freshness === 'aging' ? '· wymaga sprawdzenia' : '· nieaktualne'}
            </span>
          </div>
        {/if}
        <div class="price-rows">
          <div class="kv">
            <span>Wejście jednorazowe</span>
            <strong>{listing.singleClassPrice != null ? `${listing.singleClassPrice} PLN` : '—'}</strong>
          </div>
          {#if listing.trialPrice != null && listing.trialPrice > 0}
            <div class="kv">
              <span>Pierwsze zajęcia</span>
              <strong>{listing.trialPrice} PLN</strong>
            </div>
          {/if}
        </div>
        {#if listing.pricingNotes}
          <p class="pricing-notes">{listing.pricingNotes}</p>
        {/if}
      </section>

      {#if listing.latitude != null && listing.longitude != null && googleMapsApiKey}
        <section class="panel sf-card map-card">
          <h2 class="panel-label">Lokalizacja</h2>
          <ListingMap lat={listing.latitude} lng={listing.longitude} name={listing.name} apiKey={googleMapsApiKey} />
        </section>
      {/if}

      {#if hasSchedule}
        <section class="panel sf-card schedule-summary-card">
          <h2 class="panel-label">Zajęcia w skrócie</h2>
          <div class="schedule-stats">
            <div class="kv">
              <span>{scheduleMode === 'dated' ? 'Zajęć w grafiku' : 'Zajęć tygodniowo'}</span>
              <strong>{schedule.filter(e => !e.isCancelled).length}</strong>
            </div>
            {#if schedule.some(e => e.isFree)}
              <div class="kv">
                <span>Bezpłatne zajęcia</span>
                <strong>{schedule.filter(e => e.isFree).length}</strong>
              </div>
            {/if}
            {#if [...new Set(schedule.map(e => e.teacher).filter(Boolean))].length > 0}
              {@const teachers = [...new Set(schedule.map(e => e.teacher).filter(Boolean))]}
              <div class="kv">
                <span>Instruktorów</span>
                <strong>{teachers.length}</strong>
              </div>
            {/if}
          </div>
        </section>
      {/if}

      {#if isUnclaimed}
        <section class="panel sf-card status-card">
          <p class="status-text">
            To Twoje studio? Przejmij profil i wyróżnij się wśród {listing.city === 'Warszawa' ? 'warszawskich' : 'lokalnych'} szkół jogi — bezpłatnie.
          </p>
          <a
            href="/listing/{listing.id}/claim"
            class="claim-btn"
          >
            Przejmij profil
          </a>
        </section>
      {/if}
    </aside>
  </div>

  <footer class="profile-meta">
    <span class="meta-text">
      {listing.source === 'crawl4ai' ? 'Dane zweryfikowane automatycznie' : 'Dane wprowadzone ręcznie'} · Aktualizacja: {formatDateEU(listing.lastUpdated)}
    </span>
    <a
      href="mailto:joga@zaur.app?subject=Korekta%20danych%20studia%3A%20{encodeURIComponent(listing.name)}"
      class="meta-link"
    >
      Zgłoś błędne dane
    </a>
  </footer>
</article>

<style>
  /* ── Header ── */
  .listing-header {
    padding-bottom: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
  }

  .listing-name {
    font-family: var(--font-display);
    font-size: clamp(2.4rem, 5vw, 3.8rem);
    line-height: 1.06;
    letter-spacing: -0.03em;
    font-weight: 400;
    color: var(--sf-dark);
    margin-bottom: 12px;
  }

  .listing-meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 20px;
    font-size: 0.92rem;
    color: var(--sf-muted);
    line-height: 1.6;
  }

  .listing-location { color: var(--sf-text); }
  .listing-meta-dot { color: var(--sf-ice); font-weight: 300; user-select: none; }
  .listing-rating { font-weight: 600; color: var(--sf-dark); white-space: nowrap; }
  .listing-rating-star { color: var(--sf-warm); font-size: 0.85em; }
  .listing-rating-count { font-weight: 400; color: var(--sf-muted); font-size: 0.88em; }
  .listing-styles-inline { display: inline; }

  .style-link {
    color: var(--sf-accent);
    text-decoration: none;
    transition: color var(--dur-fast) ease;
  }
  .style-link:hover {
    color: var(--sf-accent-hover);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .style-sep { color: var(--sf-muted); margin-right: 3px; }

  /* ── Action bar ── */
  .action-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }

  .action-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px;
    border: 1px solid var(--sf-line); border-radius: var(--radius-pill);
    background: var(--sf-card); color: var(--sf-dark);
    font-family: var(--font-body); font-size: 0.82rem; font-weight: 500;
    text-decoration: none; white-space: nowrap;
    transition: border-color var(--dur-fast) ease, color var(--dur-fast) ease, background var(--dur-fast) ease;
  }
  .action-btn:hover { border-color: var(--sf-accent); color: var(--sf-accent); background: var(--sf-frost); }
  .action-btn:visited { color: var(--sf-dark); }
  .action-btn:visited:hover { color: var(--sf-accent); }

  .action-link {
    display: inline-flex; align-items: center;
    color: var(--sf-muted); font-size: 0.82rem;
    text-decoration: none; padding: 9px 8px;
    transition: color var(--dur-fast) ease;
  }
  .action-link:hover { color: var(--sf-accent); }
  .action-link:visited { color: var(--sf-muted); }

  /* ── Cover image ── */
  .cover {
    width: 100%; height: min(54vh, 520px); min-height: 280px;
    object-fit: cover; border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-md);
  }

  /* ── Grid layout ── */
  .listing-grid {
    display: grid; grid-template-columns: 1fr 340px;
    gap: 40px; align-items: start;
  }
  .listing-main { display: flex; flex-direction: column; gap: 32px; }
  .listing-sidebar {
    display: flex; flex-direction: column; gap: 16px;
    position: sticky; top: 24px;
  }

  /* ── Description ── */
  .description-section { padding-top: 4px; }
  .lead { max-width: 62ch; line-height: 1.8; color: var(--sf-text); font-size: 1.02rem; }

  /* ── Panel base ── */
  .panel { padding: var(--spacing-md); }
  .panel:hover { transform: none; box-shadow: none; }

  .panel-label {
    font-family: var(--font-mono); font-size: 0.68rem;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--sf-accent); font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }

  /* ── Map card ── */
  .map-card { padding-bottom: 0; overflow: hidden; }
  .map-card :global(.listing-map-wrap) { border: none; border-radius: 0; box-shadow: none; margin: 0 calc(-1 * var(--spacing-md)); margin-bottom: 0; width: calc(100% + 2 * var(--spacing-md)); }

  /* ── Pricing card ── */
  .price-hero { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
  .price-hero-value {
    font-family: var(--font-display); font-size: 2.6rem; font-weight: 500;
    color: var(--sf-dark); line-height: 1; letter-spacing: -0.02em;
  }
  .price-hero-unit {
    font-family: var(--font-mono); font-size: 0.64rem;
    text-transform: uppercase; letter-spacing: 0.06em; color: var(--sf-muted);
  }
  .trial-badge {
    font-family: var(--font-mono); font-size: 0.58rem;
    text-transform: uppercase; letter-spacing: 0.04em;
    color: var(--sf-warm); border: 1px solid var(--sf-warm);
    background: var(--sf-warm-bg); padding: 3px 10px;
    border-radius: var(--radius-pill); font-weight: 600;
    white-space: nowrap; align-self: center;
  }
  .estimated-badge {
    font-family: var(--font-mono); font-size: 0.58rem;
    text-transform: uppercase; letter-spacing: 0.04em;
    color: var(--sf-muted); border: 1px solid var(--sf-line);
    background: var(--sf-frost); padding: 3px 10px;
    border-radius: var(--radius-pill); font-weight: 600;
    white-space: nowrap; align-self: center;
    cursor: help;
  }

  .freshness {
    font-family: var(--font-mono); font-size: 0.62rem;
    text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;
  }
  .freshness-fresh { color: var(--sf-accent); }
  .freshness-aging { color: var(--sf-muted); }
  .freshness-stale { color: var(--sf-danger); }
  .freshness-label { font-weight: 600; }

  .price-rows { border-top: 1px solid var(--sf-frost); padding-top: 8px; }
  .kv {
    display: flex; justify-content: space-between; gap: 10px;
    padding: 10px 0; border-bottom: 1px solid var(--sf-frost);
  }
  .kv:last-of-type { border-bottom: none; }
  .kv span {
    font-family: var(--font-mono); font-size: 0.72rem;
    text-transform: uppercase; letter-spacing: 0.05em; color: var(--sf-muted);
  }
  .kv strong { font-size: 0.96rem; font-weight: 600; text-align: right; color: var(--sf-dark); }

  .pricing-notes {
    margin-top: 14px; padding-top: 14px;
    border-top: 1px solid var(--sf-frost);
    color: var(--sf-muted); font-size: 0.8rem; line-height: 1.7;
  }

  /* ── Schedule summary card ── */
  .schedule-stats { /* reuses .kv styling */ }

  /* ── Claim card ── */
  .status-card { border-style: dashed; border-color: var(--sf-warm); background: var(--sf-warm-bg); }
  .status-text { color: var(--sf-text); font-size: 0.88rem; line-height: 1.65; margin-bottom: 14px; }
  .claim-btn {
    display: flex; align-items: center; justify-content: center;
    width: 100%; padding: 12px 24px;
    background: var(--sf-warm); color: #fff;
    font-family: var(--font-mono); font-weight: 600; font-size: 0.72rem;
    text-transform: uppercase; letter-spacing: 0.08em; text-decoration: none;
    border: none; border-radius: var(--radius-sm);
    transition: background var(--dur-fast) ease;
  }
  .claim-btn:hover { background: #b08858; }
  .claim-btn:visited { color: #fff; }

  /* ── Footer meta ── */
  .profile-meta {
    margin-top: var(--spacing-xl); padding-top: var(--spacing-md);
    border-top: 1px solid var(--sf-frost);
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px;
  }
  .meta-text {
    font-family: var(--font-mono); font-size: 0.64rem;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--sf-muted); opacity: 0.7;
  }
  .meta-link {
    font-family: var(--font-mono); font-size: 0.64rem;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--sf-muted); opacity: 0.7; text-decoration: none;
    margin-left: auto;
    transition: opacity var(--dur-fast) ease, color var(--dur-fast) ease;
  }
  .meta-link:hover { opacity: 1; color: var(--sf-accent); }

  /* ── Schedule empty state ── */
  .schedule-empty-section {
    border: 1.5px dashed var(--sf-line);
    border-radius: var(--radius-lg);
    padding: 48px 32px;
    text-align: center;
  }
  .schedule-empty-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    max-width: 380px;
    margin: 0 auto;
  }
  .schedule-empty-icon {
    color: var(--sf-ice);
    margin-bottom: 4px;
  }
  .schedule-empty-title {
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 400;
    color: var(--sf-dark);
    letter-spacing: -0.01em;
  }
  .schedule-empty-text {
    font-size: 0.88rem;
    line-height: 1.65;
    color: var(--sf-muted);
  }
  .schedule-empty-minimal {
    padding: 32px 24px;
  }
  .schedule-empty-minimal .schedule-empty-inner {
    gap: 8px;
  }
  /* ── Schedule stale notice ── */
  .schedule-stale-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
    border: 1px solid var(--sf-warm);
    border-radius: var(--radius-sm);
    background: var(--sf-warm-bg);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--sf-warm);
    line-height: 1.5;
  }
  @media (max-width: 860px) {
    .listing-grid { grid-template-columns: 1fr; gap: 24px; }
    .listing-sidebar { position: static; }
    .listing-meta-row { flex-direction: column; gap: 4px; }
    .listing-meta-dot { display: none; }
    .action-bar { flex-direction: column; }
    .action-btn { justify-content: center; }
    .action-link { justify-content: center; }
  }
</style>
