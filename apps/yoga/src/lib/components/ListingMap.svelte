<script lang="ts">
  let {
    lat,
    lng,
    name = '',
    apiKey = '',
  }: {
    lat: number;
    lng: number;
    name?: string;
    apiKey: string;
  } = $props();

  let mapEl: HTMLDivElement | undefined = $state();
  let loaded = $state(false);
  let error = $state(false);

  function loadGoogleMaps(): Promise<void> {
    if ((window as any).google?.maps?.Map) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).google?.maps?.Map) {
          resolve();
        } else {
          reject(new Error('Google Maps loaded but API not available'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });
  }

  function initMap() {
    if (!mapEl) return;

    const position = { lat, lng };
    const map = new google.maps.Map(mapEl, {
      center: position,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'water', stylers: [{ color: '#dce8f0' }] },
        { featureType: 'landscape', stylers: [{ color: '#f4f6f8' }] },
        { featureType: 'road', stylers: [{ visibility: 'simplified' }, { color: '#e8ecf0' }] },
        { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'on' }] },
        { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#d4dce4' }] },
      ],
    });

    new google.maps.Marker({
      position,
      map,
      title: name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3d7ce0',
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2.5,
      },
    });
  }

  $effect(() => {
    if (!apiKey || !mapEl) return;
    loadGoogleMaps()
      .then(() => {
        loaded = true;
        initMap();
      })
      .catch((err) => {
        console.error('[ListingMap]', err);
        error = true;
      });
  });
</script>

<div class="listing-map-wrap">
  <div class="listing-map" bind:this={mapEl}>
    {#if !loaded && !error}
      <div class="map-placeholder">
        <span class="map-loading">Wczytywanie mapy...</span>
      </div>
    {/if}
    {#if error}
      <div class="map-placeholder">
        <span class="map-error">Nie udało się załadować mapy</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .listing-map-wrap {
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .listing-map {
    width: 100%;
    height: 260px;
    background: var(--sf-frost, #eef2f7);
    position: relative;
  }

  .map-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .map-loading,
  .map-error {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sf-muted);
  }
</style>
