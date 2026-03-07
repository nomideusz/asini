<script lang="ts">
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;
</script>

<section class="max-w-xl mx-auto px-4 py-12 text-center">
  <h1 class="text-2xl font-bold mb-4" style="color: var(--asini-text);">{t("cancelled_title")}</h1>
  <p class="mb-6" style="color: var(--asini-text-2);">
    {t("cancelled_refund_notice")}
  </p>
  <a href="/tours" class="asini-btn">{t("confirmed_browse_more")}</a>
</section>
