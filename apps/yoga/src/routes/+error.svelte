<script lang="ts">
  import { page } from "$app/state";
</script>

<svelte:head>
  <title>Błąd {page.status} | szkolyjogi.pl</title>
</svelte:head>

<section class="error-shell">
  <div class="error-card sf-card">
    <p class="error-kicker">Błąd systemu</p>
    <h1 class="error-title">{page.status}</h1>
    <p class="error-message">{page.error?.message || "Nie znaleziono żądanej strony."}</p>
    <a href="/" class="primary-button">Wróć na stronę główną</a>
  </div>
</section>

<style>
  .error-shell {
    min-height: 65vh;
    display: grid;
    place-items: center;
    padding: clamp(32px, 5vh, 72px) clamp(24px, 5vw, 80px);
  }

  .error-card {
    width: min(620px, 100%);
    padding: clamp(28px, 4vw, 44px);
  }

  .error-card:hover {
    transform: none;
    box-shadow: none;
  }

  .error-kicker {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--sf-accent);
    margin-bottom: 14px;
    font-weight: 600;
  }

  .error-title {
    font-family: var(--font-display);
    font-size: clamp(3rem, 9vw, 4.8rem);
    line-height: 1;
    letter-spacing: -0.03em;
    color: var(--sf-dark);
    margin-bottom: 14px;
    font-weight: 400;
  }

  .error-message {
    color: var(--sf-muted);
    margin-bottom: 28px;
    line-height: 1.7;
  }
</style>
