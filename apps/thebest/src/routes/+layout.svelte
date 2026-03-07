<script lang="ts">
  import "../app.css";
  import type { LayoutData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";
  import { LocaleSwitcher } from "@nomideusz/svelte-i18n";
  import { page } from "$app/state";

  let {
    data,
    children,
  }: { data: LayoutData; children: import("svelte").Snippet } = $props();
  const t = i18n.t;

  let menuOpen = $state(false);
  const isGuide = $derived(page.url.pathname.startsWith("/guide"));
</script>

<div class="flex flex-col min-h-screen">
  <!-- Navbar -->
  <header
    class="sticky top-0 z-50 flex items-center justify-between h-14 px-4 backdrop-blur-md border-b transition-all duration-300"
    style="background: color-mix(in srgb, var(--asini-bg) 80%, transparent); border-color: var(--asini-border);"
  >
    <div class="flex items-center gap-2">
      <!-- Mobile hamburger (public pages only, guide has its own bottom dock) -->
      {#if !isGuide}
      <button onclick={() => menuOpen = true} class="asini-btn asini-btn-ghost lg:hidden" aria-label="open sidebar">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      {/if}
      <a href="/" class="asini-btn asini-btn-ghost text-base font-semibold">thebest.travel</a>
    </div>

    {#if !isGuide}
      <div class="hidden lg:flex items-center">
        <div class="flex items-center gap-1">
          <a
            class="px-3 py-1.5 text-sm font-medium rounded-(--asini-radius) transition-colors hover:bg-(--asini-surface)"
            style="color: var(--asini-text-2);"
            href="/">{t("nav_home")}</a
          >
          <a
            class="px-3 py-1.5 text-sm font-medium rounded-(--asini-radius) transition-colors hover:bg-(--asini-surface)"
            style="color: var(--asini-text-2);"
            href="/tours">{t("nav_explore")}</a
          >
        </div>
      </div>
    {/if}

    <div class="flex items-center gap-3 pr-2">
      <LocaleSwitcher
        {i18n}
        labels={{ en: t("locale_en"), pl: t("locale_pl") }}
      />
      {#if !isGuide}
        {#if data.user}
          <div class="hidden sm:flex items-center gap-2">
            <a
              href="/guide/dashboard"
              class="asini-btn asini-btn-ghost asini-btn-sm"
              >{t("guide_area")}</a
            >
            <form method="POST" action="/auth/logout" class="inline">
              <button
                type="submit"
                class="asini-btn asini-btn-sm"
                >{t("nav_logout")}</button
              >
            </form>
          </div>
        {:else}
          <div class="hidden sm:flex items-center gap-2">
            <a href="/auth/login" class="asini-btn asini-btn-ghost asini-btn-sm"
              >{t("nav_login")}</a
            >
            <a
              href="/auth/signup"
              class="asini-btn asini-btn-primary asini-btn-sm"
              >{t("nav_signup")}</a
            >
          </div>
        {/if}
      {/if}
    </div>
  </header>

  <!-- Main content -->
  <main class="flex-1">
    {@render children()}
  </main>

  {#if !isGuide}
    <!-- Footer -->
    <footer
      class="flex items-center justify-center py-8 text-xs border-t"
      style="background: var(--asini-surface); border-color: var(--asini-border); color: var(--asini-text-2);"
    >
      <p class="text-sm">{t("footer_tagline")}</p>
    </footer>
  {/if}
</div>

<!-- Mobile sidebar overlay -->
{#if menuOpen}
  <!-- Overlay -->
  <button
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
    onclick={() => menuOpen = false}
    aria-label="close sidebar"
  ></button>
  <!-- Sidebar -->
  <nav
    class="fixed top-0 left-0 z-50 h-full w-64 p-5 flex flex-col gap-2 shadow-lg"
    style="background: var(--asini-bg);"
  >
    <a href="/" class="text-base font-semibold mb-4" onclick={() => menuOpen = false}>thebest.travel</a>
    <a href="/" class="px-3 py-2 text-sm rounded-(--asini-radius) hover:bg-(--asini-surface) transition-colors" style="color: var(--asini-text);" onclick={() => menuOpen = false}>{t("nav_home")}</a>
    <a href="/tours" class="px-3 py-2 text-sm rounded-(--asini-radius) hover:bg-(--asini-surface) transition-colors" style="color: var(--asini-text);" onclick={() => menuOpen = false}>{t("nav_explore")}</a>
    <div class="border-t my-2" style="border-color: var(--asini-border);"></div>
    {#if data.user}
      <a href="/guide/tours" class="px-3 py-2 text-sm rounded-(--asini-radius) hover:bg-(--asini-surface) transition-colors" style="color: var(--asini-text);" onclick={() => menuOpen = false}>{t("guide_area")}</a>
      <form method="POST" action="/auth/logout">
        <button type="submit" class="asini-btn asini-btn-ghost asini-btn-sm w-full justify-start">{t("nav_logout")}</button>
      </form>
    {:else}
      <a href="/auth/login" class="asini-btn asini-btn-ghost asini-btn-sm justify-start" onclick={() => menuOpen = false}>{t("nav_login")}</a>
      <a href="/auth/signup" class="asini-btn asini-btn-primary asini-btn-sm justify-start" onclick={() => menuOpen = false}>{t("nav_signup")}</a>
    {/if}
  </nav>
{/if}
