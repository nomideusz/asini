<script lang="ts">
  type CityMarker = { city: string; lat: number; lng: number; count: number };

  let {
    cities = [],
    apiKey = '',
  }: {
    cities: CityMarker[];
    apiKey: string;
  } = $props();

  let mapEl: HTMLDivElement | undefined = $state();
  let mapInstance: google.maps.Map | undefined = $state(undefined);
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
    if (!mapEl || cities.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    cities.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));

    mapInstance = new google.maps.Map(mapEl, {
      center: bounds.getCenter(),
      zoom: 6,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'water', stylers: [{ color: '#dce8f0' }] },
        { featureType: 'landscape', stylers: [{ color: '#f4f6f8' }] },
        { featureType: 'road', stylers: [{ visibility: 'simplified' }, { color: '#e8ecf0' }] },
        { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#d4dce4' }] },
        { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#6b7a8f' }] },
      ],
    });

    mapInstance.fitBounds(bounds, { top: 20, bottom: 20, left: 20, right: 20 });

    for (const c of cities) {
      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map: mapInstance,
        title: `${c.city} (${c.count})`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: Math.max(8, Math.min(20, 6 + c.count * 1.5)),
          fillColor: '#3d7ce0',
          fillOpacity: 0.85,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:4px 2px">
          <strong style="font-size:14px">${c.city}</strong><br>
          <span style="font-size:12px;color:#6b7a8f">${c.count} ${c.count === 1 ? 'szkoła' : c.count <= 4 ? 'szkoły' : 'szkół'}</span>
        </div>`,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance, marker);
      });
    }
  }

  $effect(() => {
    if (!apiKey || !mapEl) return;
    loadGoogleMaps()
      .then(() => {
        loaded = true;
        initMap();
      })
      .catch((err) => {
        console.error('[CityMap]', err);
        error = true;
      });
  });
</script>

<div class="city-map-wrap">
  <div class="city-map" bind:this={mapEl}>
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
  .city-map-wrap {
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .city-map {
    width: 100%;
    height: 380px;
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

  @media (max-width: 640px) {
    .city-map {
      height: 280px;
    }
  }
</style>
