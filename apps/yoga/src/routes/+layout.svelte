<script lang="ts">
  import "../app.css";
  import { setLabels } from "@nomideusz/svelte-calendar";
  import { i18n } from "$lib/i18n.js";
  const t = i18n.t;

  setLabels({
    today: "Dziś",
    yesterday: "Wczoraj",
    tomorrow: "Jutro",
    day: "Dzień",
    week: "Tydzień",
    planner: "Grafik",
    agenda: "Lista",
    now: "teraz",
    free: "wolne",
    allDay: "Cały dzień",
    done: "Zakończone",
    upNext: "Nadchodzące",
    noEvents: "Brak zajęć",
    nothingScheduled: "Brak zaplanowanych zajęć",
    allDoneForToday: "Wszystkie zajęcia na dziś zakończone",
    goToToday: "Przejdź do dziś",
    previousWeek: "Poprzedni tydzień",
    nextWeek: "Następny tydzień",
    previousDay: "Poprzedni dzień",
    nextDay: "Następny dzień",
    calendar: "Kalendarz",
    nMore: (n) => `+${n} więcej`,
    nEvents: (n) => `${n} ${n === 1 ? "zajęcia" : "zajęć"}`,
  });

  let { children } = $props();
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    rel="preload"
    as="style"
    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&display=swap"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&display=swap"
    rel="stylesheet"
  />
  <link rel="alternate" hreflang="pl" href="https://szkolyjogi.pl/" />
  <link rel="alternate" hreflang="x-default" href="https://szkolyjogi.pl/" />
</svelte:head>

<div class="app">
  <a href="#main-content" class="sr-only sr-only-focusable"
    >{t("skip_to_content")}</a
  >
  <div class="sf-topline"></div>
  <header class="site-header">
    <div class="site-logo">
      <a href="/">szkolyjogi.pl</a>
    </div>
    <nav class="site-nav">
      <a href="/about">{t("nav_about")}</a>
      <a href="/post">{t("nav_add_studio")}</a>
    </nav>
  </header>

  <main id="main-content">
    {@render children()}
  </main>

  <footer class="site-footer">
    <span class="footer-copy">{t("footer_copyright")}</span>
    <div class="footer-links">
      <a href="/terms">{t("footer_terms")}</a>
      <a href="/about">{t("footer_about")}</a>
    </div>
  </footer>
</div>
