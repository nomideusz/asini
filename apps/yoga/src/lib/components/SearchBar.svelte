<script lang="ts">
  import { goto } from "$app/navigation";

  type CityCoord = { city: string; lat: number; lng: number };
  type SearchSchool = { id: string; name: string; city: string };

  let {
    cities = [],
    styles = [],
    schools = [],
    cityCoords = [],
  }: {
    cities: string[];
    styles: string[];
    schools?: SearchSchool[];
    cityCoords?: CityCoord[];
  } = $props();

  let query = $state("");
  let selectedStyle = $state("");
  let showSuggestions = $state(false);
  let locating = $state(false);

  const MAX_CITIES = 4;
  const MAX_SCHOOLS = 4;

  let matchingCities = $derived(
    query.length > 0
      ? cities.filter((c) =>
          c.toLowerCase().startsWith(query.toLowerCase())
        ).slice(0, MAX_CITIES)
      : []
  );

  let matchingSchools = $derived(
    query.length >= 2
      ? schools.filter((s) =>
          s.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, MAX_SCHOOLS)
      : []
  );

  let hasSuggestions = $derived(matchingCities.length > 0 || matchingSchools.length > 0);

  function handleSearch() {
    const city = cities.find(
      (c) => c.toLowerCase() === query.trim().toLowerCase()
    );
    const styleSlug = selectedStyle
      ? selectedStyle.toLowerCase().replace(/\s+/g, "-")
      : "";

    if (city && styleSlug) {
      goto(`/${city.toLowerCase()}?style=${encodeURIComponent(selectedStyle)}`);
    } else if (city) {
      goto(`/${city.toLowerCase()}`);
    } else if (styleSlug) {
      goto(`/category/${encodeURIComponent(styleSlug)}`);
    } else if (query.trim()) {
      goto(`/${query.trim().toLowerCase()}`);
    }
  }

  function selectCity(city: string) {
    query = city;
    showSuggestions = false;
    goto(`/${city.toLowerCase()}`);
  }

  function selectSchool(school: SearchSchool) {
    query = school.name;
    showSuggestions = false;
    goto(`/listing/${school.id}`);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      showSuggestions = false;
      handleSearch();
    }
    if (e.key === "Escape") {
      showSuggestions = false;
    }
  }

  function handleBlur() {
    setTimeout(() => {
      showSuggestions = false;
    }, 200);
  }

  function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function locateMe() {
    if (!navigator.geolocation || cityCoords.length === 0) return;
    locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let nearest = cityCoords[0];
        let minDist = Infinity;
        for (const cc of cityCoords) {
          const d = haversine(latitude, longitude, cc.lat, cc.lng);
          if (d < minDist) {
            minDist = d;
            nearest = cc;
          }
        }
        query = nearest.city;
        locating = false;
      },
      () => {
        locating = false;
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }
</script>

<div class="search-bar">
  <div class="search-inner">
    <div class="search-field search-field--city">
      <label for="city-input" class="search-label">Miasto lub szkoła</label>
      <div class="input-wrap">
        <input
          id="city-input"
          type="text"
          placeholder="np. Warszawa, Yoga Studio..."
          bind:value={query}
          onfocus={() => (showSuggestions = true)}
          onblur={handleBlur}
          onkeydown={handleKeydown}
          autocomplete="off"
        />
        {#if cityCoords.length > 0}
          <button
            type="button"
            class="locate-btn"
            onclick={locateMe}
            disabled={locating}
            aria-label="Znajdź najbliższe miasto"
            title="Znajdź najbliższe miasto"
          >
            {#if locating}
              <svg class="locate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/></svg>
            {:else}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="2.5" fill="currentColor"/><path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.2"/></svg>
            {/if}
          </button>
        {/if}
        {#if showSuggestions && hasSuggestions}
          <ul class="suggestions" role="listbox">
            {#if matchingCities.length > 0}
              <li class="suggestion-group" role="presentation">Miasta</li>
              {#each matchingCities as city (city)}
                <li role="option" aria-selected="false">
                  <button
                    type="button"
                    class="suggestion-btn"
                    onmousedown={() => selectCity(city)}
                  >
                    <svg class="suggestion-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="6" r="1.5" fill="currentColor"/></svg>
                    {city}
                  </button>
                </li>
              {/each}
            {/if}
            {#if matchingSchools.length > 0}
              <li class="suggestion-group" role="presentation">Szkoły</li>
              {#each matchingSchools as school (school.id)}
                <li role="option" aria-selected="false">
                  <button
                    type="button"
                    class="suggestion-btn"
                    onmousedown={() => selectSchool(school)}
                  >
                    <svg class="suggestion-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="4" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M5 4V2.5A1.5 1.5 0 0 1 6.5 1h3A1.5 1.5 0 0 1 11 2.5V4" stroke="currentColor" stroke-width="1.2"/></svg>
                    <span>
                      {school.name}
                      <span class="suggestion-city">{school.city}</span>
                    </span>
                  </button>
                </li>
              {/each}
            {/if}
          </ul>
        {/if}
      </div>
    </div>

    <div class="search-divider"></div>

    <div class="search-field search-field--style">
      <label for="style-select" class="search-label">Styl jogi</label>
      <select id="style-select" bind:value={selectedStyle}>
        <option value="">Wszystkie style</option>
        {#each styles as style (style)}
          <option value={style}>{style}</option>
        {/each}
      </select>
    </div>

    <button class="search-go" onclick={handleSearch} aria-label="Szukaj">
      Szukaj
    </button>
  </div>
</div>

<style>
  .search-bar {
    padding: 8px 0 12px;
  }

  .search-inner {
    display: flex;
    align-items: stretch;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-lg);
    overflow: visible;
    position: relative;
    box-shadow: var(--shadow-sm);
    transition: border-color var(--dur-med) ease, box-shadow var(--dur-med) ease;
  }

  .search-inner:focus-within {
    border-color: var(--sf-accent);
    box-shadow: var(--shadow-md);
  }

  .search-field {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 14px 20px;
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .search-field--city {
    flex: 1.6;
  }

  .search-field--style {
    flex: 1;
  }

  .search-label {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--sf-muted);
    font-weight: 600;
    margin-bottom: 4px;
  }

  .search-field input,
  .search-field select {
    font-family: var(--font-body);
    font-size: 0.95rem;
    color: var(--sf-dark);
    border: none;
    outline: none;
    background: transparent;
    width: 100%;
    padding: 0;
    line-height: 1.4;
  }

  .search-field input::placeholder {
    color: var(--sf-muted);
    opacity: 0.6;
  }

  .search-field select {
    appearance: none;
    cursor: pointer;
    padding-right: 18px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7a8f' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0 center;
  }

  .search-divider {
    width: 1px;
    background: var(--sf-line);
    align-self: stretch;
    margin: 12px 0;
  }

  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .input-wrap input {
    flex: 1;
    min-width: 0;
  }

  .locate-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    background: var(--sf-frost, #eef2f7);
    border-radius: 50%;
    color: var(--sf-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: color var(--dur-fast) ease, background var(--dur-fast) ease;
  }

  .locate-btn:hover:not(:disabled) {
    color: var(--sf-accent);
    background: var(--sf-ice, #e1e9f2);
  }

  .locate-btn:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  @keyframes locate-spin {
    to { transform: rotate(360deg); }
  }

  .locate-spin {
    animation: locate-spin 0.8s linear infinite;
  }

  .suggestions {
    position: absolute;
    top: calc(100% + 8px);
    left: -20px;
    right: -20px;
    background: var(--sf-card);
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    list-style: none;
    z-index: 100;
    max-height: 320px;
    overflow-y: auto;
    padding: 4px 0;
  }

  .suggestion-group {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--sf-muted);
    font-weight: 600;
    padding: 10px 20px 4px;
  }

  .suggestion-btn {
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--sf-dark);
    padding: 8px 20px;
    cursor: pointer;
    transition: background var(--dur-fast) ease;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .suggestion-btn:hover {
    background: var(--sf-frost);
  }

  .suggestion-icon {
    flex-shrink: 0;
    color: var(--sf-muted);
  }

  .suggestion-city {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sf-muted);
    margin-left: 6px;
  }

  .search-go {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sf-accent);
    color: #ffffff;
    border: none;
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0 28px;
    cursor: pointer;
    border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
    transition: background var(--dur-fast) ease;
    white-space: nowrap;
    min-width: 110px;
  }

  .search-go:hover {
    background: var(--sf-accent-hover);
  }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .search-inner {
      flex-direction: column;
      border-radius: var(--radius-md);
    }

    .search-divider {
      width: 100%;
      height: 1px;
      margin: 0;
    }

    .search-go {
      border-radius: 0 0 var(--radius-md) var(--radius-md);
      padding: 14px 28px;
      min-width: unset;
    }

    .suggestions {
      left: 0;
      right: 0;
    }
  }
</style>
