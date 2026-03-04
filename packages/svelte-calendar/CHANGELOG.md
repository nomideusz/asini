# Changelog

## 0.6.3 — 2026-03-02

### Fixed
- **Mobile agenda day cutoff** — events at the bottom of the agenda day view were clipped on mobile; added `min-height: 0` to the scroll body and reduced excess top padding.

### Changed
- **CI: unified release workflow** — single workflow handles tag creation, GitHub Release, and npm publish via OIDC trusted publishing (Node 24).

## 0.6.1 — 2026-03-02

### Added
- **PlannerDay & MobileDay "Up next" badge** — the next upcoming event today now shows a dashed-border highlight and an "Up next" label, complementing the existing "NOW" live indicator for current events.

## 0.6.0 — 2026-03-02

### Added
- **Smart auto-theme engine** — the default `auto` theme now probes the host page at mount time (background color, accent/brand color, fonts, light/dark mode) and generates matching `--dt-*` CSS tokens automatically. Reactively watches for host theme changes (e.g. dark-mode toggle). Fine-tune with `autoTheme={{ mode, accent, font }}` or disable probing with `autoTheme={false}`.
- **Mobile views** — new `MobileDay` (vertical time grid with swipe navigation, all-day chips, tap-to-create) and `MobileWeek` (vertical day-list with relative date labels). Automatically activated on narrow screens (`<768px`) via `mobile="auto"` (default). Force with `mobile={true/false}`.
- **Centralized mobile header** — `Calendar.svelte` renders a unified mobile header with prev/next navigation, Day/Week mode pills, date label, and a "Today" pill (shown below the header to avoid layout shift).
- **`mobile` prop** on Calendar: `'auto'` (detect via matchMedia), `true` (always mobile), or `false` (always desktop).
- **`autoTheme` prop** on Calendar: `{ mode?, accent?, font? }` to override auto-detection, or `false` to disable.
- **`probeHostTheme()` / `observeHostTheme()` exports** — auto-theme utilities available for external use.
- **`generatePalette()` export** — generate theme-harmonious event color palettes from any accent color.

### Changed
- **Planner views** remapped to Mobile views on small screens — Planner Day/Week automatically switch to MobileDay/MobileWeek when `mobile` is active. Agenda views keep their list-based layout but hide desktop floating navigation.
- **AgendaWeek** — day headers now use full weekday and month names (e.g. "Monday, March 2" instead of "Mon, Mar 2"). Event counts removed from headers.
- **AgendaDay / AgendaWeek** — desktop floating nav pills (Today/←/→) and date labels hidden on mobile; the centralized Calendar header handles navigation.
- **Calendar "Today" button** — moved from the header row to a separate bar below, eliminating layout shift when it appears/disappears.
- **MobileDay gutter** — reduced from 52px to 40px for a tighter layout on small screens.
- **Demo page** — richer seed data, responsive layout improvements, theme picker updates.
- **Theme presets** — `auto` preset triggers the smart auto-theme engine instead of being a passive empty string.

### Fixed
- **MobileDay first hour cutoff** — added `padding-top` to the scroll container so the first hour label (offset by `top: -6px`) is no longer clipped.
- **Auto-theme race conditions** — background probe uses a hidden element to avoid flashing; surface hierarchy detection is robust across ancestor layers.
- **Text color contrast** — auto-theme validates detected text color against background luminance before applying.

## 0.5.1 — 2026-03-01

### Added
- **`CalendarLabels` i18n system** — all user-visible UI strings ("Today", "Day", "Week", "Now", "Free", "All day", "Up next", etc.) are now configurable via `setLabels()`. Override any subset of labels for full localisation — unset keys fall back to English defaults.
- **`CalendarLabels` interface** — typed interface covering 30+ static labels and 5 parameterised functions (`nMore`, `nEvents`, `nCompleted`, `dayNOfTotal`, `percentComplete`).
- **`setLabels(overrides)`** — merge partial label overrides at runtime.
- **`resetLabels()`** — restore all labels to English defaults.
- **`getLabels()`** — read current active labels.
- **`defaultLabels` export** — the full English label set, useful as a reference when building translations.
- 10 new tests covering label get/set/reset, dynamic functions, overrides, and integration with `fmtDay()`.

### Changed
- `fmtDay()` now uses `CalendarLabels` for "Today", "Yesterday", "Tomorrow" instead of hardcoded strings.
- All primitives (`NowIndicator`, `EventBlock`, `EmptySlot`) read labels via `getLabels()` for visible text and `aria-label` attributes.
- `Calendar.svelte` — Day/Week granularity pills and `aria-label` attributes use labels.
- `AgendaDay` / `AgendaWeek` — section headers (Done, Now, Free, Up next, No events), navigation buttons (Today, Previous/Next day/week), empty states, and all `aria-label` strings use labels.
- `PlannerDay` / `PlannerWeek` — navigation, all-day banners, overflow counts, in-progress markers, and `aria-label` strings use labels.
- `CalendarWidget` — default view registrations use `L.planner` / `L.agenda` labels.

## 0.5.0 — 2026-03-01

> **Active development** — this library is under active development. APIs may evolve between minor versions. Pin your version if you need stability.

### Added
- **Planner view** — new `Planner` component with `mode: 'day'` (horizontal filmstrip timeline) and `mode: 'week'` (multi-week vertical scroll). Replaces the previous DayGrid/WeekGrid approach with a cleaner, more focused design.
- **AgendaDay view** — dedicated single-day agenda with three-section layout: Done (past events + now indicator), Queue (upcoming today), and Plan (future days). Past events render above the NOW strip in a merged column.
- **AgendaWeek view** — rolling 7-day agenda with day grouping and relative date labels (Today, Tomorrow, Yesterday, etc.).
- **Floating pill navigation** — all views now use a consistent frosted-glass pill-nav pattern for Today/←/→ controls. Today pill smoothly hides when today is already in view and slides in when navigated away.
- **Scroll-tracking date label** — PlannerDay shows a floating date pill (full weekday + date) that updates as the user scrolls through the timeline. AgendaDay shows a matching date pill for the focused date.
- **`WeekSchedule` convenience component** — moved to `$lib/convenience/` as a standalone zero-config weekly schedule wrapper.
- **`fmtTime()` / `fmtDuration()` utilities** — new locale-aware time and duration formatting functions exported from core.
- **Shared site header** — layout now includes a persistent header with logo, Demo/Docs navigation (with active state), and GitHub link across all pages.
- **Documentation page** (`/docs`) — new server-rendered docs page with markdown content, syntax-highlighted code blocks, and full typography styles.
- **Demo settings panel** — extracted to `Settings.svelte` route component with horizontal multi-column grid layout, theme picker, and view/locale/RTL/mondayStart controls.

### Changed
- **View architecture overhaul** — removed `DayGrid`, `DayTimeline`, `WeekGrid`, `WeekHeatmap`, and `Settings` view components. The library now ships `Planner` and `Agenda` as the two primary view families.
- **Simplified exports** — library barrel export trimmed from 30+ symbols to a focused public API. Removed internal time helpers (`DAY_MS`, `HOUR_MS`, `pad`, `fractionalHour`, etc.) and view-specific types (`WeekTimelineProps`, `DayTimelineProps`, `ViewDateRange`).
- **Theme presets reduced** — removed `parchment` and `indigo` presets; library ships `midnight`, `neutral`, and `bare`.
- `Toolbar` redesigned — cleaner view-selector pills with simplified styling.
- `Calendar` shell passes view-label context to conditionally show/hide navigation elements per view type.
- `ViewState` engine updated with refined focus-date management and granularity handling.
- Demo page (`+page.svelte`) streamlined — inline header removed (moved to layout), reduced padding, cleaner seed data.
- Docs page sidebar removed — navigation now handled by shared site header.

### Removed
- `DayGrid` component and day grid view.
- `DayTimeline` component and day timeline view.
- `WeekGrid` component and week grid view.
- `WeekHeatmap` component and week heatmap view.
- `Settings` view component (replaced by route-level demo component).
- `WeekSchedule` from views barrel (moved to convenience).
- `parchment` and `indigo` theme presets.
- Docs sidebar TOC navigation (replaced by shared header nav).
- Multiple internal time utilities and types from public API.

## 0.4.0 — 2026-02-26

> **Active development** — this library is under active development. APIs may evolve between minor versions. Pin your version if you need stability.

### Added
- **Horizontal settings panel** — settings now render as a compact multi-column grid (`auto-fit` columns) instead of a narrow vertical list. The calendar stays visible while adjusting options.
- **`enabledWhen` on range fields** — range sliders can reference a toggle key; when the toggle is off the sliders are disabled and dimmed (e.g. Visible Hours → Start/End Hour).
- **GitHub stars link** on the demo page header.
- **Active development notice** in README and CHANGELOG.
- **GitHub stars badge** in README.

### Changed
- Settings field groups flow in responsive CSS grid columns (`repeat(auto-fit, minmax(170px, 1fr))`) — adapts from 1 to 5 columns depending on viewport.
- Theme picker and ungrouped fields (demo mode, color strategy) render in a horizontal top bar instead of stacked sections.
- Theme pills now use the same `.stg-pill` styling as all other segment controls (unified design).
- Range controls stack vertically (label + value above, full-width slider below) so slider width is consistent regardless of label length.
- Toggle and select rows use `justify-content: space-between` so controls align in columns.
- Segment rows (e.g. Direction) stack vertically — label on top, pills below.
- Section titles use consistent styling across theme bar and grouped sections.
- Settings root no longer has a `max-width` cap — fills the container naturally.
- Direction field changed from segment pills to select dropdown to match Locale control.
- All `font` shorthand declarations using `inherit` replaced with separate `font-weight`/`font-size`/`line-height` properties (invalid CSS fix).
- Font sizes increased across the settings panel for better readability in the wide layout.
- Removed colored theme dots — theme pills now match standard pill design.

### Fixed
- Labels were far from controls due to `justify-content: space-between` on all rows — now layout varies by field type.
- Slider widths varied based on label text width — fixed by stacking label above slider.
- Start/End Hour sliders stayed interactive when Visible Hours toggle was off.
- Empty space on the right side of settings grid (`auto-fill` → `auto-fit`).
- Invalid CSS: `font: 600 9px / 1 inherit` shorthand replaced with individual properties.

## 0.3.1 — 2026-02-26

### Added
- **Theme-aware `autoColor`** — pass a hex accent string (e.g. `autoColor: '#6366f1'`) to `createMemoryAdapter` or `createRecurringAdapter` and the palette is generated via golden-angle hue rotation from that accent, with lightness adapted for dark/light themes. `autoColor: true` retains the original 15-color vivid palette.
- **`generatePalette(accent?, count?)` utility** — exported from core. Generates perceptually distinct, theme-harmonious hex colors from any accent. Falls back to the vivid palette when no accent is provided.
- **`VIVID_PALETTE` constant** — the original 15-color palette, now exported for direct use.
- **Subtitle & tags in all views** — `subtitle` and `tags` now render in WeekGrid, DayGrid, DayTimeline, and Agenda (all variants: eventCard, queue cards, plan cards, compact rows), not just EventBlock.
- **DayTimeline view** added to the demo's registered views.
- **`mondayStart` toggle** in the demo control panel, wired to all Calendar and WeekSchedule instances.
- Palette generator test suite (7 tests).

### Changed
- WeekGrid event blocks wrap to show subtitle (dimmed) and tag pills inline.
- DayGrid shows subtitle when block height > 48px, tags when > 72px.
- DayTimeline shows subtitle and tags inline with gap.
- Agenda eventCard, queue cards, plan cards, and compact rows all render subtitle and tags with matching CSS.
- Demo ColorMap tab now has three modes: **themed** (adapts to current theme accent), **vivid** (original fixed palette), and **colorMap** (manual mapping).
- Demo action bar shows tags in click feedback: `Clicked: Title (subtitle) [tag1, tag2]`.

## 0.3.0 — 2026-02-26

### Added
- **Recurring adapter** — `createRecurringAdapter(schedule)` auto-projects weekly `RecurringEvent` definitions onto concrete dates. Eliminates manual date fabrication for schedule-based apps.
- **`RecurringEvent` type** — `dayOfWeek` (1=Mon…7=Sun) + `startTime`/`endTime` strings, with `subtitle`, `tags`, `category`, `color`, and `data` fields.
- **`readOnly` prop** on `Calendar` — disables drag, resize, empty-slot creation, and mutation callbacks. `oneventclick` still fires.
- **`visibleHours` prop** on `Calendar` — `[startHour, endHour)` tuple to crop grids to relevant hours (e.g. `[6, 21]` for a yoga studio).
- **`subtitle` and `tags` on `TimelineEvent`** — `EventBlock` renders subtitle as secondary text and tags as accent-colored pills (card and row variants).
- **`colorMap` / `autoColor` on adapters** — `createMemoryAdapter` and `createRecurringAdapter` accept `{ colorMap, autoColor }` options. `colorMap` maps category/title → color; `autoColor` cycles a 15-color palette.
- **`WeekSchedule` convenience component** — single-import, zero-config weekly schedule display. Accepts `events` or `schedule` prop, pre-wires adapter + views + toolbar.
- **`MemoryAdapterOptions` type** exported from adapters.
- Comprehensive tests for recurring adapter (8 test cases).

### Changed
- `Calendar` shell now passes `readOnly` and `visibleHours` through to child view components.
- `WeekGrid` respects `readOnly` — disables cell-click creation and event drag.
- `WeekHeatmap` respects `visibleHours` — renders only specified hour range.
- Demo page (`+page.svelte`) rewritten as interactive feature showcase with theme/readOnly/visibleHours/colorMap toggles and 4 demo modes.

## 0.2.0 — 2026-02-25

### Added
- **Accessibility:** `role`, `aria-label`, `aria-current`, `tabindex`, keyboard Enter/Space on `EventBlock`, `EmptySlot`, `NowIndicator`.
- **Focus styles:** `:focus-visible` outlines on all interactive primitives.
- **Calendar `dir` prop** — `'ltr'` | `'rtl'` | `'auto'` for RTL layout support.
- **Calendar `locale` prop** — BCP 47 tag; auto-sets `lang` attribute and default locale for all formatting.
- **24-hour detection** — `fmtH()` now auto-detects 12h/24h based on locale via `Intl.DateTimeFormat`.
- **`is24HourLocale()` utility** exported from core for locale-aware hour formatting.
- **Time zone support** — new `timezone` option in `ViewStateOptions` and `CalendarAdapter` context; `toZonedTime()` / `fromZonedTime()` / `nowInZone()` utilities using `date-fns-tz`.
- **Extensible `CalendarViewId`** — changed from closed union to `string` type; any custom view ID now works without modifying the library.

### Changed
- Renamed package from `@svelte-calendar/core` to `@nomideusz/svelte-calendar`.
- `Calendar` shell `<div>` now renders `role="region"` and `aria-label="Calendar"`.
- `Toolbar` `<nav>` now has `aria-label="Calendar navigation"`.
- `NowIndicator` all modes now have `role="status"` and `aria-live="polite"`.
- Switched from npm to pnpm.

### Fixed
- README: removed fictional `DayAgenda`/`WeekAgenda` exports — the correct API is `Agenda` with `mode="day"|"week"`.
- README: added missing `Settings` component documentation.
- README: corrected all import paths to `@nomideusz/svelte-calendar`.
- CHANGELOG: corrected view names to match actual exports.

## 0.1.1 — 2026-02-25

### Fixed
- Corrected README view names and package references.
- Added `Settings` panel documentation to README.

## 0.1.0 — 2025-07-10

### Added
- **5 calendar views:** DayGrid, DayTimeline, WeekGrid, WeekHeatmap, Agenda (with `mode="day"|"week"`).
- **Settings panel** — `Settings` component with theme picker and dynamic range/toggle fields.
- **Calendar orchestrator** — unified shell with toolbar, concept-paired view switching, and navigation.
- **Engine modules** — `createEventStore`, `createViewState`, `createSelection`, `createDragState`.
- **Adapter pattern** — `createMemoryAdapter` (in-memory) and `createRestAdapter` (HTTP skeleton).
- **3 theme presets** — `midnight`, `parchment`, `indigo` via `--dt-*` CSS custom properties.
- **Shared primitives** — `EventBlock`, `EmptySlot`, `TimeGutter`, `DayHeader`, `NowIndicator`.
- **focusDate** prop wired from Calendar → all views for navigation.
- **oneventclick** / **oneventcreate** callbacks on views.
- **Selection highlighting** (`selectedEventId`) on all views.
- **Overlap layout** — column-packing algorithm for overlapping events in DayGrid and WeekGrid.
- Comprehensive TypeScript types and barrel re-exports.
