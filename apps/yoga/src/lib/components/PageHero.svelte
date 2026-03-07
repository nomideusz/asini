<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  let {
    tag = "",
    title = "",
    titleLines = [],
    subtitle = "",
    compact = false,
  }: {
    tag?: string;
    title?: string;
    titleLines?: string[];
    subtitle?: string;
    compact?: boolean;
  } = $props();

  let now = $state(new Date());
  let timer: ReturnType<typeof setInterval>;

  onMount(() => {
    timer = setInterval(() => {
      now = new Date();
    }, 1000);
  });

  onDestroy(() => clearInterval(timer));

  // Clock hand angles (degrees, 0 = 12 o'clock)
  const minuteDeg = $derived(now.getMinutes() * 6 + now.getSeconds() * 0.1);
  const hourDeg = $derived((now.getHours() % 12) * 30 + now.getMinutes() * 0.5);
</script>

<header class="sf-hero" class:sf-hero--compact={compact}>
  <div class="sf-hero-inner">
    {#if tag}
      <div class="sf-hero-tag">{tag}</div>
    {/if}
    <h1 class="sf-hero-title">{#if titleLines.length > 0}{#each titleLines as line, i}{line}{#if i < titleLines.length - 1}<br/>{/if}{/each}{:else}{title}{/if}</h1>
    <div class="sf-hero-line"></div>
    {#if subtitle}
      <p class="sf-hero-sub">{subtitle}</p>
    {/if}
  </div>

  <div class="sf-hero-clock" aria-hidden="true">
    <svg
      viewBox="0 0 280 280"
      width="250"
      height="250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Ring -->
      <circle
        cx="140"
        cy="140"
        r="130"
        stroke="var(--sf-ice)"
        stroke-width="1.2"
      />
      <!-- Hour hand -->
      <line
        x1={140 - 6 * Math.sin((hourDeg * Math.PI) / 180)}
        y1={140 + 6 * Math.cos((hourDeg * Math.PI) / 180)}
        x2={140 + 80 * Math.sin((hourDeg * Math.PI) / 180)}
        y2={140 - 80 * Math.cos((hourDeg * Math.PI) / 180)}
        stroke="var(--sf-ice)"
        stroke-width="2.4"
        stroke-linecap="round"
      />
      <!-- Minute hand -->
      <line
        x1={140 - 8 * Math.sin((minuteDeg * Math.PI) / 180)}
        y1={140 + 8 * Math.cos((minuteDeg * Math.PI) / 180)}
        x2={140 + 115 * Math.sin((minuteDeg * Math.PI) / 180)}
        y2={140 - 115 * Math.cos((minuteDeg * Math.PI) / 180)}
        stroke="var(--sf-ice)"
        stroke-width="2.4"
        stroke-linecap="round"
      />
      <!-- Center dot -->
      <circle cx="140" cy="140" r="2" fill="var(--sf-ice)" />
    </svg>
  </div>
</header>

<style>
  .sf-hero {
    position: relative;
    padding: clamp(40px, 8vh, 80px) 0 clamp(20px, 3vh, 36px);
  }

  .sf-hero--compact {
    padding: clamp(24px, 5vh, 48px) 0 clamp(16px, 3vh, 36px);
  }
  .sf-hero-inner {
    position: relative;
    z-index: 1;
    max-width: 720px;
  }

  .sf-hero-tag {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--sf-accent);
    font-weight: 600;
    margin-bottom: 20px;
  }

  .sf-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2.6rem, 6vw, 5rem);
    font-weight: 400;
    line-height: 1.08;
    color: var(--sf-dark);
    letter-spacing: -0.03em;
    margin-bottom: 28px;
  }

  .sf-hero--compact .sf-hero-title {
    font-size: clamp(2.2rem, 5vw, 3.8rem);
    margin-bottom: 20px;
  }

  .sf-hero-line {
    width: 48px;
    height: 2px;
    background: var(--sf-warm);
    margin-bottom: 24px;
  }

  .sf-hero-sub {
    color: var(--sf-text);
    max-width: 50ch;
    font-size: 1.02rem;
    line-height: 1.75;
  }

  /* ── Clock decoration ── */
  .sf-hero-clock {
    position: absolute;
    top: 12%;
    right: 0;
    opacity: 0.65;
    pointer-events: none;
  }

  @media (max-width: 860px) {
    .sf-hero-clock {
      display: none;
    }
  }
</style>
