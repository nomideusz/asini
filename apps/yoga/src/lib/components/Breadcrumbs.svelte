<script lang="ts">
  type Crumb = { label: string; href?: string };
  let { crumbs = [] }: { crumbs: Crumb[] } = $props();
</script>

<nav class="sf-crumbs" aria-label="Breadcrumb">
  {#each crumbs as crumb, i}
    {#if crumb.href}
      <a href={crumb.href}>{crumb.label}</a>
    {:else}
      <span class="sf-crumbs-current">{crumb.label}</span>
    {/if}
    {#if i < crumbs.length - 1}
      <span class="sf-crumbs-sep">/</span>
    {/if}
  {/each}
</nav>

<style>
  .sf-crumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sf-muted);
    margin-bottom: var(--spacing-lg);
  }

  .sf-crumbs a {
    color: var(--sf-muted);
    text-decoration: none;
    transition: color var(--dur-fast) ease;
  }

  .sf-crumbs a:hover {
    color: var(--sf-accent);
  }

  .sf-crumbs-sep {
    opacity: 0.35;
    font-size: 0.85em;
  }

  .sf-crumbs-current {
    color: var(--sf-dark);
    font-weight: 600;
  }
</style>
