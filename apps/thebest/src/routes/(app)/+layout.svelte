<script lang="ts">
  import type { LayoutData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";
  import { LocaleSwitcher } from "@nomideusz/svelte-i18n";

  let {
    data,
    children,
  }: { data: LayoutData; children: import("svelte").Snippet } = $props();
  const t = i18n.t;
</script>

<!-- Minimal header -->
<header
  class="sticky top-0 z-50 flex items-center justify-between h-14 px-4 backdrop-blur-md border-b transition-all duration-300"
  style="background: color-mix(in srgb, var(--asini-bg) 80%, transparent); border-color: var(--asini-border);"
>
  <a href="/guide/dashboard" class="asini-btn asini-btn-ghost text-base font-semibold">thebest.travel</a>
  <div class="flex items-center gap-3 pr-2">
    <LocaleSwitcher
      {i18n}
      labels={{ en: t("locale_en"), pl: t("locale_pl") }}
    />
  </div>
</header>

{@render children()}
