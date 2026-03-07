<script lang="ts">
  import type { LayoutData } from "./$types.js";
  import { i18n } from "$lib/i18n.js";

  let {
    data,
    children,
  }: { data: LayoutData; children: import("svelte").Snippet } = $props();
  const t = i18n.t;
</script>

<div class="flex min-h-[calc(100vh-4rem)]">
  <!-- Desktop sidebar -->
  <aside
    class="hidden lg:flex flex-col w-56 bg-base-200 border-r border-base-300 p-4 gap-1 shrink-0"
  >
    <div
      class="text-xs font-semibold uppercase tracking-wider text-base-content/50 px-3 py-2"
    >
      {t("guide_area")}
    </div>
    <ul class="menu menu-sm gap-0.5">
      <li><a href="/guide/tours">{t("guide_my_tours")}</a></li>
      <li><a href="/guide/bookings">{t("guide_bookings")}</a></li>
      <li><a href="/guide/settings">{t("guide_settings")}</a></li>
    </ul>

    <div
      class="mt-auto flex items-center gap-2 px-3 py-2 border-t border-base-300"
    >
      <span class="text-sm flex-1 truncate">{data.user.name}</span>
      <form method="POST" action="/auth/logout">
        <button type="submit" class="btn btn-ghost btn-xs"
          >{t("nav_logout")}</button
        >
      </form>
    </div>
  </aside>

  <!-- Content area -->
  <div class="flex-1 overflow-auto">
    {@render children()}
  </div>

  <!-- Mobile bottom dock -->
  <nav class="dock dock-sm lg:hidden">
    <a href="/guide/tours" class="dock-item">
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
      <span class="dock-label">{t("guide_my_tours")}</span>
    </a>
    <a href="/guide/bookings" class="dock-item">
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
      <span class="dock-label">{t("guide_bookings")}</span>
    </a>
    <a href="/guide/settings" class="dock-item">
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
      <span class="dock-label">{t("guide_settings")}</span>
    </a>
  </nav>
</div>
