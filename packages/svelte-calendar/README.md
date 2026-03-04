# @nomideusz/svelte-calendar

A themeable **Svelte 5** calendar with **Day/Week Planner & Agenda** views, touch-first mobile views, and a smart auto-theme that adapts to any page.

## Installation

```bash
pnpm add @nomideusz/svelte-calendar
```

> Requires Svelte 5 (`^5.0.0`)

## Quick Start

```svelte
<script>
  import { Calendar, createMemoryAdapter } from '@nomideusz/svelte-calendar';

  const adapter = createMemoryAdapter([
    { id: '1', title: 'Team Sync', start: new Date('2026-03-01T09:00'), end: new Date('2026-03-01T10:00') },
    { id: '2', title: 'Lunch',     start: new Date('2026-03-01T12:00'), end: new Date('2026-03-01T13:00') },
  ]);
</script>

<Calendar {adapter} />
```

That's it — 6 views (Day/Week × Planner, Agenda, Mobile), auto-coloring, drag-and-drop, all out of the box. The default `auto` theme probes your page's background, accent color, and fonts, so the calendar adapts to any design.

## Views

Switch between **Planner** (time grid) and **Agenda** (list) in Day or Week mode:

```svelte
<Calendar {adapter} view="week-planner" />  <!-- default -->
<Calendar {adapter} view="day-planner" />
<Calendar {adapter} view="week-agenda" />
<Calendar {adapter} view="day-agenda" />
```

Users can also switch via the built-in Day/Week pills.

Hide the pills when your app controls the view externally:

```svelte
<Calendar {adapter} view="day-planner" showModePills={false} />
```

## Mobile

On narrow screens (`< 768px`), the calendar automatically remaps Planner views to touch-first Mobile views with swipe navigation, a centralized header with Day/Week pills, and a compact layout:

```svelte
<!-- Auto-detect (default) — switches at 768px -->
<Calendar {adapter} />

<!-- Force mobile layout -->
<Calendar {adapter} mobile={true} />

<!-- Force desktop layout -->
<Calendar {adapter} mobile={false} />
```

Mobile views include:
- **MobileDay** — vertical time grid with hour labels, swipe left/right to change days, all-day event chips at the top, tap-to-create
- **MobileWeek** — vertical day list showing each day's events with relative labels (Today, Tomorrow, etc.)

Agenda views keep their list-based layout on mobile but hide desktop floating navigation in favor of the centralized header.

## Callbacks

```svelte
<Calendar
  {adapter}
  oneventclick={(event) => console.log('Clicked', event.title)}
  oneventcreate={(range) => console.log('New slot', range.start, range.end)}
  oneventmove={(event, start, end) => console.log('Moved', event.title, start, end)}
  onviewchange={(viewId) => console.log('View', viewId)}
/>
```

Set `readOnly` to disable drag, resize, and click-to-create:

```svelte
<Calendar {adapter} readOnly />
```

Hide nav controls (prev/next/today) and treat all days equally (no past-day dimming):

```svelte
<!-- Yoga studio: fixed weekly schedule, no browsing, all days equal -->
<Calendar
  {adapter}
  view="week-agenda"
  readOnly
  showNavigation={false}
  showDates={false}
  equalDays
/>
```

Hide weekends for a workweek view:

```svelte
<!-- Office planner: Mon–Fri only -->
<Calendar {adapter} view="week-planner" hideDays={[6, 7]} />
```

Control which date the calendar shows from your app:

```svelte
<script>
  let date = $state(new Date());
</script>

<Calendar
  {adapter}
  currentDate={date}
  ondatechange={(d) => date = d}
/>
```

Show a rolling 3-day view:

```svelte
<Calendar {adapter} view="week-planner" days={3} />
```

Block lunch hours and enforce 30–120 min events:

```svelte
<script>
  import type { BlockedSlot } from '@nomideusz/svelte-calendar';

  const blocked: BlockedSlot[] = [
    { start: 12, end: 13, label: 'Lunch' },          // every day 12–1 PM
    { day: 6, start: 0, end: 24, label: 'Saturday' }, // block all Saturday
  ];
</script>

<Calendar {adapter} blockedSlots={blocked} minDuration={30} maxDuration={120} />
```

Disable specific dates:

```svelte
<Calendar
  {adapter}
  disabledDates={[new Date('2026-03-25'), new Date('2026-04-01')]}
/>
```

Custom day headers and hover previews:

```svelte
<Calendar {adapter} oneventhover={(ev) => showTooltip(ev)}>
  {#snippet dayHeader({ date, isToday, dayName })}
    <span style:font-weight={isToday ? 'bold' : 'normal'}>{dayName}</span>
  {/snippet}
</Calendar>
```

## Themes

Three built-in presets:

| Preset | Description |
|--------|-------------|
| `auto` | **Default.** Probes the host page at mount — background, accent color, fonts, light/dark mode — and generates matching `--dt-*` tokens automatically. Reactively watches for host theme changes. |
| `neutral` | Explicit light theme. White bg, blue accent, inherits host fonts. Use when embedding standalone. |
| `midnight` | Explicit dark theme. Charcoal bg, red accent. |

```svelte
<script>
  import { Calendar, neutral, midnight } from '@nomideusz/svelte-calendar';
</script>

<Calendar {adapter} />                     <!-- auto: adapts to host page -->
<Calendar {adapter} theme={neutral} />     <!-- explicit light mode -->
<Calendar {adapter} theme={midnight} />    <!-- explicit dark mode -->
```

### Smart Auto Theme

The default `auto` preset probes the host page's design and generates a calendar that blends in — no configuration needed. It detects:

- **Background color** — from CSS variables, inline styles, or computed styles
- **Light/dark mode** — from background luminance
- **Accent/brand color** — from CSS variables (`--accent`, `--primary`, `--bs-primary`, etc.), link colors, or button colors
- **Text color** — validated for contrast against the background
- **Fonts** — inherited via CSS cascade

It also watches for changes (e.g. dark mode toggle) and updates automatically.

Fine-tune auto-detection with the `autoTheme` prop:

```svelte
<!-- Force dark mode even if the page background is light -->
<Calendar {adapter} autoTheme={{ mode: 'dark' }} />

<!-- Override the accent color (skip probing) -->
<Calendar {adapter} autoTheme={{ accent: '#e11d48' }} />

<!-- Override the font stack -->
<Calendar {adapter} autoTheme={{ font: '"Poppins", sans-serif' }} />

<!-- Combine overrides -->
<Calendar {adapter} autoTheme={{ mode: 'dark', accent: '#10b981' }} />

<!-- Disable auto-probing entirely (passive CSS inheritance only) -->
<Calendar {adapter} autoTheme={false} />
```

### Manual CSS Variables

Override any design token by setting `--dt-*` custom properties on an ancestor:

```html
<!-- Wrap in a div with your overrides -->
<div style="--dt-accent: #e11d48; --dt-bg: #1a1a2e; --dt-text: rgba(255,255,255,0.87);">
  <Calendar {adapter} />
</div>
```

Or set them at the page level:

```css
:root {
  --dt-bg: #fafafa;
  --dt-accent: #2563eb;
  --dt-text: rgba(0, 0, 0, 0.87);
  --dt-border: rgba(0, 0, 0, 0.08);
}
```

The auto-probe reads these first — if you set `--dt-bg` or `--accent` on `:root`, the calendar picks them up.

### Extending Presets

Build on a preset by appending overrides:

```ts
import { neutral } from '@nomideusz/svelte-calendar';

// neutral base + custom accent + rounded feel
const custom = `${neutral}; --dt-accent: #e11d48;`;
```

```svelte
<Calendar {adapter} theme={custom} />
```

<details>
<summary>All design tokens</summary>

| Token | Purpose |
|-------|---------|
| `--dt-stage-bg` | Background behind the calendar (page area) |
| `--dt-bg` | Calendar card background |
| `--dt-surface` | Elevated surface (alternating rows, headers) |
| `--dt-border` | Default border |
| `--dt-border-day` | Day-column dividers |
| `--dt-text` | Primary text |
| `--dt-text-2` | Secondary text |
| `--dt-text-3` | Tertiary text |
| `--dt-accent` | Accent color |
| `--dt-accent-dim` | Accent at ~12% opacity |
| `--dt-glow` | Accent glow / focus ring |
| `--dt-today-bg` | Today column highlight |
| `--dt-btn-text` | Button label color |
| `--dt-scrollbar` | Scrollbar thumb |
| `--dt-success` | Completed indicator |
| `--dt-serif` / `--dt-sans` / `--dt-mono` | Font stacks |

</details>

## Events

### TimelineEvent

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `title` | `string` | Event title |
| `start` / `end` | `Date` | Time range |
| `color` | `string?` | Accent color (auto-assigned if omitted) |
| `category` | `string?` | Grouping key — events with the same category share a color |
| `subtitle` | `string?` | Secondary text below the title |
| `tags` | `string[]?` | Small accent-colored pills |
| `allDay` | `boolean?` | Render as an all-day event |
| `data` | `Record?` | Arbitrary payload for your app |

### Auto-Coloring

Omit `color` and events are auto-assigned a vivid palette color, grouped by `category` (or `title`):

```ts
const events = [
  { id: '1', title: 'Yoga',  category: 'wellness', start: ..., end: ... },
  { id: '2', title: 'Pilates', category: 'wellness', start: ..., end: ... },  // same color
  { id: '3', title: 'Standup', start: ..., end: ... },                        // different color
];
```

Generate a theme-harmonious palette from any accent color:

```ts
import { createMemoryAdapter, generatePalette } from '@nomideusz/svelte-calendar';

// Colors that harmonize with your theme's accent
const palette = generatePalette('#e11d48');
const adapter = createMemoryAdapter(events, { palette });
```

### Multi-day & All-day

Events spanning multiple days or flagged `allDay: true` render in a dedicated strip above timed events:

```ts
const events = [
  { id: '1', title: 'Conference', start: new Date('2026-03-15'), end: new Date('2026-03-18'), allDay: true },
  { id: '2', title: 'Sprint',    start: new Date('2026-03-15T00:00'), end: new Date('2026-03-17T00:00') },
];
```

### Custom Event Rendering

Use the `event` snippet to fully control how events look:

```svelte
<Calendar {adapter}>
  {#snippet event(ev)}
    <div style="padding: 4px 8px;">
      <strong>{ev.title}</strong>
      {#if ev.subtitle}<small>{ev.subtitle}</small>{/if}
    </div>
  {/snippet}
</Calendar>
```

## Recurring Schedules

For fixed repeating events (class timetables, office hours):

```svelte
<script>
  import { Calendar, createRecurringAdapter } from '@nomideusz/svelte-calendar';

  const adapter = createRecurringAdapter([
    { id: '1', title: 'Yoga',    dayOfWeek: 1, startTime: '07:00', endTime: '08:30' },
    { id: '2', title: 'Standup', frequency: 'daily', startTime: '09:00', endTime: '09:15',
      startDate: '2026-03-01', until: '2026-03-31' },
    { id: '3', title: 'Review',  frequency: 'monthly', dayOfMonth: 15,
      startTime: '10:00', endTime: '11:00' },
  ]);
</script>

<Calendar {adapter} readOnly />
```

<details>
<summary>RecurringEvent fields</summary>

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `string` | *required* | Unique identifier |
| `title` | `string` | *required* | Event title |
| `startTime` | `string` | *required* | Start time `"HH:MM"` |
| `endTime` | `string` | *required* | End time `"HH:MM"` |
| `frequency` | `'daily' \| 'weekly' \| 'monthly'` | `'weekly'` | Recurrence frequency |
| `interval` | `number` | `1` | Repeat every N periods (e.g. `2` = biweekly) |
| `dayOfWeek` | `number \| number[]` | — | ISO weekday 1=Mon…7=Sun. Required for weekly. |
| `dayOfMonth` | `number` | `1` | Day of month (1–31). For monthly. |
| `startDate` | `string` | — | First occurrence `"YYYY-MM-DD"` |
| `until` | `string` | — | Last occurrence `"YYYY-MM-DD"` |
| `count` | `number` | — | Max occurrences from `startDate` |
| `color` | `string?` | — | Accent color (auto-assigned if omitted) |

</details>

## REST Adapter

Connect to any REST API:

```ts
import { Calendar, createRestAdapter } from '@nomideusz/svelte-calendar';

const adapter = createRestAdapter({
  baseUrl: 'https://api.example.com/v1',
  headers: { Authorization: 'Bearer TOKEN' },
  // Optional: map your API shape to TimelineEvent[]
  mapEvents: (data) => data.items.map(item => ({
    id: item.id,
    title: item.name,
    start: new Date(item.startAt),
    end: new Date(item.endAt),
  })),
});
```

The adapter calls `GET /events?start=...&end=...`, `POST /events`, `PATCH /events/:id`, and `DELETE /events/:id`.

## Custom Adapter

Implement the `CalendarAdapter` interface to connect any data source:

```ts
import type { CalendarAdapter, DateRange, TimelineEvent } from '@nomideusz/svelte-calendar';

const adapter: CalendarAdapter = {
  fetchEvents: async (range: DateRange) => { /* return TimelineEvent[] */ },
  createEvent: async (event) => { /* return created TimelineEvent with id */ },
  updateEvent: async (id, patch) => { /* return updated TimelineEvent */ },
  deleteEvent: async (id) => { /* void */ },
};
```

## Localization (i18n)

The `locale` prop controls date/time formatting (BCP 47):

```svelte
<Calendar {adapter} locale="de-DE" />
```

Override UI labels for full translation:

```ts
import { setLabels } from '@nomideusz/svelte-calendar';

setLabels({
  today: 'Heute', day: 'Tag', week: 'Woche',
  noEvents: 'Keine Termine',
  nMore: (n) => `+${n} weitere`,
});
```

Call `resetLabels()` to restore English defaults.

<details>
<summary>All label keys</summary>

| Key | Default | Description |
|-----|---------|-------------|
| `today` | `'Today'` | Relative day label / nav button |
| `yesterday` | `'Yesterday'` | Relative day label |
| `tomorrow` | `'Tomorrow'` | Relative day label |
| `day` | `'Day'` | Mode pill |
| `week` | `'Week'` | Mode pill |
| `planner` | `'Planner'` | View label |
| `agenda` | `'Agenda'` | View label |
| `now` | `'now'` | Live indicator badge |
| `free` | `'free'` | Empty slot hint |
| `allDay` | `'All day'` | All-day event label |
| `done` | `'Done'` | Past section header |
| `upNext` | `'Up next'` | Upcoming section header |
| `until` | `'until'` | Time-until prefix |
| `noEvents` | `'No events'` | Empty day |
| `nothingScheduled` | `'Nothing scheduled'` | Empty state |
| `allDoneForToday` | `'All done for today'` | Completed state |
| `goToToday` | `'Go to today'` | Nav button aria |
| `previousDay` / `nextDay` | `'Previous day'` / `'Next day'` | Nav aria |
| `previousWeek` / `nextWeek` | `'Previous week'` / `'Next week'` | Nav aria |
| `calendar` | `'Calendar'` | Root region aria |
| `nMore(n)` | `` `+${n} more` `` | Overflow count |
| `nEvents(n)` | `` `${n} event(s)` `` | Event count aria |
| `nCompleted(n)` | `` `${n} completed` `` | Completed count |
| `dayNOfTotal(i, t)` | `` `day ${i} of ${t}` `` | Multi-day segment |
| `percentComplete(p)` | `` `${p}% complete` `` | Progress aria |

</details>

## Timezone Support

Convert events between timezones using the built-in helpers:

```ts
import { toZonedTime, fromZonedTime, nowInZone } from '@nomideusz/svelte-calendar';

// Display a UTC date in a specific timezone
const local = toZonedTime(utcDate, 'America/New_York');

// Convert back to UTC before saving
const utc = fromZonedTime(localDate, 'America/New_York');

// Current time in a timezone
const now = nowInZone('Asia/Tokyo');
```

## Embeddable Widget

Drop into any HTML page — no build tools needed:

```html
<script src="https://cdn.jsdelivr.net/npm/@nomideusz/svelte-calendar/widget/widget.js"></script>

<day-calendar
  api="https://myschool.com/api/events"
  theme="neutral"
  height="600"
></day-calendar>
```

## All Props

<details>
<summary>Full Calendar props reference</summary>

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `adapter` | `CalendarAdapter` | *required* | Data layer (memory, recurring, REST, or custom) |
| `views` | `CalendarView[]` | all 4 built-in | Registered view components |
| `view` | `string` | first view | Active view ID |
| `theme` | `string` | `auto` | CSS theme string (`--dt-*` custom properties). `auto` probes the host page and generates matching tokens. |
| `autoTheme` | `AutoThemeOptions \| false` | `{}` | Fine-tune auto-detection: `{ mode, accent, font }`. Set `false` to disable probing. |
| `mobile` | `'auto' \| boolean` | `'auto'` | Mobile mode. `'auto'` detects via `matchMedia(<768px)`. Remaps Planner→Mobile views. |
| `height` | `number` | `600` | Total height in pixels |
| `borderRadius` | `number` | `12` | Border radius in pixels. Set to `0` for no rounding. |
| `locale` | `string` | `'en-US'` | BCP 47 locale tag |
| `dir` | `'ltr' \| 'rtl' \| 'auto'` | — | Text direction |
| `mondayStart` | `boolean` | `true` | Start week on Monday |
| `readOnly` | `boolean` | `false` | Disable drag, resize, and click-to-create |
| `visibleHours` | `[number, number]` | — | Crop grid to `[startHour, endHour)` |
| `initialDate` | `Date` | today | Date to focus on at mount |
| `snapInterval` | `number` | `15` | Drag snap in minutes |
| `showModePills` | `boolean` | `true` | Show the Day/Week mode pills |
| `showNavigation` | `boolean` | `true` | Show prev/next/today navigation |
| `equalDays` | `boolean` | `false` | Treat all days equally (no past-day dimming/collapsing) |
| `showDates` | `boolean` | `true` | Show date numbers in headers. `false` = day names only (Mon, Tue, …) |
| `hideDays` | `number[]` | — | ISO weekdays to hide (1=Mon … 7=Sun). E.g. `[6, 7]` hides weekends |
| `currentDate` | `Date` | — | Controlled focus date (drives which date the calendar shows) |
| `days` | `number` | `7` | Number of days shown in week views (e.g. `3` for a rolling 3-day view) |
| `blockedSlots` | `BlockedSlot[]` | — | Time ranges that cannot be booked (hatched overlay in planner views) |
| `disabledDates` | `Date[]` | — | Dates that are fully disabled (dimmed, no interaction) |
| `minDuration` | `number` | — | Minimum event duration in minutes (enforced on create & resize) |
| `maxDuration` | `number` | — | Maximum event duration in minutes (enforced on create & resize) |
| `dayHeader` | `Snippet<[{ date, isToday, dayName }]>` | — | Custom day header snippet for planner/agenda views |
| `oneventclick` | `(event) => void` | — | Event clicked |
| `oneventcreate` | `(range) => void` | — | New time range selected |
| `oneventmove` | `(event, start, end) => void` | — | Event dragged to new time |
| `onviewchange` | `(viewId) => void` | — | Active view changed |
| `oneventhover` | `(event) => void` | — | Pointer enters an event (for tooltips, previews) |
| `ondatechange` | `(date) => void` | — | Focused date changed (navigation, scroll, etc.) |
| `event` | `Snippet<[TimelineEvent]>` | — | Custom event rendering |
| `empty` | `Snippet` | — | Empty state content |

</details>

## Development

```bash
pnpm install
pnpm dev             # SvelteKit dev server
pnpm check           # Type check
pnpm run package     # Build library
pnpm run build:widget # Build widget.js
```

## License

MIT
