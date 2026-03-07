<script lang="ts">
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;
</script>

<div class="hero min-h-[70vh] bg-base-200">
  <div class="hero-content text-center max-w-2xl">
    <div>
      <h1 class="text-5xl font-bold mb-4">{t("home_title")}</h1>
      <p class="text-lg text-base-content/70 mb-8">
        {t("home_subtitle")}
      </p>
      <div class="flex flex-wrap gap-4 justify-center">
        <a href="/tours" class="btn btn-primary btn-lg">{t("home_explore")}</a>
        <a href="/auth/signup" class="btn btn-outline btn-lg"
          >{t("home_become_guide")}</a
        >
      </div>
    </div>
  </div>
</div>
