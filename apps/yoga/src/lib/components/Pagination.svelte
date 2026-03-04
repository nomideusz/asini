<script lang="ts">
  let {
    currentPage = 1,
    totalPages = 1,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  } = $props();

  // Build an array of page numbers/ellipsis markers to display
  let pageItems = $derived.by(() => {
    const items: (number | '...')[] = [];
    const total = totalPages;
    const current = currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) items.push(i);
      return items;
    }

    // Always show first page
    items.push(1);

    if (current > 3) {
      items.push('...');
    }

    // Pages around current
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      items.push(i);
    }

    if (current < total - 2) {
      items.push('...');
    }

    // Always show last page
    items.push(total);

    return items;
  });

  function goTo(page: number) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  }
</script>

{#if totalPages > 1}
  <nav class="pagination" aria-label="Paginacja">
    <button
      class="pg-btn pg-prev"
      disabled={currentPage === 1}
      onclick={() => goTo(currentPage - 1)}
      aria-label="Poprzednia strona"
    >
      ←
    </button>

    {#each pageItems as item}
      {#if item === '...'}
        <span class="pg-ellipsis">…</span>
      {:else}
        <button
          class="pg-btn pg-num"
          class:active={item === currentPage}
          onclick={() => goTo(item)}
          aria-label="Strona {item}"
          aria-current={item === currentPage ? 'page' : undefined}
        >
          {item}
        </button>
      {/if}
    {/each}

    <button
      class="pg-btn pg-next"
      disabled={currentPage === totalPages}
      onclick={() => goTo(currentPage + 1)}
      aria-label="Następna strona"
    >
      →
    </button>
  </nav>
{/if}

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: var(--spacing-md) 0;
    user-select: none;
  }

  .pg-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
    padding: 0 8px;
    border: 1px solid var(--sf-line);
    border-radius: var(--radius-pill, 999px);
    background: var(--sf-card);
    color: var(--sf-text);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition:
      border-color var(--dur-fast, 0.15s) ease,
      background var(--dur-fast, 0.15s) ease,
      color var(--dur-fast, 0.15s) ease,
      box-shadow var(--dur-fast, 0.15s) ease;
  }

  .pg-btn:hover:not(:disabled):not(.active) {
    border-color: var(--sf-accent);
    color: var(--sf-accent);
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.06));
  }

  .pg-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .pg-btn.active {
    background: var(--sf-accent);
    border-color: var(--sf-accent);
    color: #ffffff;
    font-weight: 600;
  }

  .pg-prev,
  .pg-next {
    font-size: 0.92rem;
    font-weight: 400;
  }

  .pg-ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 36px;
    color: var(--sf-muted);
    font-family: var(--font-mono);
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    pointer-events: none;
  }

  @media (max-width: 480px) {
    .pg-btn {
      min-width: 32px;
      height: 32px;
      font-size: 0.72rem;
    }
  }
</style>
