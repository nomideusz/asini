<script lang="ts">
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;
</script>

<div class="flex flex-col items-center justify-center min-h-[70vh] bg-(--asini-bg-subtle)">
  <div class="text-center max-w-2xl px-6">
    <div>
      <h1 class="text-xl sm:text-2xl font-semibold mb-4" style="color: var(--asini-text);">{t("home_title")}</h1>
      <p class="text-sm mb-8" style="color: var(--asini-text-2);">
        {t("home_subtitle")}
      </p>
      <div class="flex flex-wrap gap-4 justify-center">
        <a href="/tours" class="asini-btn asini-btn-primary asini-btn-lg">{t("home_explore")}</a>
        <a href="/auth/signup" class="asini-btn asini-btn-lg"
          >{t("home_become_guide")}</a
        >
      </div>
    </div>
  </div>
</div>
