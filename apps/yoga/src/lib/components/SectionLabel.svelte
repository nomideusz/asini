<script lang="ts">
  let { text = "" }: { text: string } = $props();
</script>

<h2 class="sf-section-label">{text}</h2>

<style>
  .sf-section-label {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--sf-accent);
    font-weight: 600;
    margin-bottom: 28px;
  }
</style>
