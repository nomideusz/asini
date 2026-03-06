# Extract svelte-notify and svelte-payments Packages

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract email templates into `@nomideusz/svelte-notify` and the Stripe Connect UI into `@nomideusz/svelte-payments`, then wire `apps/thebest` to consume them — restoring the modular architecture originally planned.

**Architecture:** Two new workspace packages. `svelte-notify` is pure TypeScript — template functions that take data and return `{subject, html}`. `svelte-payments` is a Svelte 5 component library — the `<StripeConnectStatus>` UI component with `--asini-*` tokens. `apps/thebest/src/lib/server/email.ts` becomes thin: import templates, call Resend. The Stripe Connect server routes stay in the app (they need credentials).

**Tech Stack:** TypeScript strict, Svelte 5, `@sveltejs/package`, vitest, pnpm workspaces.

---

## Current state

`apps/thebest/src/lib/server/email.ts` — mixes three things:
1. Resend singleton (stays in app — needs `RESEND_API_KEY`)
2. HTML template strings (move to `@nomideusz/svelte-notify`)
3. `sendX()` functions that combine the two (stays in app, imports templates from package)

`apps/thebest/src/routes/guide/settings/+page.svelte` — inline Stripe Connect status UI (move to `@nomideusz/svelte-payments` as a component)

---

## Scaffold reference

Use `packages/svelte-scheduler/` as the template:
- Same `package.json` shape (scripts, devDependencies versions)
- Same `tsconfig.json`
- Same `svelte.config.js`
- Same `vite.config.ts`

---

## Task 1: Scaffold `packages/svelte-notify`

`svelte-notify` is pure TypeScript — no Svelte components, no peer deps.

**Files to create:**
- `packages/svelte-notify/package.json`
- `packages/svelte-notify/tsconfig.json`
- `packages/svelte-notify/svelte.config.js`
- `packages/svelte-notify/vite.config.ts`
- `packages/svelte-notify/src/lib/index.ts`
- `packages/svelte-notify/src/app.d.ts`

**Step 1: Create `packages/svelte-notify/package.json`**

```json
{
  "name": "@nomideusz/svelte-notify",
  "version": "0.1.0",
  "description": "Email notification template library for the @nomideusz booking platform.",
  "type": "module",
  "license": "MIT",
  "svelte": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*"
  ],
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "package": "svelte-kit sync && svelte-package",
    "prepublishOnly": "npm run package",
    "preview": "vite preview",
    "prepare": "svelte-kit sync || echo ''",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^7.0.0",
    "@sveltejs/kit": "^2.50.2",
    "@sveltejs/package": "^2.5.7",
    "@sveltejs/vite-plugin-svelte": "^6.2.4",
    "svelte": "^5.51.0",
    "svelte-check": "^4.3.6",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^4.0.18"
  },
  "keywords": ["svelte", "email", "notifications", "templates", "booking"]
}
```

**Step 2: Copy scaffold files from svelte-scheduler**

```bash
cp c:/cmder/apps/asini/packages/svelte-scheduler/tsconfig.json \
   c:/cmder/apps/asini/packages/svelte-notify/tsconfig.json
cp c:/cmder/apps/asini/packages/svelte-scheduler/svelte.config.js \
   c:/cmder/apps/asini/packages/svelte-notify/svelte.config.js
cp c:/cmder/apps/asini/packages/svelte-scheduler/vite.config.ts \
   c:/cmder/apps/asini/packages/svelte-notify/vite.config.ts
```

**Step 3: Create `packages/svelte-notify/src/app.d.ts`**

```typescript
// See https://kit.svelte.dev/docs/types#app
declare global {
	namespace App {}
}
export {};
```

**Step 4: Create stub `packages/svelte-notify/src/lib/index.ts`**

```typescript
// Public API — exports added as templates are implemented
```

**Step 5: Install dependencies**

```bash
cd c:/cmder/apps/asini && pnpm install
```

**Step 6: Run check (must pass even on empty package)**

```bash
pnpm --filter @nomideusz/svelte-notify check
```

Expected: 0 errors

**Step 7: Commit**

```bash
git add packages/svelte-notify/
git commit -m "feat(svelte-notify): scaffold package"
```

---

## Task 2: Implement email template functions in svelte-notify

**Files to create:**
- `packages/svelte-notify/src/lib/types.ts`
- `packages/svelte-notify/src/lib/templates/booking-confirmation.ts`
- `packages/svelte-notify/src/lib/templates/guide-notification.ts`
- `packages/svelte-notify/src/lib/templates/cancellation.ts`
- `packages/svelte-notify/src/lib/templates/booking-confirmation.test.ts`
- `packages/svelte-notify/src/lib/templates/cancellation.test.ts`

**Step 1: Create `packages/svelte-notify/src/lib/types.ts`**

```typescript
export interface BookingNotificationData {
  guestName: string;
  guestEmail: string;
  tourName: string;
  slotStartTime: Date;
  participants: number;
  totalAmount: number;   // in cents
  currency: string;      // ISO 4217, e.g. 'PLN'
  bookingReference: string;
  guideName?: string;
  guideEmail?: string;
}

export interface CancellationNotificationData extends BookingNotificationData {
  cancelledBy: 'guest' | 'guide' | 'system';
  refundAmount: number;  // in cents, 0 = no refund
}

export interface EmailTemplate {
  subject: string;
  html: string;
}
```

**Step 2: Write failing tests FIRST**

Create `packages/svelte-notify/src/lib/templates/booking-confirmation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { bookingConfirmationTemplate } from './booking-confirmation.js';

const base = {
  guestName: 'Anna Kowalski',
  guestEmail: 'anna@example.com',
  tourName: 'Old Town Walking Tour',
  slotStartTime: new Date('2026-06-15T10:00:00Z'),
  participants: 2,
  totalAmount: 8000,  // 80.00 PLN in cents
  currency: 'PLN',
  bookingReference: 'TB-12345',
};

describe('bookingConfirmationTemplate', () => {
  it('includes guest name in html', () => {
    const { html } = bookingConfirmationTemplate(base);
    expect(html).toContain('Anna Kowalski');
  });

  it('includes tour name in subject', () => {
    const { subject } = bookingConfirmationTemplate(base);
    expect(subject).toContain('Old Town Walking Tour');
  });

  it('includes booking reference in subject and html', () => {
    const { subject, html } = bookingConfirmationTemplate(base);
    expect(subject).toContain('TB-12345');
    expect(html).toContain('TB-12345');
  });

  it('includes formatted amount', () => {
    const { html } = bookingConfirmationTemplate(base);
    expect(html).toContain('80');
  });

  it('returns an EmailTemplate shape', () => {
    const result = bookingConfirmationTemplate(base);
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('html');
    expect(typeof result.subject).toBe('string');
    expect(typeof result.html).toBe('string');
  });
});
```

**Step 3: Run tests — confirm they fail**

```bash
cd c:/cmder/apps/asini && pnpm --filter @nomideusz/svelte-notify test
```

Expected: FAIL — `bookingConfirmationTemplate` not found

**Step 4: Implement `packages/svelte-notify/src/lib/templates/booking-confirmation.ts`**

```typescript
import type { BookingNotificationData, EmailTemplate } from '../types.js';

function formatDate(d: Date): string {
  return d.toLocaleString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
}

export function bookingConfirmationTemplate(data: BookingNotificationData): EmailTemplate {
  return {
    subject: `Booking confirmed: ${data.tourName} — Ref ${data.bookingReference}`,
    html: `
      <h2>Your booking is confirmed</h2>
      <p>Hi ${data.guestName},</p>
      <p>Your booking for <strong>${data.tourName}</strong> is confirmed.</p>
      <ul>
        <li>Date: ${formatDate(data.slotStartTime)}</li>
        <li>Participants: ${data.participants}</li>
        <li>Total paid: ${formatMoney(data.totalAmount, data.currency)}</li>
        <li>Reference: <strong>${data.bookingReference}</strong></li>
      </ul>
      <p>See you there!</p>
      <hr/>
      <p style="font-size:12px;color:#666">thebest.travel</p>
    `,
  };
}
```

**Step 5: Run tests — confirm they pass**

```bash
pnpm --filter @nomideusz/svelte-notify test
```

Expected: PASS

**Step 6: Write cancellation template tests**

Create `packages/svelte-notify/src/lib/templates/cancellation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { cancellationTemplate } from './cancellation.js';

const base = {
  guestName: 'Anna Kowalski',
  guestEmail: 'anna@example.com',
  tourName: 'Old Town Walking Tour',
  slotStartTime: new Date('2026-06-15T10:00:00Z'),
  participants: 2,
  totalAmount: 8000,
  currency: 'PLN',
  bookingReference: 'TB-12345',
  cancelledBy: 'guest' as const,
  refundAmount: 8000,
};

describe('cancellationTemplate', () => {
  it('mentions refund when refundAmount > 0', () => {
    const { html } = cancellationTemplate({ ...base, refundAmount: 8000 });
    expect(html.toLowerCase()).toMatch(/refund/);
  });

  it('says no refund when refundAmount is 0', () => {
    const { html } = cancellationTemplate({ ...base, refundAmount: 0 });
    expect(html).toContain('No refund');
  });

  it('includes booking reference', () => {
    const { html, subject } = cancellationTemplate(base);
    expect(html).toContain('TB-12345');
    expect(subject).toContain('TB-12345');
  });
});
```

**Step 7: Implement `packages/svelte-notify/src/lib/templates/cancellation.ts`**

```typescript
import type { CancellationNotificationData, EmailTemplate } from '../types.js';

function formatDate(d: Date): string {
  return d.toLocaleString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
}

export function cancellationTemplate(data: CancellationNotificationData): EmailTemplate {
  const refundText = data.refundAmount > 0
    ? `A refund of ${formatMoney(data.refundAmount, data.currency)} will be processed within 5–10 business days.`
    : 'No refund applies per the cancellation policy.';

  return {
    subject: `Booking cancelled: ${data.tourName} — Ref ${data.bookingReference}`,
    html: `
      <h2>Booking cancelled</h2>
      <p>Hi ${data.guestName},</p>
      <p>Your booking for <strong>${data.tourName}</strong> on ${formatDate(data.slotStartTime)} has been cancelled.</p>
      <p>${refundText}</p>
      <p>Reference: <strong>${data.bookingReference}</strong></p>
      <hr/>
      <p style="font-size:12px;color:#666">thebest.travel</p>
    `,
  };
}
```

**Step 8: Implement `packages/svelte-notify/src/lib/templates/guide-notification.ts`**

No separate test file needed (structure mirrors booking-confirmation):

```typescript
import type { BookingNotificationData, EmailTemplate } from '../types.js';

function formatDate(d: Date): string {
  return d.toLocaleString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
}

export function guideNotificationTemplate(data: BookingNotificationData): EmailTemplate {
  return {
    subject: `New booking: ${data.tourName} — ${data.participants} participant(s)`,
    html: `
      <h2>New booking received</h2>
      <p>Hi ${data.guideName ?? 'Guide'},</p>
      <p><strong>${data.guestName}</strong> booked <strong>${data.tourName}</strong>.</p>
      <ul>
        <li>Date: ${formatDate(data.slotStartTime)}</li>
        <li>Participants: ${data.participants}</li>
        <li>Amount: ${formatMoney(data.totalAmount, data.currency)}</li>
        <li>Guest email: ${data.guestEmail}</li>
        <li>Reference: ${data.bookingReference}</li>
      </ul>
      <hr/>
      <p style="font-size:12px;color:#666">thebest.travel</p>
    `,
  };
}
```

**Step 9: Wire up `packages/svelte-notify/src/lib/index.ts`**

```typescript
export type { BookingNotificationData, CancellationNotificationData, EmailTemplate } from './types.js';
export { bookingConfirmationTemplate } from './templates/booking-confirmation.js';
export { guideNotificationTemplate } from './templates/guide-notification.js';
export { cancellationTemplate } from './templates/cancellation.js';
```

**Step 10: Run all checks**

```bash
cd c:/cmder/apps/asini
pnpm --filter @nomideusz/svelte-notify test
pnpm --filter @nomideusz/svelte-notify check
```

Expected: all pass, 0 errors

**Step 11: Commit**

```bash
git add packages/svelte-notify/
git commit -m "feat(svelte-notify): email template functions with tests"
```

---

## Task 3: Scaffold and implement `packages/svelte-payments`

**Files to create:**
- `packages/svelte-payments/package.json`
- `packages/svelte-payments/tsconfig.json`
- `packages/svelte-payments/svelte.config.js`
- `packages/svelte-payments/vite.config.ts`
- `packages/svelte-payments/src/app.d.ts`
- `packages/svelte-payments/src/lib/index.ts`
- `packages/svelte-payments/src/lib/StripeConnectStatus.svelte`

**Step 1: Create `packages/svelte-payments/package.json`**

```json
{
  "name": "@nomideusz/svelte-payments",
  "version": "0.1.0",
  "description": "Stripe Connect UI components for the @nomideusz booking platform.",
  "type": "module",
  "license": "MIT",
  "svelte": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*"
  ],
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "package": "svelte-kit sync && svelte-package",
    "prepublishOnly": "npm run package",
    "preview": "vite preview",
    "prepare": "svelte-kit sync || echo ''",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest"
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^7.0.0",
    "@sveltejs/kit": "^2.50.2",
    "@sveltejs/package": "^2.5.7",
    "@sveltejs/vite-plugin-svelte": "^6.2.4",
    "svelte": "^5.51.0",
    "svelte-check": "^4.3.6",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^4.0.18"
  },
  "keywords": ["svelte", "stripe", "payments", "connect", "booking"]
}
```

**Step 2: Copy scaffold files**

```bash
cp c:/cmder/apps/asini/packages/svelte-scheduler/tsconfig.json \
   c:/cmder/apps/asini/packages/svelte-payments/tsconfig.json
cp c:/cmder/apps/asini/packages/svelte-scheduler/svelte.config.js \
   c:/cmder/apps/asini/packages/svelte-payments/svelte.config.js
cp c:/cmder/apps/asini/packages/svelte-scheduler/vite.config.ts \
   c:/cmder/apps/asini/packages/svelte-payments/vite.config.ts
```

**Step 3: Create `packages/svelte-payments/src/app.d.ts`**

```typescript
declare global {
  namespace App {}
}
export {};
```

**Step 4: Create `packages/svelte-payments/src/lib/StripeConnectStatus.svelte`**

This component uses ONLY `--asini-*` CSS tokens. No Tailwind, no DaisyUI, no hardcoded colors.

```svelte
<script lang="ts">
  interface Props {
    /** Whether the guide's Stripe account is fully connected and active */
    connected: boolean;
    /** URL to redirect to for Stripe Connect onboarding — e.g. /api/stripe/connect */
    onboardingHref: string;
    /** Optional: label for the connect button */
    connectLabel?: string;
  }

  let {
    connected,
    onboardingHref,
    connectLabel = 'Connect with Stripe',
  }: Props = $props();
</script>

<div class="stripe-connect-status">
  {#if connected}
    <div class="status-connected">
      <span class="status-icon" aria-hidden="true">✓</span>
      <span>Your Stripe account is connected. You can receive payments.</span>
    </div>
  {:else}
    <p class="status-description">
      Connect your Stripe account to receive payments from guests.
      You'll be redirected to Stripe to complete the setup.
    </p>
    <a href={onboardingHref} class="connect-btn">
      {connectLabel}
    </a>
  {/if}
</div>

<style>
  .stripe-connect-status {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .status-connected {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: var(--asini-radius, 0.5rem);
    background: color-mix(in srgb, var(--asini-success, #22c55e) 15%, transparent);
    color: var(--asini-text, inherit);
    border: 1px solid color-mix(in srgb, var(--asini-success, #22c55e) 40%, transparent);
  }

  .status-icon {
    font-size: 1.1rem;
    color: var(--asini-success, #22c55e);
    font-weight: bold;
  }

  .status-description {
    color: var(--asini-text-2, #6b7280);
    margin: 0;
    line-height: 1.5;
  }

  .connect-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem 1.25rem;
    border-radius: var(--asini-radius, 0.5rem);
    background: var(--asini-accent, #6366f1);
    color: #fff;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.95rem;
    transition: opacity 0.15s;
    align-self: flex-start;
  }

  .connect-btn:hover {
    opacity: 0.88;
  }
</style>
```

**Step 5: Create `packages/svelte-payments/src/lib/index.ts`**

```typescript
export { default as StripeConnectStatus } from './StripeConnectStatus.svelte';
```

**Step 6: Install and check**

```bash
cd c:/cmder/apps/asini && pnpm install
pnpm --filter @nomideusz/svelte-payments check
```

Expected: 0 errors

**Step 7: Commit**

```bash
git add packages/svelte-payments/
git commit -m "feat(svelte-payments): StripeConnectStatus component"
```

---

## Task 4: Wire apps/thebest to use both packages

**Files to modify:**
- `apps/thebest/package.json`
- `apps/thebest/src/lib/server/email.ts`
- `apps/thebest/src/routes/guide/settings/+page.svelte`

**Step 1: Add packages to thebest dependencies**

Edit `apps/thebest/package.json` — add to `"dependencies"`:

```json
"@nomideusz/svelte-notify": "workspace:*",
"@nomideusz/svelte-payments": "workspace:*",
```

Then run:
```bash
cd c:/cmder/apps/asini && pnpm install
```

**Step 2: Refactor `apps/thebest/src/lib/server/email.ts`**

The file keeps: Resend singleton, `sendBookingConfirmation`, `sendGuideBookingNotification`, `sendCancellationEmail`.
It loses: inline HTML template strings and formatting helpers.
It gains: imports from `@nomideusz/svelte-notify`.

New content of `apps/thebest/src/lib/server/email.ts`:

```typescript
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import {
  bookingConfirmationTemplate,
  guideNotificationTemplate,
  cancellationTemplate,
} from '@nomideusz/svelte-notify';
import type { BookingNotificationData, CancellationNotificationData } from '@nomideusz/svelte-notify';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = 'noreply@thebest.travel';
const FROM_NAME = 'thebest.travel';

// Re-export types so callers don't need to import from two places
export type { BookingNotificationData, CancellationNotificationData };

export async function sendBookingConfirmation(data: BookingNotificationData): Promise<void> {
  const { subject, html } = bookingConfirmationTemplate(data);
  const resend = getResend();
  await resend.emails.send({ from: `${FROM_NAME} <${FROM}>`, to: [data.guestEmail], subject, html });
}

export async function sendGuideBookingNotification(data: BookingNotificationData): Promise<void> {
  if (!data.guideEmail) return;
  const { subject, html } = guideNotificationTemplate(data);
  const resend = getResend();
  await resend.emails.send({ from: `${FROM_NAME} <${FROM}>`, to: [data.guideEmail], subject, html });
}

export async function sendCancellationEmail(data: CancellationNotificationData): Promise<void> {
  const { subject, html } = cancellationTemplate(data);
  const resend = getResend();
  await resend.emails.send({ from: `${FROM_NAME} <${FROM}>`, to: [data.guestEmail], subject, html });
}
```

**Step 3: Check if callers of `sendCancellationEmail` still typecheck**

The old `email.ts` used an inline intersection type `BookingEmailData & { cancelledBy, refundAmount }`.
The new `CancellationNotificationData` extends `BookingNotificationData` with `cancelledBy` and `refundAmount`.

Read `apps/thebest/src/routes/bookings/[ref]/cancel/+page.server.ts` to verify the call site.
If the field names match — `cancelledBy`, `refundAmount` — no change needed there.

**Step 4: Update `apps/thebest/src/routes/guide/settings/+page.svelte`**

Replace the inline Stripe status HTML with the `<StripeConnectStatus>` component:

```svelte
<script lang="ts">
  import type { PageData } from './$types.js';
  import { StripeConnectStatus } from '@nomideusz/svelte-payments';
  let { data }: { data: PageData } = $props();
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-8">Settings</h1>

  <div class="card bg-base-200 shadow mb-6">
    <div class="card-body">
      <h2 class="card-title">Stripe Payments</h2>
      <StripeConnectStatus
        connected={data.stripeConnected}
        onboardingHref="/api/stripe/connect"
      />
    </div>
  </div>
</div>
```

**Step 5: Run full typecheck**

```bash
cd c:/cmder/apps/asini && pnpm --filter thebest check
```

Expected: 0 errors

**Step 6: Run package checks**

```bash
pnpm --filter @nomideusz/svelte-notify check
pnpm --filter @nomideusz/svelte-payments check
pnpm --filter @nomideusz/svelte-notify test
```

All expected: 0 errors, all tests pass

**Step 7: Commit**

```bash
git add apps/thebest/package.json apps/thebest/src/lib/server/email.ts \
        apps/thebest/src/routes/guide/settings/+page.svelte
git commit -m "feat(thebest): consume @nomideusz/svelte-notify and svelte-payments"
```

---

## Task 5: Update AGENTS.md Package Registry

**Files to modify:**
- `AGENTS.md`

Read the current Package Registry section. Move `@nomideusz/svelte-payments` and `@nomideusz/svelte-notify` from "Future packages" to "Currently in asini".

**Step 1: Update the "Currently in asini" table**

Add two rows:

```markdown
| `packages/svelte-notify`   | `@nomideusz/svelte-notify`   | ✅ 0.1.0 — 3 templates + tests | Email notification templates |
| `packages/svelte-payments` | `@nomideusz/svelte-payments` | ✅ 0.1.0 — StripeConnectStatus | Stripe Connect UI components |
```

**Step 2: Update the "Future packages" table**

Remove `@nomideusz/svelte-payments` and `@nomideusz/svelte-notify` rows from the Future table (they now exist).

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: move svelte-notify and svelte-payments to active packages in registry"
```

---

## Final validation

```bash
cd c:/cmder/apps/asini
pnpm --filter @nomideusz/svelte-notify test      # all pass
pnpm --filter @nomideusz/svelte-notify check     # 0 errors
pnpm --filter @nomideusz/svelte-payments check   # 0 errors
pnpm --filter thebest check                      # 0 errors
pnpm --filter thebest build                      # succeeds
```
