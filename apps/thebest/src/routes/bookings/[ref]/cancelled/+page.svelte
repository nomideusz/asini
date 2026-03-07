<script lang="ts">
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;
</script>

<section class="max-w-xl mx-auto px-4 py-12 text-center">
  <h1 class="text-2xl font-bold mb-4">{t("cancelled_title")}</h1>
  <p class="text-base-content/70 mb-6">
    {t("cancelled_refund_notice")}
  </p>
  <a href="/tours" class="btn btn-outline">{t("confirmed_browse_more")}</a>
</section>
