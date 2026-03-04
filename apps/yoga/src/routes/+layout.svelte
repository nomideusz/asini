<script>
  import "../app.css";
  import { setLabels } from "@nomideusz/svelte-calendar";

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
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="app">
  <div class="sf-topline"></div>
  <header class="site-header">
    <div class="site-logo">
      <a href="/">szkolyjogi.pl</a>
    </div>
    <nav class="site-nav">
      <a href="/about">O nas</a>
      <a href="/post">Dodaj studio</a>
    </nav>
  </header>

  <main>
    {@render children()}
  </main>

  <footer class="site-footer">
    <span class="footer-copy">&copy; 2026 szkolyjogi.pl — Katalog Szkół Jogi w Polsce</span>
    <div class="footer-links">
      <a href="/terms">Regulamin</a>
      <a href="/about">O projekcie</a>
    </div>
  </footer>
</div>
