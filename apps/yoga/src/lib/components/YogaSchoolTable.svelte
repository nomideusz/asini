<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import type { Listing } from "$lib/data";
  import Pagination from "./Pagination.svelte";

  import { untrack } from "svelte";

  const PER_PAGE = 20;

  let {
    schools,
    hideCityColumn = false,
  }: { schools: Listing[]; hideCityColumn?: boolean } = $props();

  let currentPage = $state(1);
  let viewMode = $state<'table' | 'cards'>(typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches ? 'cards' : 'table');

  let sortKey = $state(untrack(() => "rating"));
  let sortDirection = $state(-1);
  const STORAGE_KEY = "yoga-table-state-v3";
  const defaultSortKey = "rating";

  let headers = $derived([
    { key: "name", label: "Szkoła", align: "left" },
    ...(hideCityColumn
      ? []
      : [{ key: "city", label: "Miasto", align: "left" }]),
    { key: "rating", label: "Ocena", align: "right" },
  ]);

  function sortBy(key: string) {
    if (sortKey === key) {
      sortDirection = -sortDirection;
    } else {
      sortKey = key;
      sortDirection = 1;
    }
  }

  // Deduplicate and extract all unique styles
  const plCollator = new Intl.Collator('pl-PL');

  let uniqueStyles = $derived(
    Array.from(new Set(schools.flatMap((school) => school.styles))).sort(plCollator.compare),
  );

  let selectedStyle = $state("Wszystkie");

  function isValidSortKey(value: unknown): value is string {
    if (typeof value !== "string") return false;
    return ["name", "city", "rating"].includes(value);
  }

  function tableStorageKey(): string {
    return `${STORAGE_KEY}:${hideCityColumn ? "city" : "directory"}`;
  }

  onMount(() => {
    if (!browser) return;

    try {
      const raw = localStorage.getItem(tableStorageKey());
      if (!raw) return;

      const state = JSON.parse(raw) as {
        selectedStyle?: unknown;
        sortKey?: unknown;
        sortDirection?: unknown;
        viewMode?: unknown;
      };

      if (typeof state.selectedStyle === "string") {
        selectedStyle = state.selectedStyle;
      }

      if (isValidSortKey(state.sortKey)) {
        if (!hideCityColumn || state.sortKey !== "city") {
          sortKey = state.sortKey;
        }
      }

      if (state.sortDirection === 1 || state.sortDirection === -1) {
        sortDirection = state.sortDirection;
      }

      if (state.viewMode === 'table' || state.viewMode === 'cards') {
        viewMode = state.viewMode;
      } else {
        viewMode = window.matchMedia('(max-width: 768px)').matches ? 'cards' : 'table';
      }
    } catch {
      selectedStyle = "Wszystkie";
      sortKey = defaultSortKey;
      sortDirection = -1;
      viewMode = window.matchMedia('(max-width: 768px)').matches ? 'cards' : 'table';
    }
  });

  // Data completeness score — schools with more data rank higher within ties
  function completeness(s: Listing): number {
    let score = 0;
    if (s.price != null) score += 4;
    if (s.rating != null) score += 2;
    if (s.phone) score += 1;
    if (s.singleClassPrice != null) score += 1;
    return score;
  }

  // Filter first, then sort (null values pushed to bottom)
  let filteredAndSortedSchools = $derived(
    [...schools]
      .filter((school) => {
        if (selectedStyle === "Wszystkie") return true;
        return school.styles.includes(selectedStyle);
      })
      .sort((a, b) => {
        // @ts-ignore
        const valA = a[sortKey];
        // @ts-ignore
        const valB = b[sortKey];

        // Push nulls to bottom regardless of sort direction
        if (valA == null && valB == null) {
          // Both null on primary key — sort by completeness desc, then name
          const comp = completeness(b) - completeness(a);
          return comp !== 0 ? comp : plCollator.compare(a.name, b.name);
        }
        if (valA == null) return 1;
        if (valB == null) return -1;

        // Use locale-aware comparison for strings (Polish: ł, ś, ż, etc.)
        const cmp = typeof valA === 'string' && typeof valB === 'string'
          ? plCollator.compare(valA, valB) * sortDirection
          : ((valA < valB ? -1 : valA > valB ? 1 : 0) * sortDirection);
        if (cmp !== 0) return cmp;

        // Tie on primary key — sort by completeness desc, then name
        const comp = completeness(b) - completeness(a);
        return comp !== 0 ? comp : plCollator.compare(a.name, b.name);
      }),
  );

  // Pagination
  let totalPages = $derived(Math.max(1, Math.ceil(filteredAndSortedSchools.length / PER_PAGE)));

  // Reset to page 1 when filter or sort changes
  $effect(() => {
    // Subscribe to the reactive values
    void selectedStyle;
    void sortKey;
    void sortDirection;
    // Reset page
    currentPage = 1;
  });

  $effect(() => {
    if (selectedStyle === "Wszystkie") return;
    if (!uniqueStyles.includes(selectedStyle)) {
      selectedStyle = "Wszystkie";
    }
  });

  $effect(() => {
    if (!browser) return;
    localStorage.setItem(
      tableStorageKey(),
      JSON.stringify({
        selectedStyle,
        sortKey,
        sortDirection,
        viewMode,
      })
    );
  });

  // Clamp page if total shrinks (e.g. new data set via props)
  $effect(() => {
    if (currentPage > totalPages) currentPage = totalPages;
  });

  let paginatedSchools = $derived(
    filteredAndSortedSchools.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  );

  function handlePageChange(page: number) {
    currentPage = page;
    // Scroll to top of table
    document.querySelector('.table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<div class="filter-bar">
  <div class="filter-left">
    <span class="muted filter-label">Filtruj wg stylu:</span>
    <button
      class="filter-btn"
      class:active={selectedStyle === "Wszystkie"}
      onclick={() => (selectedStyle = "Wszystkie")}
    >
      Wszystkie
    </button>
    {#each uniqueStyles as style (style)}
      <button
        class="filter-btn"
        class:active={selectedStyle === style}
        onclick={() => (selectedStyle = style)}
      >
        {style}
      </button>
    {/each}
  </div>
  <div class="view-toggle" role="radiogroup" aria-label="Widok listy">
    <button
      class="toggle-btn"
      class:toggle-active={viewMode === 'table'}
      onclick={() => (viewMode = 'table')}
      aria-pressed={viewMode === 'table'}
      title="Widok tabeli"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="2" width="14" height="2" rx="0.5" fill="currentColor"/>
        <rect x="1" y="7" width="14" height="2" rx="0.5" fill="currentColor"/>
        <rect x="1" y="12" width="14" height="2" rx="0.5" fill="currentColor"/>
      </svg>
    </button>
    <button
      class="toggle-btn"
      class:toggle-active={viewMode === 'cards'}
      onclick={() => (viewMode = 'cards')}
      aria-pressed={viewMode === 'cards'}
      title="Widok kart"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor"/>
        <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor"/>
        <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor"/>
        <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/>
      </svg>
    </button>
  </div>
</div>

<div class="pg-summary">
  <span class="pg-summary-text">
    {#if filteredAndSortedSchools.length > 0}
      Wyświetlono {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filteredAndSortedSchools.length)} z {filteredAndSortedSchools.length}
    {:else}
      Brak wyników
    {/if}
  </span>
</div>

{#if viewMode === 'table'}
<div class="table-card sf-card">
  <div class="table-header" class:hide-city={hideCityColumn}>
    {#each headers as header (header.key)}
      <button
        class="th"
        class:sorted={sortKey === header.key}
        class:align-right={header.align === "right"}
        onclick={() => sortBy(header.key)}
      >
        {header.label}
        {#if sortKey === header.key}
          <span class="sort-icon">{sortDirection === 1 ? "▲" : "▼"}</span>
        {:else}
          <span class="sort-icon sort-icon-hidden">▲</span>
        {/if}
      </button>
    {/each}
  </div>

  {#each paginatedSchools as school (school.id)}
    <div
      class="table-row"
      class:hide-city={hideCityColumn}
      role="link"
      tabindex="0"
      onclick={(e) => {
        const target = e.target;
        if (target instanceof Element && target.closest('a')) return;
        window.location.href = `/listing/${school.id}`;
      }}
      onkeydown={(e) => {
        const target = e.target;
        if (e.key === 'Enter' && !(target instanceof Element && target.closest('a'))) {
          window.location.href = `/listing/${school.id}`;
        }
      }}
    >
      <span class="td td--name">
        <a href="/listing/{school.id}" class="school-link">{school.name}</a>
        {#if school.styles.length > 0}
          <span class="style-tags">
            {#each school.styles as style (`${school.id}-${style}`)}
              <span class="style-tag">{style}</span>
            {/each}
          </span>
        {/if}
        {#if school.price != null || school.singleClassPrice != null || school.trialPrice === 0}
          <span class="name-meta">
            {#if school.price != null}
              <span class="inline-detail">{school.price} zł/mies.</span>
            {:else if school.singleClassPrice != null}
              <span class="inline-detail">{school.singleClassPrice} zł/wej.</span>
            {/if}
            {#if school.trialPrice === 0}
              <span class="trial-badge">Bezpłatne zajęcia próbne</span>
            {/if}
          </span>
        {/if}
      </span>

      {#if !hideCityColumn}
        <span class="td td--city">
          <span class="city-name">{school.city}</span>
          {#if school.address}
            <span class="city-address">{school.address}</span>
          {/if}
        </span>
      {/if}

      <span class="td td--rating">
        {#if school.rating != null}
          <span class="rating">{school.rating.toFixed(1)}</span>
          {#if school.reviews != null}
            <span class="review-count muted">({school.reviews})</span>
          {/if}
        {:else}
          <span class="muted">—</span>
        {/if}
      </span>

    </div>
  {:else}
    <div class="empty-state">
      Brak wyników — żadna ze szkół nie pasuje do wybranych kryteriów.
    </div>
  {/each}
</div>

{:else}
<!-- ══ Card View ══ -->
<div class="cards-grid">
  {#each paginatedSchools as school, i (school.id)}
    <a
      href="/listing/{school.id}"
      class="school-card sf-card sf-animate"
      style="animation-delay: {i * 30}ms"
    >
      <div class="card-top">
        <h3 class="card-name">{school.name}</h3>
        {#if !hideCityColumn}
          <span class="card-city">{school.city}</span>
        {/if}
        <span class="card-address">{school.address}</span>
      </div>

      {#if school.styles.length > 0}
        <div class="card-styles">
          {#each school.styles.slice(0, 4) as style (`${school.id}-card-${style}`)}
            <span class="style-tag">{style}</span>
          {/each}
          {#if school.styles.length > 4}
            <span class="style-tag style-tag--more">+{school.styles.length - 4}</span>
          {/if}
        </div>
      {/if}

      <div class="card-bottom">
        <div class="card-data">
          {#if school.price != null}
            <div class="card-price">
              <span class="card-price-value">{school.price} zł</span>
              <span class="card-price-label">/ miesiąc</span>
            </div>
          {/if}
          {#if school.singleClassPrice != null}
            <div class="card-single">
              <span class="card-single-value">{school.singleClassPrice} zł</span>
              <span class="card-price-label">/ wejście</span>
            </div>
          {/if}
        </div>

        <div class="card-meta-right">
          {#if school.rating != null}
            <span class="card-rating">{school.rating.toFixed(1)}</span>
            {#if school.reviews != null}
              <span class="card-reviews">({school.reviews})</span>
            {/if}
          {/if}
        </div>
      </div>

      {#if school.trialPrice === 0}
        <div class="card-badge">Darmowe pierwsze zajęcia</div>
      {/if}
    </a>
  {:else}
    <div class="empty-state">
      Brak wyników — żadna ze szkół nie pasuje do wybranych kryteriów.
    </div>
  {/each}
</div>
{/if}

<Pagination {currentPage} {totalPages} onPageChange={handlePageChange} />

<style>
  /* ── Results summary ── */
  .pg-summary {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--spacing-xs);
  }

  .pg-summary-text {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sf-muted);
  }

  /* ── Filter bar ── */
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    align-items: center;
    margin-bottom: var(--spacing-md);
    justify-content: space-between;
  }

  .filter-left {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    align-items: center;
    flex: 1;
    min-width: 0;
  }

  .filter-label {
    font-family: var(--font-body);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
    margin-right: var(--spacing-xs);
  }

  .filter-btn {
    background: var(--sf-card);
    color: var(--sf-dark);
    border: 1px solid var(--sf-line);
    padding: 5px 12px;
    font-family: var(--font-body);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    font-weight: 500;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: var(--radius-pill);
    transition: border-color var(--dur-fast) ease, color var(--dur-fast) ease, background-color var(--dur-fast) ease;
  }

  .filter-btn:hover {
    border-color: var(--sf-accent);
    color: var(--sf-accent);
  }

  .filter-btn.active {
    background: var(--sf-accent);
    color: #ffffff;
    border-color: var(--sf-accent);
    font-weight: 600;
  }

  /* ── Table card wrapper ── */
  .table-card {
    overflow-x: auto;
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-lg);
  }

  .table-card:hover {
    transform: none;
    box-shadow: none;
  }

  /* ── Grid columns ── */
  .table-header,
  .table-row {
    display: grid;
    grid-template-columns: 4fr 1.2fr 0.6fr;
    align-items: center;
    padding: 0 var(--spacing-md);
    min-width: 480px;
  }

  .table-header.hide-city,
  .table-row.hide-city {
    grid-template-columns: 4.5fr 0.6fr;
  }

  /* ── Header row ── */
  .table-header {
    border-bottom: 1px solid var(--sf-line);
  }

  .th {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--sf-muted);
    font-weight: 600;
    padding: 14px 8px;
    background: none;
    border: none;
    cursor: pointer;
    user-select: none;
    text-align: left;
    transition: color var(--dur-fast) ease;
  }

  .th:hover {
    color: var(--sf-dark);
  }

  .th.sorted {
    color: var(--sf-dark);
  }

  .th.align-right {
    text-align: right;
  }

  .sort-icon {
    font-size: 0.58rem;
    margin-left: 3px;
    display: inline-block;
    vertical-align: baseline;
  }

  .sort-icon-hidden {
    opacity: 0;
  }

  /* ── Data rows ── */
  .table-row {
    border-bottom: 1px solid var(--sf-frost);
    cursor: pointer;
    transition: background var(--dur-fast) ease;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row:hover {
    background: var(--sf-frost);
  }

  .table-row:focus-visible {
    outline: 2px solid var(--sf-warm);
    outline-offset: -2px;
  }

  /* ── Cells ── */
  .td {
    padding: 13px 8px;
    font-size: 0.88rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .td--name {
    font-weight: 600;
    color: var(--sf-dark);
    white-space: normal;
    line-height: 1.35;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .school-link {
    text-decoration: none;
    color: var(--sf-dark);
    transition: color var(--dur-fast) ease;
  }

  .school-link:hover {
    color: var(--sf-accent);
  }

  .school-link:visited {
    color: var(--sf-dark);
  }

  .td--city {
    display: flex;
    flex-direction: column;
    gap: 2px;
    white-space: nowrap;
  }

  .city-name {
    color: var(--sf-muted);
  }

  .city-address {
    font-size: 0.76rem;
    color: var(--sf-muted);
    opacity: 0.7;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .td--rating {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .name-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .inline-detail {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    color: var(--sf-muted);
    letter-spacing: 0.03em;
  }

  .trial-badge {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sf-warm);
    font-weight: 600;
  }

  .rating {
    font-weight: 600;
    color: var(--sf-warm);
  }

  .review-count {
    font-size: 0.8em;
    margin-left: 2px;
  }

  .style-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .style-tag {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border: 1px solid var(--sf-line);
    color: var(--sf-muted);
    padding: 1px 6px;
    font-weight: 500;
    border-radius: var(--radius-pill);
    white-space: nowrap;
  }

  /* ── View toggle ── */
  .view-toggle {
    display: flex;
    gap: 2px;
    background: var(--sf-frost);
    border-radius: var(--radius-sm);
    padding: 2px;
    flex-shrink: 0;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 30px;
    border: none;
    background: transparent;
    color: var(--sf-muted);
    cursor: pointer;
    border-radius: 4px;
    transition: all var(--dur-fast) ease;
  }

  .toggle-btn:hover {
    color: var(--sf-dark);
  }

  .toggle-active {
    background: var(--sf-card);
    color: var(--sf-dark);
    box-shadow: 0 1px 3px rgba(21, 29, 43, 0.08);
  }

  /* ── Card view ── */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
    margin-bottom: var(--spacing-lg);
  }

  .school-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: var(--spacing-md);
    text-decoration: none;
    position: relative;
  }

  .card-top {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .card-name {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 1rem;
    color: var(--sf-dark);
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .card-city {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sf-accent);
    font-weight: 600;
  }

  .card-address {
    font-size: 0.82rem;
    color: var(--sf-muted);
    line-height: 1.4;
  }

  .card-styles {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid var(--sf-frost);
  }

  .card-data {
    display: flex;
    gap: 16px;
  }

  .card-price,
  .card-single {
    display: flex;
    flex-direction: column;
  }

  .card-price-value {
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--sf-dark);
    font-variant-numeric: tabular-nums;
  }

  .card-single-value {
    font-weight: 500;
    font-size: 0.88rem;
    color: var(--sf-text);
    font-variant-numeric: tabular-nums;
  }

  .card-price-label {
    font-family: var(--font-mono);
    font-size: 0.56rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
  }

  .card-meta-right {
    text-align: right;
    display: flex;
    align-items: baseline;
    gap: 3px;
  }

  .card-rating {
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 500;
    color: var(--sf-warm);
    line-height: 1;
  }

  .card-reviews {
    font-size: 0.72rem;
    color: var(--sf-muted);
  }

  .card-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    font-family: var(--font-mono);
    font-size: 0.56rem;
    text-transform: uppercase;
    background: var(--sf-warm-bg);
    color: var(--sf-dark);
    border: 1px solid var(--sf-warm);
    padding: 2px 8px;
    font-weight: 600;
    border-radius: var(--radius-pill);
    letter-spacing: 0.04em;
  }

  .style-tag--more {
    background: var(--sf-frost);
    border-color: transparent;
    color: var(--sf-muted);
  }

  /* ── Empty state ── */
  .empty-state {
    text-align: center;
    padding: var(--spacing-xl) var(--spacing-md);
    font-family: var(--font-mono);
    color: var(--sf-muted);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* ── Responsive ── */
  @media (max-width: 600px) {
    .cards-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
