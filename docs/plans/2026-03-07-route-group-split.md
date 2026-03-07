# Route Group Split: (public) and (app)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split TheBest app routes into `(public)` and `(app)` route groups, removing all `isGuide` conditionals from the root layout.

**Architecture:** SvelteKit route groups `(public)` and `(app)` share the root layout (CSS + locale provider + user load) but get independent sub-layouts. Public pages get header/footer/mobile-sidebar. App pages get sidebar/bottom-dock with minimal header. URLs remain unchanged since parenthesized groups don't affect routing.

**Tech Stack:** SvelteKit 5, Svelte 5 runes, Tailwind v4, `--asini-*` design tokens

---

## Current Structure

```
routes/
  +layout.svelte          <- header + footer + mobile sidebar + isGuide conditionals
  +layout.server.ts       <- loads user (shared)
  +page.svelte            <- home
  tours/                  <- public
  auth/                   <- public (login, signup, logout)
  book/                   <- public
  bookings/               <- public ([ref]/cancel, confirmed, cancelled)
  guides/                 <- public ([guideId])
  guide/                  <- app (auth-guarded)
    +layout.svelte        <- sidebar + bottom dock
    +layout.server.ts     <- auth guard + user
    dashboard/, tours/, bookings/, settings/
  api/                    <- stays at root
```

## Target Structure

```
routes/
  +layout.svelte          <- minimal: CSS import + children
  +layout.server.ts       <- unchanged (loads user for both groups)
  api/                    <- unchanged
  (public)/
    +layout.svelte        <- header + footer + mobile sidebar (from old root layout)
    +page.svelte
    tours/
    auth/
    book/
    bookings/
    guides/
  (app)/
    +layout.svelte        <- minimal header + sidebar + bottom dock (merged)
    guide/
      +layout.server.ts   <- auth guard (unchanged)
      dashboard/
      tours/
      bookings/
      settings/
```

## Key Facts

- All `$types` imports are relative (`./$types.js`) -- SvelteKit auto-regenerates after moves
- `data.user` is only used in layout files, never in page components
- No client-side `+layout.ts` files exist
- `bookings/[ref]/cancelled` has only `+page.svelte` (no server file)
- `auth/logout` is `+page.server.ts` (form action), not `+server.ts`
- Root `+layout.server.ts` stays unchanged -- both groups inherit user data

---

### Task 1: Create (public) layout and move public routes

**Files:**
- Create: `src/routes/(public)/+layout.svelte`
- Move: `src/routes/+page.svelte` -> `src/routes/(public)/+page.svelte`
- Move: `src/routes/tours/` -> `src/routes/(public)/tours/`
- Move: `src/routes/auth/` -> `src/routes/(public)/auth/`
- Move: `src/routes/book/` -> `src/routes/(public)/book/`
- Move: `src/routes/bookings/` -> `src/routes/(public)/bookings/`
- Move: `src/routes/guides/` -> `src/routes/(public)/guides/`

**Step 1:** Create `(public)/+layout.svelte` -- this is the current root layout with all `isGuide` conditionals removed (always taking the `!isGuide` branch). Add the missing `LocaleSwitcher` import.

**Step 2:** Move all public route directories and `+page.svelte` into `(public)/`.

**Step 3:** Verify only `+layout.svelte`, `+layout.server.ts`, `guide/`, `api/` remain at root.

**Step 4:** Commit: `refactor(thebest): create (public) route group and move public routes`

---

### Task 2: Create (app) layout and move guide routes

**Files:**
- Create: `src/routes/(app)/+layout.svelte`
- Move: `src/routes/guide/` -> `src/routes/(app)/guide/`
- Delete: `src/routes/(app)/guide/+layout.svelte` (merged into (app) layout)

**Step 1:** Create `(app)/+layout.svelte` -- merge the minimal header (logo + locale switcher only, no nav links, no auth buttons) with the existing `guide/+layout.svelte` content (sidebar + bottom dock + user display).

**Step 2:** Move `guide/` directory into `(app)/`.

**Step 3:** Remove `(app)/guide/+layout.svelte` since its content is now in `(app)/+layout.svelte`. Keep `(app)/guide/+layout.server.ts` (auth guard).

**Step 4:** Commit: `refactor(thebest): create (app) route group and move guide routes`

---

### Task 3: Simplify root +layout.svelte

**Files:**
- Modify: `src/routes/+layout.svelte`

**Step 1:** Replace root layout with minimal shell -- just CSS import and children:

```svelte
<script lang="ts">
  import "../app.css";

  let {
    children,
  }: { children: import("svelte").Snippet } = $props();
</script>

{@render children()}
```

**Step 2:** Commit: `refactor(thebest): simplify root layout to CSS-only shell`

---

### Task 4: Typecheck and verify

**Step 1:** Run `pnpm check` from monorepo root (or `cd apps/thebest && pnpm check`).

**Step 2:** Start dev server (`pnpm dev:thebest`) and verify URLs:
- `/` -- home with header + footer
- `/tours` -- listing with header + footer
- `/auth/login` -- login with header + footer
- `/guide/dashboard` -- redirects to login or shows sidebar
- `/guide/tours` -- guide tours with sidebar + bottom dock

**Step 3:** Verify no `isGuide` conditionals remain: `grep -r "isGuide" apps/thebest/src/routes/`

**Step 4:** Commit fixes if needed: `fix(thebest): post-split typecheck fixes`

---

## Execution Notes

- Tasks 1 and 2 are independent (can parallelize)
- Task 3 depends on Tasks 1+2
- Task 4 is verification after all changes
- `api/` stays at root -- not part of either group
- All `href` values are absolute (`/guide/dashboard`, `/tours`) -- no changes needed
- No page components need modification -- only layouts change
