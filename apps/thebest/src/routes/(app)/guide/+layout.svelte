<script lang="ts">
  import type { LayoutData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let {
    data,
    children,
  }: { data: LayoutData; children: import("svelte").Snippet } = $props();
  const t = i18n.t;
</script>

<div class="flex min-h-[calc(100vh-3.5rem)]">
  <!-- Desktop sidebar -->
  <aside
    class="hidden lg:flex flex-col w-64 p-5 gap-2 shrink-0"
    style="background: var(--asini-bg); border-right: 1px solid var(--asini-border); box-shadow: 4px 0 24px -12px rgba(0,0,0,0.05);"
  >
    <div
      class="text-xs font-semibold uppercase tracking-wider px-3 py-2"
      style="color: var(--asini-text-3);"
    >
      {t("guide_area")}
    </div>
    <ul class="flex flex-col gap-1">
      <li>
        <a
          class="rounded-(--asini-radius) py-2 px-3 text-sm font-medium hover:bg-(--asini-surface) transition-colors block"
          style="color: var(--asini-text);"
          href="/guide/dashboard">{t("guide_dashboard")}</a
        >
      </li>
      <li>
        <a
          class="rounded-(--asini-radius) py-2 px-3 text-sm font-medium hover:bg-(--asini-surface) transition-colors block"
          style="color: var(--asini-text);"
          href="/guide/tours">{t("guide_my_tours")}</a
        >
      </li>
      <li>
        <a
          class="rounded-(--asini-radius) py-2 px-3 text-sm font-medium hover:bg-(--asini-surface) transition-colors block"
          style="color: var(--asini-text);"
          href="/guide/bookings">{t("guide_bookings")}</a
        >
      </li>
      <li>
        <a
          class="rounded-(--asini-radius) py-2 px-3 text-sm font-medium hover:bg-(--asini-surface) transition-colors block"
          style="color: var(--asini-text);"
          href="/guide/settings">{t("guide_settings")}</a
        >
      </li>
    </ul>

    <div
      class="mt-auto flex items-center gap-3 px-3 py-3 rounded-(--asini-radius)"
      style="background: color-mix(in srgb, var(--asini-surface) 30%, transparent); border: 1px solid var(--asini-border);"
    >
      <div>
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white"
          style="background: var(--asini-accent);"
        >
          <span>{data.user.name.charAt(0).toUpperCase()}</span>
        </div>
      </div>
      <span class="text-sm font-medium flex-1 truncate">{data.user.name}</span>
      <form method="POST" action="/auth/logout">
        <button
          type="submit"
          class="asini-btn asini-btn-ghost asini-btn-sm"
          style="color: var(--asini-text-3);"
          title={t("nav_logout")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline
              points="16 17 21 12 16 7"
            ></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg
          >
        </button>
      </form>
    </div>
  </aside>

  <!-- Content area -->
  <div class="flex-1 overflow-auto" style="background: var(--asini-bg);">
    {@render children()}
  </div>

  <!-- Mobile bottom dock -->
  <nav
    class="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around h-14 lg:hidden"
    style="background: var(--asini-bg); border-top: 1px solid var(--asini-border);"
  >
    <a
      href="/guide/dashboard"
      class="flex flex-col items-center gap-0.5 text-xs transition-colors"
      style="color: var(--asini-text-2);"
    >
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
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
      <span>{t("guide_dashboard")}</span>
    </a>
    <a
      href="/guide/tours"
      class="flex flex-col items-center gap-0.5 text-xs transition-colors"
      style="color: var(--asini-text-2);"
    >
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
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <span>{t("guide_my_tours")}</span>
    </a>
    <a
      href="/guide/bookings"
      class="flex flex-col items-center gap-0.5 text-xs transition-colors"
      style="color: var(--asini-text-2);"
    >
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
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span>{t("guide_bookings")}</span>
    </a>
    <a
      href="/guide/settings"
      class="flex flex-col items-center gap-0.5 text-xs transition-colors"
      style="color: var(--asini-text-2);"
    >
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
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <span>{t("guide_settings")}</span>
    </a>
  </nav>
</div>
