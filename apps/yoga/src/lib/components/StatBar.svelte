<script lang="ts">
  type Stat = { value: string | number; label: string };
  let { stats = [] }: { stats: Stat[] } = $props();
</script>

<section class="sf-stats">
  {#each stats as stat, i}
    <div class="sf-stat">
      <span class="sf-stat-num">{stat.value}</span>
      <span class="sf-stat-label">{stat.label}</span>
    </div>
    {#if i < stats.length - 1}
      <div class="sf-stat-divider"></div>
    {/if}
  {/each}
</section>

<style>
  .sf-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 44px;
    padding: 44px 0;
    max-width: 760px;
    margin: 0 auto;
    border-top: 1px solid var(--sf-line);
    border-bottom: 1px solid var(--sf-line);
  }

  .sf-stat {
    text-align: center;
  }

  .sf-stat-num {
    display: block;
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 500;
    color: var(--sf-dark);
    letter-spacing: -0.02em;
    line-height: 1;
    margin-bottom: 6px;
  }

  .sf-stat-label {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--sf-muted);
    font-weight: 500;
  }

  .sf-stat-divider {
    width: 1px;
    height: 36px;
    background: var(--sf-line);
  }

  @media (max-width: 560px) {
    .sf-stats {
      gap: 20px;
    }

    .sf-stat-num {
      font-size: 1.6rem;
    }
  }
</style>
