# Task: apps/thebest — App Shell, Tailwind + DaisyUI Styling

## Context

Read `AGENTS.md` fully before starting. This builds on the scaffold from Step 8.

Prerequisites:
- PR #20 (scaffold) must be merged — `apps/thebest/` exists

Reference for Tailwind + DaisyUI setup: `apps/yoga/src/app.css` and `booking-platform/apps/calendar-scheduler/src/app.css`.

## What to Build

### 1. Install Tailwind CSS 4 + DaisyUI 5

```bash
cd apps/thebest
pnpm add -D tailwindcss @tailwindcss/vite daisyui@latest
```

### 2. Vite config

Update `apps/thebest/vite.config.ts` — add `@tailwindcss/vite` plugin:

```ts
import tailwindcss from '@tailwindcss/vite';
// add to plugins array
```

### 3. App CSS

Create/update `apps/thebest/src/app.css`:

```css
@import "tailwindcss";
@plugin "daisyui" {
  themes: light --default, dark --prefersdark;
}
```

Import in `+layout.svelte`: `import '../app.css';`

### 4. App shell layout

Update `src/routes/+layout.svelte` with a responsive app shell:

- **Navbar** using DaisyUI `navbar` component:
  - Logo/brand "thebest.travel" on the left
  - Navigation links: Home, Explore (future)
  - Right side: Login/Signup buttons (when not authenticated) or Guide Dashboard link + user dropdown (when authenticated)
  - Mobile: hamburger menu via DaisyUI drawer
- **Footer** with minimal content ("thebest.travel — Find Your Next Adventure")
- **Main content area** with proper min-height to push footer down

Use DaisyUI semantic colors throughout (`base-100`, `base-200`, `primary`, etc.).

### 5. Homepage

Update `src/routes/+page.svelte`:
- Hero section with tagline: "Find the Best Tours & Experiences"
- Subtitle: "Connect with local guides for unforgettable adventures"
- CTA button: "Explore Tours" (links to `/tours` — placeholder for now)
- Secondary CTA: "Become a Guide" (links to `/auth/signup`)
- Keep it clean, use DaisyUI `hero`, `btn` components

### 6. Guide area layout

Update `src/routes/guide/+layout.svelte`:
- Sidebar navigation (desktop) / bottom nav (mobile) using DaisyUI drawer + dock
- Links: Dashboard (future), My Tours, Bookings (future), Settings (future)
- Content area fills remaining space

### 7. Map --asini-* tokens for scheduler components

In the guide area or booking pages, scheduler package components use `--asini-*` CSS tokens. Add a CSS block that maps DaisyUI theme colors to asini tokens:

```css
:root {
  --asini-bg: oklch(var(--b1));
  --asini-surface: oklch(var(--b2));
  --asini-surface-raised: oklch(var(--b3));
  --asini-border: oklch(var(--bc) / 0.2);
  --asini-border-strong: oklch(var(--bc) / 0.4);
  --asini-text: oklch(var(--bc));
  --asini-text-2: oklch(var(--bc) / 0.7);
  --asini-text-3: oklch(var(--bc) / 0.5);
  --asini-accent: oklch(var(--p));
  --asini-accent-muted: oklch(var(--p) / 0.2);
  --asini-success: oklch(var(--su));
  --asini-warning: oklch(var(--wa));
  --asini-danger: oklch(var(--er));
  --asini-info: oklch(var(--in));
  --asini-font-sans: inherit;
  --asini-font-mono: ui-monospace, monospace;
  --asini-radius: var(--rounded-box);
  --asini-radius-sm: var(--rounded-btn);
}
```

Adjust the exact mapping if DaisyUI 5 uses different CSS variable names — check the installed version.

## Constraints

- DaisyUI 5 — no `tailwind.config.js` needed (Tailwind CSS 4 uses CSS config)
- Responsive: mobile-first design
- `apps/yoga` must not be affected
- `pnpm check` must pass from repo root
- Do not add custom fonts unless necessary

## Validation

```bash
cd apps/thebest
pnpm check   # zero errors
pnpm build   # succeeds
```
