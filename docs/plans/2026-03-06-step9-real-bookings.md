# Step 9: Real Bookings on thebest.travel

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable real guides to take real paid bookings on thebest.travel — Stripe Connect onboarding, Stripe Checkout payment, webhook confirmation, email notifications, and a guide bookings dashboard.

**Architecture:** Tourist completes BookingFlow (creates a DB record with `paymentStatus: 'pending'`), then is redirected to Stripe Checkout. On payment success, a webhook confirms the booking and triggers transactional emails via Resend. Guides connect their Stripe accounts via Stripe Connect before going live.

**Tech Stack:** `stripe` npm package, `resend` npm package, SvelteKit server routes, Drizzle ORM (existing schema already has all necessary columns).

**Platform fee:** 0% for now — pass-through only. Do NOT add a platform fee without explicit owner decision. See AGENTS.md "Human decision required."

---

## State of Play

Already done:
- `apps/thebest/src/lib/server/db/schema.ts` — has `stripeAccountId`, `stripeOnboardingComplete` on `guides`; `paymentIntentId`, `paymentStatus`, `bookingReference` on `bookings`
- `apps/thebest/src/routes/book/[slotId]/+page.svelte` — BookingFlow integrated; has TODO comment for Stripe
- `apps/thebest/src/lib/server/scheduler/drizzle-adapter.ts` — `createBooking` writes to DB already

Missing:
- `stripe` and `resend` packages not installed
- No `src/lib/server/stripe.ts`
- No `src/lib/server/email.ts`
- No Stripe Connect onboarding route
- No Stripe Checkout creation route
- No Stripe webhook handler
- No email notification calls after booking/cancellation
- No guide bookings dashboard (`/guide/bookings`)
- No tourist booking cancellation route

---

## Reference Files (Zaur — read only)

| Feature | Zaur reference |
|---|---|
| Stripe singleton | `C:\cmder\apps\tours\src\lib\stripe.server.ts` |
| Email sender (Resend) | `C:\cmder\apps\tours\src\lib\email\sender.ts` |
| Email templates | `C:\cmder\apps\tours\src\lib\email\templates\` |
| Stripe webhook handler | `C:\cmder\apps\tours\src\routes\api\webhooks\stripe\+server.ts` |
| Payment routes | `C:\cmder\apps\tours\src\routes\api\payments\` |
| Refund handler | `C:\cmder\apps\tours\src\lib\utils\refund-handler.ts` |

---

## Task 1: Install packages

**Files:**
- Modify: `apps/thebest/package.json`

**Step 1: Install stripe and resend**

```bash
cd c:/cmder/apps/asini
pnpm add stripe resend --filter thebest
```

**Step 2: Verify they appear in `apps/thebest/package.json` dependencies**

**Step 3: Run typecheck**

```bash
pnpm --filter thebest check
```

Expected: 0 errors

**Step 4: Commit**

```bash
git add apps/thebest/package.json pnpm-lock.yaml
git commit -m "chore(thebest): add stripe and resend dependencies"
```

---

## Task 2: Stripe server singleton

**Files:**
- Create: `apps/thebest/src/lib/server/stripe.ts`

**Step 1: Write the file**

```typescript
// apps/thebest/src/lib/server/stripe.ts
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
	if (!_stripe) {
		if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
		_stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-05-28.basil', typescript: true });
	}
	return _stripe;
}
```

**Step 2: Run typecheck**

```bash
pnpm --filter thebest check
```

Expected: 0 errors

**Step 3: Commit**

```bash
git add apps/thebest/src/lib/server/stripe.ts
git commit -m "feat(thebest): add Stripe server singleton"
```

---

## Task 3: Resend email server

**Files:**
- Create: `apps/thebest/src/lib/server/email.ts`

**Step 1: Read Zaur's sender.ts and templates for reference**

Look at: `C:\cmder\apps\tours\src\lib\email\sender.ts` (already read above)
Look at: `C:\cmder\apps\tours\src\lib\email\templates\booking-confirmation.ts`

**Step 2: Write a minimal but real email module for thebest**

Build from scratch — do not copy Zaur's template HTML verbatim. Strip all Zaur branding.
thebest.travel brand: clean, minimal. "The Best Travel" or just "thebest.travel".

```typescript
// apps/thebest/src/lib/server/email.ts
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

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

export interface BookingEmailData {
	guestName: string;
	guestEmail: string;
	tourName: string;
	slotStartTime: Date;
	participants: number;
	totalAmount: number;
	currency: string;
	bookingReference: string;
	guideEmail?: string;
	guideName?: string;
}

function formatDate(d: Date): string {
	return d.toLocaleString('en-GB', {
		weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
		hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw'
	});
}

function formatMoney(cents: number, currency: string): string {
	return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
}

export async function sendBookingConfirmation(data: BookingEmailData): Promise<void> {
	const resend = getResend();
	await resend.emails.send({
		from: `${FROM_NAME} <${FROM}>`,
		to: [data.guestEmail],
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
		`
	});
}

export async function sendGuideBookingNotification(data: BookingEmailData): Promise<void> {
	if (!data.guideEmail) return;
	const resend = getResend();
	await resend.emails.send({
		from: `${FROM_NAME} <${FROM}>`,
		to: [data.guideEmail],
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
		`
	});
}

export async function sendCancellationEmail(data: BookingEmailData & { cancelledBy: 'guest' | 'guide' | 'system'; refundAmount: number }): Promise<void> {
	const resend = getResend();
	const refundText = data.refundAmount > 0
		? `A refund of ${formatMoney(data.refundAmount, data.currency)} will be processed within 5-10 business days.`
		: 'No refund applies per the cancellation policy.';
	await resend.emails.send({
		from: `${FROM_NAME} <${FROM}>`,
		to: [data.guestEmail],
		subject: `Booking cancelled: ${data.tourName} — Ref ${data.bookingReference}`,
		html: `
			<h2>Booking cancelled</h2>
			<p>Hi ${data.guestName},</p>
			<p>Your booking for <strong>${data.tourName}</strong> on ${formatDate(data.slotStartTime)} has been cancelled.</p>
			<p>${refundText}</p>
			<p>Reference: <strong>${data.bookingReference}</strong></p>
			<hr/>
			<p style="font-size:12px;color:#666">thebest.travel</p>
		`
	});
}
```

**Step 3: Run typecheck**

```bash
pnpm --filter thebest check
```

Expected: 0 errors

**Step 4: Commit**

```bash
git add apps/thebest/src/lib/server/email.ts
git commit -m "feat(thebest): add Resend email module"
```

---

## Task 4: Stripe Connect onboarding for guides

Guides must connect their Stripe account before their tours go live.
The schema already has `stripeAccountId` and `stripeOnboardingComplete` on `guides`.

**Files:**
- Create: `apps/thebest/src/routes/guide/settings/+page.server.ts`
- Create: `apps/thebest/src/routes/guide/settings/+page.svelte`
- Create: `apps/thebest/src/routes/api/stripe/connect/+server.ts`
- Create: `apps/thebest/src/routes/api/stripe/connect/return/+server.ts`

**Step 1: Write the Connect initiation endpoint**

```typescript
// apps/thebest/src/routes/api/stripe/connect/+server.ts
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getStripe } from '$lib/server/stripe.js';
import { getDb } from '$lib/server/db/index.js';
import { guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) redirect(302, '/auth/login');

	const stripe = getStripe();
	const db = getDb();

	// Get or create Stripe Connect account
	let guide = await db.query.guides.findFirst({ where: eq(guides.id, locals.user.id) });
	if (!guide) redirect(302, '/guide');

	let accountId = guide.stripeAccountId;
	if (!accountId) {
		const account = await stripe.accounts.create({
			type: 'express',
			email: guide.email,
			capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
		});
		accountId = account.id;
		await db.update(guides).set({ stripeAccountId: accountId }).where(eq(guides.id, guide.id));
	}

	const origin = url.origin;
	const accountLink = await stripe.accountLinks.create({
		account: accountId,
		refresh_url: `${origin}/api/stripe/connect`,
		return_url: `${origin}/api/stripe/connect/return`,
		type: 'account_onboarding',
	});

	redirect(302, accountLink.url);
};
```

**Step 2: Write the Connect return handler**

```typescript
// apps/thebest/src/routes/api/stripe/connect/return/+server.ts
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getStripe } from '$lib/server/stripe.js';
import { getDb } from '$lib/server/db/index.js';
import { guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/login');

	const db = getDb();
	const guide = await db.query.guides.findFirst({ where: eq(guides.id, locals.user.id) });

	if (guide?.stripeAccountId) {
		const stripe = getStripe();
		const account = await stripe.accounts.retrieve(guide.stripeAccountId);
		const complete = account.charges_enabled && account.payouts_enabled;
		if (complete) {
			await db.update(guides).set({ stripeOnboardingComplete: true }).where(eq(guides.id, guide.id));
		}
	}

	redirect(302, '/guide/settings?stripe=done');
};
```

**Step 3: Write the guide settings page (server)**

```typescript
// apps/thebest/src/routes/guide/settings/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/login');
	const db = getDb();
	const guide = await db.query.guides.findFirst({ where: eq(guides.id, locals.user.id) });
	return {
		stripeConnected: guide?.stripeOnboardingComplete ?? false,
		stripeAccountId: guide?.stripeAccountId ?? null,
	};
};
```

**Step 4: Write the guide settings page (UI)**

```svelte
<!-- apps/thebest/src/routes/guide/settings/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types.js';
	let { data }: { data: PageData } = $props();
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
	<h1 class="text-2xl font-bold mb-8">Settings</h1>

	<div class="card bg-base-200 shadow mb-6">
		<div class="card-body">
			<h2 class="card-title">Stripe Payments</h2>
			{#if data.stripeConnected}
				<div class="alert alert-success">
					<span>Your Stripe account is connected. You can receive payments.</span>
				</div>
			{:else}
				<p class="text-base-content/70 mb-4">
					Connect your Stripe account to receive payments from tourists.
					You'll be redirected to Stripe to complete the setup.
				</p>
				<a href="/api/stripe/connect" class="btn btn-primary">
					Connect with Stripe
				</a>
			{/if}
		</div>
	</div>
</div>
```

**Step 5: Add settings link to guide layout nav**

Read `apps/thebest/src/routes/guide/+layout.svelte` first, then add a Settings link.

**Step 6: Run typecheck**

```bash
pnpm --filter thebest check
```

Expected: 0 errors

**Step 7: Commit**

```bash
git add apps/thebest/src/routes/guide/settings/ apps/thebest/src/routes/api/stripe/
git commit -m "feat(thebest): Stripe Connect onboarding for guides"
```

---

## Task 5: Stripe Checkout for tourists

After `BookingFlow` creates the booking, redirect to Stripe Checkout.

**Files:**
- Create: `apps/thebest/src/routes/api/checkout/+server.ts`
- Create: `apps/thebest/src/routes/bookings/[ref]/confirmed/+page.svelte`
- Create: `apps/thebest/src/routes/bookings/[ref]/confirmed/+page.server.ts`
- Modify: `apps/thebest/src/routes/book/[slotId]/+page.svelte`

**Step 1: Write the checkout session creator**

Read `C:\cmder\apps\tours\src\routes\api\payments\` for reference first.

```typescript
// apps/thebest/src/routes/api/checkout/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getStripe } from '$lib/server/stripe.js';
import { getDb } from '$lib/server/db/index.js';
import { bookings, tours, slots, guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request, url }) => {
	const { bookingId } = await request.json();
	if (!bookingId) error(400, 'bookingId required');

	const db = getDb();

	// Load booking + tour + guide
	const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
	if (!booking) error(404, 'Booking not found');
	if (booking.paymentStatus === 'paid') error(400, 'Already paid');

	const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId));
	if (!tour) error(404, 'Tour not found');

	const [guide] = await db.select().from(guides).where(eq(guides.id, tour.guideId));
	if (!guide?.stripeAccountId) error(400, 'Guide has not connected Stripe yet');

	const stripe = getStripe();
	const origin = url.origin;

	const session = await stripe.checkout.sessions.create({
		mode: 'payment',
		payment_method_types: ['card'],
		line_items: [{
			price_data: {
				currency: booking.currency.toLowerCase(),
				product_data: { name: tour.name },
				unit_amount: booking.totalAmount, // already in cents
			},
			quantity: 1,
		}],
		payment_intent_data: {
			// Pass-through to guide: 0% platform fee for now
			transfer_data: { destination: guide.stripeAccountId },
			metadata: { bookingId: booking.id, bookingReference: booking.bookingReference },
		},
		metadata: { bookingId: booking.id, bookingReference: booking.bookingReference },
		success_url: `${origin}/bookings/${booking.bookingReference}/confirmed`,
		cancel_url: `${origin}/book/${booking.slotId ?? ''}`,
		customer_email: booking.guestEmail,
	});

	return json({ checkoutUrl: session.url });
};
```

**Step 2: Write the confirmed page (server)**

```typescript
// apps/thebest/src/routes/bookings/[ref]/confirmed/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { bookings, tours } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const [booking] = await db.select().from(bookings).where(eq(bookings.bookingReference, params.ref));
	if (!booking) error(404, 'Booking not found');
	const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId));
	return { booking, tour };
};
```

**Step 3: Write the confirmed page (UI)**

```svelte
<!-- apps/thebest/src/routes/bookings/[ref]/confirmed/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types.js';
	let { data }: { data: PageData } = $props();
</script>

<section class="max-w-xl mx-auto px-4 py-12 text-center">
	<div class="text-5xl mb-4">✓</div>
	<h1 class="text-2xl font-bold mb-2">Booking Confirmed!</h1>
	<p class="text-base-content/70 mb-6">
		Thank you for booking <strong>{data.tour?.name}</strong>.
		A confirmation email has been sent to <strong>{data.booking.guestEmail}</strong>.
	</p>
	<div class="stats shadow mb-6">
		<div class="stat">
			<div class="stat-title">Reference</div>
			<div class="stat-value text-lg">{data.booking.bookingReference}</div>
		</div>
	</div>
	<a href="/tours" class="btn btn-outline">Browse more tours</a>
</section>
```

**Step 4: Update `book/[slotId]/+page.svelte` to redirect to Stripe after booking**

Read the current file first (`apps/thebest/src/routes/book/[slotId]/+page.svelte`), then modify:

- Remove the TODO comment
- In the `onbooked` callback: POST to `/api/checkout` with the bookingId, then `window.location.href = checkoutUrl`
- The `BookingFlow` component exposes a `booking` object in its callback — check `@nomideusz/svelte-scheduler` types for the exact callback signature

```svelte
<!-- Relevant change in book/[slotId]/+page.svelte -->
onbooked={async (booking) => {
    const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
    });
    const { checkoutUrl } = await res.json();
    window.location.href = checkoutUrl;
}}
```

**Step 5: Run typecheck**

```bash
pnpm --filter thebest check
```

Expected: 0 errors

**Step 6: Commit**

```bash
git add apps/thebest/src/routes/api/checkout/ apps/thebest/src/routes/bookings/ apps/thebest/src/routes/book/
git commit -m "feat(thebest): Stripe Checkout payment flow for tourists"
```

---

## Task 6: Stripe webhook handler

Confirms bookings and sends emails on payment success.

**Files:**
- Create: `apps/thebest/src/routes/api/webhooks/stripe/+server.ts`

**Step 1: Read Zaur's webhook for reference**

`C:\cmder\apps\tours\src\routes\api\webhooks\stripe\+server.ts` (already read above)

**Step 2: Write the handler**

Note: thebest is simpler than Zaur — no subscriptions, no SSE broadcasts, no scheduled transfers table.

```typescript
// apps/thebest/src/routes/api/webhooks/stripe/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getStripe } from '$lib/server/stripe.js';
import { getDb } from '$lib/server/db/index.js';
import { bookings, tours, slots, guides } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { sendBookingConfirmation, sendGuideBookingNotification } from '$lib/server/email.js';
import type Stripe from 'stripe';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const sig = request.headers.get('stripe-signature');
	if (!sig) error(400, 'No signature');

	const stripe = getStripe();
	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET!);
	} catch {
		error(400, 'Invalid signature');
	}

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as Stripe.Checkout.Session;
		const bookingId = session.metadata?.bookingId;
		if (!bookingId) return json({ ok: true });

		const db = getDb();
		const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
		if (!booking || booking.paymentStatus === 'paid') return json({ ok: true });

		// Confirm the booking
		await db.update(bookings).set({
			paymentStatus: 'paid',
			status: 'confirmed',
			paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
		}).where(eq(bookings.id, bookingId));

		// Load data for emails
		const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId));
		const slot = booking.slotId
			? (await db.select().from(slots).where(eq(slots.id, booking.slotId)))[0]
			: null;
		const [guide] = tour ? await db.select().from(guides).where(eq(guides.id, tour.guideId)) : [null];

		const emailData = {
			guestName: booking.guestName,
			guestEmail: booking.guestEmail,
			tourName: tour?.name ?? 'Tour',
			slotStartTime: slot?.startTime ?? new Date(),
			participants: booking.participants,
			totalAmount: booking.totalAmount,
			currency: booking.currency,
			bookingReference: booking.bookingReference,
			guideEmail: guide?.email,
			guideName: guide?.name,
		};

		// Fire-and-forget emails (webhook must respond quickly)
		Promise.all([
			sendBookingConfirmation(emailData),
			sendGuideBookingNotification(emailData),
		]).catch(console.error);
	}

	return json({ ok: true });
};
```

**Step 3: Disable CSRF for webhook route**

SvelteKit CSRF protection will block raw body webhooks. Add to `src/hooks.server.ts`:

Read `apps/thebest/src/hooks.server.ts` first, then add the handleFetch or csrf bypass.

The correct pattern for SvelteKit is to export `handle` with a sequence and skip CSRF for `/api/webhooks/stripe`. Look at Zaur's hooks.server.ts if needed.

Actually, SvelteKit doesn't have built-in CSRF that needs bypassing for POST from external sources — its CSRF protection only applies to form actions, not `RequestHandler` endpoints. So no change needed. Just confirm by running typecheck.

**Step 4: Run typecheck**

```bash
pnpm --filter thebest check
```

Expected: 0 errors

**Step 5: Commit**

```bash
git add apps/thebest/src/routes/api/webhooks/
git commit -m "feat(thebest): Stripe webhook handler — confirms booking + sends emails"
```

---

## Task 7: Guide bookings dashboard

**Files:**
- Create: `apps/thebest/src/routes/guide/bookings/+page.server.ts`
- Create: `apps/thebest/src/routes/guide/bookings/+page.svelte`

**Step 1: Write the server load**

```typescript
// apps/thebest/src/routes/guide/bookings/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { bookings, tours, slots } from '$lib/server/db/schema.js';
import { eq, desc, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/login');

	const db = getDb();

	// Get all tours belonging to this guide
	const guideTours = await db.select({ id: tours.id, name: tours.name })
		.from(tours)
		.where(eq(tours.guideId, locals.user.id));

	if (guideTours.length === 0) return { bookings: [], tours: guideTours };

	const tourIds = guideTours.map(t => t.id);

	// Get all bookings for those tours, most recent first
	const rows = await db.select().from(bookings)
		.where(inArray(bookings.tourId, tourIds))
		.orderBy(desc(bookings.createdAt))
		.limit(200);

	return { bookings: rows, tours: guideTours };
};
```

**Step 2: Write the bookings page UI**

```svelte
<!-- apps/thebest/src/routes/guide/bookings/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types.js';
	let { data }: { data: PageData } = $props();

	function tourName(tourId: string) {
		return data.tours.find(t => t.id === tourId)?.name ?? tourId;
	}
	function statusBadge(status: string) {
		const map: Record<string, string> = {
			confirmed: 'badge-success', pending: 'badge-warning',
			cancelled: 'badge-error', completed: 'badge-ghost',
		};
		return map[status] ?? 'badge-neutral';
	}
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
	<h1 class="text-2xl font-bold mb-6">Bookings</h1>

	{#if data.bookings.length === 0}
		<div class="text-base-content/50">No bookings yet.</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table table-zebra">
				<thead>
					<tr>
						<th>Reference</th>
						<th>Tour</th>
						<th>Guest</th>
						<th>Date booked</th>
						<th>Participants</th>
						<th>Amount</th>
						<th>Status</th>
						<th>Payment</th>
					</tr>
				</thead>
				<tbody>
					{#each data.bookings as b}
						<tr>
							<td class="font-mono text-sm">{b.bookingReference}</td>
							<td>{tourName(b.tourId)}</td>
							<td>
								<div>{b.guestName}</div>
								<div class="text-xs text-base-content/60">{b.guestEmail}</div>
							</td>
							<td class="text-sm">{new Date(b.createdAt).toLocaleDateString()}</td>
							<td>{b.participants}</td>
							<td>{(b.totalAmount / 100).toFixed(2)} {b.currency}</td>
							<td><span class="badge {statusBadge(b.status)}">{b.status}</span></td>
							<td><span class="badge badge-outline">{b.paymentStatus}</span></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
```

**Step 3: Add "Bookings" link to guide nav**

Read `apps/thebest/src/routes/guide/+layout.svelte` and add a Bookings link.

**Step 4: Run typecheck**

```bash
pnpm --filter thebest check
```

Expected: 0 errors

**Step 5: Commit**

```bash
git add apps/thebest/src/routes/guide/bookings/ apps/thebest/src/routes/guide/+layout.svelte
git commit -m "feat(thebest): guide bookings dashboard"
```

---

## Task 8: Tourist booking cancellation

**Files:**
- Create: `apps/thebest/src/routes/bookings/[ref]/cancel/+page.server.ts`
- Create: `apps/thebest/src/routes/bookings/[ref]/cancel/+page.svelte`

Logic reference: Zaur's `refund-handler.ts`. For MVP: issue full refund if within policy window, then cancel the booking.
The cancellation policy is stored as `cancellationPolicyJson` on the tour. Use `calculateRefund` from `@nomideusz/svelte-scheduler` (it already exists in the core/policy module).

**Step 1: Read the refund handler from Zaur**

`C:\cmder\apps\tours\src\lib\utils\refund-handler.ts`

**Step 2: Write the cancel page server**

```typescript
// apps/thebest/src/routes/bookings/[ref]/cancel/+page.server.ts
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { getDb } from '$lib/server/db/index.js';
import { bookings, tours, slots } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getStripe } from '$lib/server/stripe.js';
import { calculateRefund } from '@nomideusz/svelte-scheduler';
import { sendCancellationEmail } from '$lib/server/email.js';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const [booking] = await db.select().from(bookings).where(eq(bookings.bookingReference, params.ref));
	if (!booking) error(404, 'Booking not found');
	if (booking.status === 'cancelled') error(410, 'Already cancelled');
	const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId));
	const slot = booking.slotId
		? (await db.select().from(slots).where(eq(slots.id, booking.slotId)))[0]
		: null;
	return { booking, tour, slot };
};

export const actions = {
	cancel: async ({ params }) => {
		const db = getDb();
		const [booking] = await db.select().from(bookings).where(eq(bookings.bookingReference, params.ref));
		if (!booking) return fail(404, { error: 'Not found' });
		if (booking.status === 'cancelled') return fail(400, { error: 'Already cancelled' });

		const [tour] = await db.select().from(tours).where(eq(tours.id, booking.tourId));
		const slot = booking.slotId
			? (await db.select().from(slots).where(eq(slots.id, booking.slotId)))[0]
			: null;

		// Calculate refund using scheduler policy module
		const policy = tour?.cancellationPolicyJson as import('@nomideusz/svelte-scheduler').CancellationPolicy;
		const slotStart = slot?.startTime ?? new Date();
		const { refundAmount } = calculateRefund({
			policy,
			totalPaid: booking.totalAmount,
			slotStartTime: slotStart,
			cancelledBy: 'guest',
		});

		// Issue Stripe refund if paid
		if (booking.paymentStatus === 'paid' && booking.paymentIntentId) {
			const stripe = getStripe();
			if (refundAmount > 0) {
				await stripe.refunds.create({
					payment_intent: booking.paymentIntentId,
					amount: refundAmount,
				});
			}
		}

		// Update booking record
		await db.update(bookings).set({
			status: 'cancelled',
			paymentStatus: refundAmount > 0 ? 'refunded' : booking.paymentStatus,
			cancelledBy: 'guest',
		}).where(eq(bookings.id, booking.id));

		// Send cancellation email (fire and forget)
		if (tour && slot) {
			sendCancellationEmail({
				guestName: booking.guestName,
				guestEmail: booking.guestEmail,
				tourName: tour.name,
				slotStartTime: slot.startTime,
				participants: booking.participants,
				totalAmount: booking.totalAmount,
				currency: booking.currency,
				bookingReference: booking.bookingReference,
				cancelledBy: 'guest',
				refundAmount,
			}).catch(console.error);
		}

		redirect(302, `/bookings/${params.ref}/cancelled`);
	},
} satisfies import('@sveltejs/kit').Actions;
```

**Step 3: Write the cancel page UI**

Simple confirmation page: show booking details + "Confirm cancellation" button that submits the `cancel` action.

Check what refund the guest will receive (show `calculateRefund` result in the UI via load data).

**Step 4: Create a `/bookings/[ref]/cancelled/+page.svelte`**

Simple confirmation that the booking was cancelled and refund is processing.

**Step 5: Run typecheck — check if `calculateRefund` is exported from `@nomideusz/svelte-scheduler`**

```bash
pnpm --filter thebest check
```

If `calculateRefund` is not exported, check `packages/svelte-scheduler/src/lib/index.ts` and `core/index.ts`. If missing, add it. This is within the scheduler package's own scope — acceptable to fix.

**Step 6: Commit**

```bash
git add apps/thebest/src/routes/bookings/
git commit -m "feat(thebest): tourist booking cancellation with Stripe refund"
```

---

## Task 9: Environment variables and .env.example

**Files:**
- Create: `apps/thebest/.env.example`

**Step 1: Write .env.example**

```bash
# apps/thebest/.env.example

# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/thebest

# Stripe (get from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (get from resend.com)
RESEND_API_KEY=re_...

# App origin (for Stripe redirect URLs in dev: http://localhost:5173)
ORIGIN=https://thebest.travel
```

**Step 2: Confirm `.env` is in `.gitignore`**

```bash
grep -n "\.env" apps/thebest/.gitignore
```

If not present, add it.

**Step 3: Commit**

```bash
git add apps/thebest/.env.example
git commit -m "docs(thebest): add .env.example for Stripe + Resend setup"
```

---

## Task 10: Update AGENTS.md build order

**Files:**
- Modify: `AGENTS.md`

Add Step 9 sub-steps to the Build Order section following the same pattern as Steps 8a-8e.

```markdown
Step 9 — First pilot guides on thebest.travel
  9a — Stripe + payments (this plan) 🏗️ IN PROGRESS
    Tasks:   stripe/resend packages, stripe.ts singleton, email.ts
             Stripe Connect onboarding for guides (/guide/settings)
             Stripe Checkout for tourists (/api/checkout)
             Stripe webhook handler (/api/webhooks/stripe)
    Gate:    Guide can connect Stripe account; tourist can pay; webhook confirms booking + sends email

  9b — Guide bookings dashboard
    Tasks:   /guide/bookings — list all bookings for guide's tours
    Gate:    Guide can see all bookings, guest names, payment status

  9c — Tourist cancellation + refund
    Tasks:   /bookings/[ref]/cancel — policy-driven refund via Stripe
    Gate:    Tourist can cancel; refund issued per policy; cancellation email sent

  9d — Production deployment
    Gate:    5 real guides live, real bookings processing
    Note:    Hosting platform decision required (Railway / Fly / VPS)
```

**Step 1: Edit AGENTS.md** — Replace the Step 9 stub with the expanded version above.

**Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: expand Step 9 into sub-steps in AGENTS.md build order"
```

---

## Final validation

```bash
pnpm --filter thebest check   # zero errors
pnpm --filter thebest build   # succeeds
```

If build fails, read the error and fix before claiming done.

---

## Decisions deferred to human

- Platform fee % and payout timing (Step 9d, human decision per AGENTS.md)
- Hosting platform for production (Railway / Fly.io / VPS — human decision)
- Email domain verification for `@thebest.travel` (requires DNS access)
- Stripe webhook endpoint registration (requires Stripe dashboard access)
- Whether to add `calculateRefund` export if missing from scheduler — confirm before touching scheduler public API (cross-package type change boundary)
