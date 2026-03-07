<script lang="ts">
  import "../app.css";
  import type { LayoutData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";
  import { LocaleSwitcher } from "@nomideusz/svelte-i18n";

  let {
    data,
    children,
  }: { data: LayoutData; children: import("svelte").Snippet } = $props();
  const t = i18n.t;
</script>

<!-- Mobile drawer wrapper -->
<div class="drawer">
  <input id="main-drawer" type="checkbox" class="drawer-toggle" />

  <div class="drawer-content flex flex-col min-h-screen">
    <!-- Navbar -->
    <header
      class="navbar bg-base-100 border-b border-base-200 sticky top-0 z-50"
    >
      <div class="navbar-start">
        <!-- Mobile hamburger -->
        <label for="main-drawer" class="btn btn-ghost drawer-button lg:hidden">
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
        </label>
        <a href="/" class="btn btn-ghost text-xl font-bold">thebest.travel</a>
      </div>

      <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal px-1 gap-1">
          <li><a href="/">{t("nav_home")}</a></li>
          <li><a href="/tours">{t("nav_explore")}</a></li>
        </ul>
      </div>

      <div class="navbar-end gap-2">
        <LocaleSwitcher
          {i18n}
          labels={{ en: t("locale_en"), pl: t("locale_pl") }}
        />
        {#if data.user}
          <a href="/guide/tours" class="btn btn-ghost btn-sm"
            >{t("guide_area")}</a
          >
          <form method="POST" action="/auth/logout" class="inline">
            <button type="submit" class="btn btn-outline btn-sm"
              >{t("nav_logout")}</button
            >
          </form>
        {:else}
          <a href="/auth/login" class="btn btn-ghost btn-sm">{t("nav_login")}</a
          >
          <a href="/auth/signup" class="btn btn-primary btn-sm"
            >{t("nav_signup")}</a
          >
        {/if}
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1">
      {@render children()}
    </main>

    <!-- Footer -->
    <footer
      class="footer footer-center bg-base-200 border-t border-base-300 p-6 text-base-content/70"
    >
      <p class="text-sm">{t("footer_tagline")}</p>
    </footer>
  </div>

  <!-- Mobile drawer sidebar -->
  <div class="drawer-side z-50">
    <label for="main-drawer" aria-label="close sidebar" class="drawer-overlay"
    ></label>
    <ul class="menu bg-base-100 min-h-full w-64 p-4 gap-1">
      <li class="menu-title text-lg font-bold mb-2">
        <a href="/">thebest.travel</a>
      </li>
      <li><a href="/">{t("nav_home")}</a></li>
      <li><a href="/tours">{t("nav_explore")}</a></li>
      <div class="divider"></div>
      {#if data.user}
        <li><a href="/guide/tours">{t("guide_area")}</a></li>
        <li>
          <form method="POST" action="/auth/logout">
            <button
              type="submit"
              class="btn btn-ghost btn-sm justify-start w-full text-left"
              >{t("nav_logout")}</button
            >
          </form>
        </li>
      {:else}
        <li>
          <a href="/auth/login" class="btn btn-ghost btn-sm justify-start"
            >{t("nav_login")}</a
          >
        </li>
        <li>
          <a href="/auth/signup" class="btn btn-primary btn-sm justify-start"
            >{t("nav_signup")}</a
          >
        </li>
      {/if}
    </ul>
  </div>
</div>
