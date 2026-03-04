# Task: apps/thebest — Authentication with Lucia v3

## Context

Read `AGENTS.md` fully before starting. This builds on the scaffold from Step 8.

Prerequisites:
- PR #20 (scaffold) must be merged — `apps/thebest/` exists with Drizzle schema, routes, etc.
- `packages/svelte-scheduler` and `packages/svelte-calendar` pass `pnpm check`

Reference: Zaur's auth at `C:\cmder\apps\tours\src\hooks.server.ts` and `C:\cmder\apps\tours\src\lib\auth.ts` — read for patterns only, do not copy.

## What to Build

### 1. Auth schema additions

In `apps/thebest/src/lib/server/db/schema.ts`, add tables required by Lucia v3 + `@lucia-auth/adapter-drizzle`:

**`sessions`** table:
- `id` (text, primary key)
- `userId` (uuid, FK → guides, not null)
- `expiresAt` (timestamp with timezone, not null)

**`oauth_accounts`** table:
- `providerId` (text, not null)
- `providerUserId` (text, not null)
- `userId` (uuid, FK → guides, not null)
- composite primary key: (providerId, providerUserId)

### 2. Lucia configuration

Create `apps/thebest/src/lib/server/auth.ts`:
- Initialize Lucia with `@lucia-auth/adapter-drizzle`
- Configure for PostgreSQL
- Session cookie settings (secure in prod, lax in dev)
- Type augmentation for `App.Locals` in `app.d.ts`

### 3. Hooks

Create `apps/thebest/src/hooks.server.ts`:
- Read session cookie on every request
- Validate session, set `event.locals.user` and `event.locals.session`
- Refresh session if within renewal window

### 4. Auth routes

Create email/password auth (simplest first — OAuth can be added later):

- `src/routes/auth/signup/+page.svelte` — guide registration form (name, email, password)
- `src/routes/auth/signup/+page.server.ts` — create guide + session, redirect to `/guide`
- `src/routes/auth/login/+page.svelte` — login form
- `src/routes/auth/login/+page.server.ts` — validate credentials, create session
- `src/routes/auth/logout/+page.server.ts` — invalidate session, redirect to `/`

Password hashing: use `oslo/password` (Argon2id).

### 5. Protected routes

Update `src/routes/guide/+layout.server.ts`:
- Check `event.locals.user` — redirect to `/auth/login` if not authenticated
- Pass user data to layout

Update `src/routes/guide/+layout.svelte`:
- Show guide name in header area

### 6. Type updates

In `apps/thebest/src/app.d.ts`:
```ts
declare global {
    namespace App {
        interface Locals {
            user: import('$lib/server/db/schema').Guide | null;
            session: import('lucia').Session | null;
        }
    }
}
```

## Styling

Use Tailwind CSS + DaisyUI for all auth pages:
- Forms use DaisyUI `fieldset`, `input`, `btn` components
- Error messages use `alert alert-error`
- Keep it clean and minimal

## Constraints

- No OAuth providers yet — email/password only (leave `// TODO: Google OAuth` stub)
- No email verification yet — leave `// TODO: email verification flow` stub
- No password reset — leave `// TODO: password reset` stub
- `apps/yoga` must not be affected
- `pnpm check` must pass from repo root
- Use `crypto.randomUUID()` for guide IDs

## Validation

```bash
cd apps/thebest
pnpm check   # zero errors
pnpm build   # succeeds
```
