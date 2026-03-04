<script lang="ts">
	import type { SchedulerAdapter } from '../adapters/types.js';
	import type { Booking, GuestProfile, TourSlot, TourDefinition, PriceBreakdown } from '../core/types.js';
	import { createBooking, BookingError } from '../core/booking.js';
	import { calculatePrice } from '../core/pricing/index.js';

	interface Props {
		adapter: SchedulerAdapter;
		slotId: string;
		onbooked?: (booking: Booking) => void;
		oncancelled?: () => void;
	}

	let { adapter, slotId, onbooked, oncancelled }: Props = $props();

	// Steps: 1=slot-summary, 2=guest-details, 3=participants, 4=price-summary, 5=confirm, 6=confirmation
	let step = $state(1);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let slot = $state<TourSlot | null>(null);
	let tour = $state<TourDefinition | null>(null);
	let booking = $state<Booking | null>(null);

	let guest = $state<GuestProfile>({ name: '', email: '', phone: '' });
	let participants = $state(1);
	let participantsByCategory = $state<Record<string, number>>({});
	let selectedAddonIds = $state<string[]>([]);
	let specialRequests = $state('');
	let priceBreakdown = $state<PriceBreakdown | null>(null);
	let submitting = $state(false);

	// Load slot and tour on mount
	$effect(() => {
		loadSlot();
	});

	async function loadSlot() {
		loading = true;
		error = null;
		try {
			slot = (await adapter.getSlotById(slotId)) ?? null;
			if (!slot) {
				error = 'Slot not found.';
				return;
			}
			tour = (await adapter.getTourById(slot.tourId)) ?? null;
			if (!tour) {
				error = 'Tour not found.';
				return;
			}
			// Initialize category counts
			if (tour.pricing.model === 'participant_categories' && tour.pricing.participantCategories) {
				const initial: Record<string, number> = {};
				for (const cat of tour.pricing.participantCategories) {
					initial[cat.id] = 0;
				}
				if (tour.pricing.participantCategories.length > 0) {
					initial[tour.pricing.participantCategories[0].id] = 1;
				}
				participantsByCategory = initial;
				participants = 1;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load slot.';
		} finally {
			loading = false;
		}
	}

	function availableSpots(): number {
		if (!slot) return 0;
		return slot.availableSpots - slot.bookedSpots;
	}

	function totalCategoryParticipants(): number {
		return Object.values(participantsByCategory).reduce((s, n) => s + n, 0);
	}

	function validateGuest(): string | null {
		if (!guest.name.trim()) return 'Name is required.';
		if (!guest.email.trim()) return 'Email is required.';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) return 'Invalid email address.';
		return null;
	}

	function validateParticipants(): string | null {
		const count =
			tour?.pricing.model === 'participant_categories'
				? totalCategoryParticipants()
				: participants;
		if (count <= 0) return 'At least 1 participant is required.';
		if (count > availableSpots()) return `Only ${availableSpots()} spot(s) available.`;
		return null;
	}

	function computePrice() {
		if (!tour) return;
		const count =
			tour.pricing.model === 'participant_categories'
				? totalCategoryParticipants()
				: participants;
		priceBreakdown = calculatePrice({
			pricing: tour.pricing,
			participants: count,
			participantsByCategory:
				tour.pricing.model === 'participant_categories' ? participantsByCategory : undefined,
			selectedAddonIds: selectedAddonIds.length ? selectedAddonIds : undefined,
		});
	}

	function goToStep(n: number) {
		error = null;
		step = n;
	}

	function handleGuestNext() {
		const err = validateGuest();
		if (err) { error = err; return; }
		goToStep(3);
	}

	function handleParticipantsNext() {
		const err = validateParticipants();
		if (err) { error = err; return; }
		computePrice();
		goToStep(4);
	}

	async function handleConfirm() {
		if (!tour || !slot) return;
		submitting = true;
		error = null;
		try {
			const count =
				tour.pricing.model === 'participant_categories'
					? totalCategoryParticipants()
					: participants;
			const result = await createBooking(adapter, slotId, guest, count, {
				participantsByCategory:
					tour.pricing.model === 'participant_categories' ? participantsByCategory : undefined,
				selectedAddonIds: selectedAddonIds.length ? selectedAddonIds : undefined,
				specialRequests: specialRequests.trim() || undefined,
			});
			booking = result;
			goToStep(6);
			onbooked?.(result);
		} catch (e) {
			if (e instanceof BookingError) {
				error = e.message;
			} else {
				error = e instanceof Error ? e.message : 'Booking failed. Please try again.';
			}
		} finally {
			submitting = false;
		}
	}

	function formatDate(d: Date): string {
		return new Date(d).toLocaleString(undefined, {
			weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
			hour: '2-digit', minute: '2-digit',
		});
	}

	function formatCurrency(amount: number, currency: string): string {
		return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
	}
</script>

<div class="bf-root">
	{#if loading}
		<p class="bf-loading">Loading…</p>
	{:else if error && step === 1 && !slot}
		<p class="bf-error">{error}</p>
	{:else if slot && tour}

		<!-- Step indicator -->
		<div class="bf-steps" aria-label="Booking steps">
			{#each [1,2,3,4,5] as s}
				<span class="bf-step" class:bf-step--active={step === s} class:bf-step--done={step > s}>
					{s}
				</span>
			{/each}
		</div>

		<!-- Step 1: Slot summary -->
		{#if step === 1}
			<div class="bf-panel">
				<h2 class="bf-heading">Tour summary</h2>
				<dl class="bf-dl">
					<dt>Tour</dt><dd>{tour.name}</dd>
					<dt>Date &amp; time</dt><dd>{formatDate(slot.startTime)}</dd>
					<dt>Location</dt><dd>{tour.location ?? '—'}</dd>
					<dt>Available spots</dt><dd>{availableSpots()}</dd>
					<dt>Duration</dt><dd>{tour.duration} min</dd>
				</dl>
				<div class="bf-actions">
					{#if oncancelled}
						<button class="bf-btn bf-btn--secondary" onclick={oncancelled}>Cancel</button>
					{/if}
					<button class="bf-btn bf-btn--primary" onclick={() => goToStep(2)}>Continue</button>
				</div>
			</div>

		<!-- Step 2: Guest details -->
		{:else if step === 2}
			<div class="bf-panel">
				<h2 class="bf-heading">Your details</h2>
				{#if error}<p class="bf-error">{error}</p>{/if}
				<div class="bf-field">
					<label for="bf-name">Full name *</label>
					<input id="bf-name" type="text" bind:value={guest.name} placeholder="Jane Doe" autocomplete="name" />
				</div>
				<div class="bf-field">
					<label for="bf-email">Email address *</label>
					<input id="bf-email" type="email" bind:value={guest.email} placeholder="jane@example.com" autocomplete="email" />
				</div>
				<div class="bf-field">
					<label for="bf-phone">Phone (optional)</label>
					<input id="bf-phone" type="tel" bind:value={guest.phone} placeholder="+1 555 000 0000" autocomplete="tel" />
				</div>
				<div class="bf-actions">
					<button class="bf-btn bf-btn--secondary" onclick={() => goToStep(1)}>Back</button>
					<button class="bf-btn bf-btn--primary" onclick={handleGuestNext}>Continue</button>
				</div>
			</div>

		<!-- Step 3: Participants -->
		{:else if step === 3}
			<div class="bf-panel">
				<h2 class="bf-heading">Participants</h2>
				{#if error}<p class="bf-error">{error}</p>{/if}

				{#if tour.pricing.model === 'participant_categories' && tour.pricing.participantCategories}
					<p class="bf-hint">Select number of participants per category.</p>
					{#each tour.pricing.participantCategories as cat (cat.id)}
						<div class="bf-field bf-field--inline">
							<label for="bf-cat-{cat.id}">
								{cat.label}
								{#if cat.ageRange}<span class="bf-meta">{cat.ageRange}</span>{/if}
								— {formatCurrency(cat.price, tour.pricing.currency)}
							</label>
							<input
								id="bf-cat-{cat.id}"
								type="number"
								min="0"
								max={availableSpots()}
								bind:value={participantsByCategory[cat.id]}
							/>
						</div>
					{/each}
					<p class="bf-meta">Total: {totalCategoryParticipants()} / {availableSpots()} spots</p>
				{:else}
					<div class="bf-field">
						<label for="bf-participants">Number of participants</label>
						<input
							id="bf-participants"
							type="number"
							min="1"
							max={availableSpots()}
							bind:value={participants}
						/>
					</div>
				{/if}

				{#if tour.pricing.optionalAddons?.length}
					<div class="bf-addons">
						<h3 class="bf-subheading">Add-ons</h3>
						{#each tour.pricing.optionalAddons as addon (addon.id)}
							<div class="bf-field bf-field--checkbox">
								<input
									id="bf-addon-{addon.id}"
									type="checkbox"
									checked={addon.required || selectedAddonIds.includes(addon.id)}
									disabled={addon.required}
									onchange={(e) => {
										const checked = (e.target as HTMLInputElement).checked;
										if (checked) {
											selectedAddonIds = [...selectedAddonIds, addon.id];
										} else {
											selectedAddonIds = selectedAddonIds.filter(id => id !== addon.id);
										}
									}}
								/>
								<label for="bf-addon-{addon.id}">
									{addon.name} — {formatCurrency(addon.price, tour.pricing.currency)}
									{#if addon.description}<span class="bf-meta">{addon.description}</span>{/if}
								</label>
							</div>
						{/each}
					</div>
				{/if}

				<div class="bf-actions">
					<button class="bf-btn bf-btn--secondary" onclick={() => goToStep(2)}>Back</button>
					<button class="bf-btn bf-btn--primary" onclick={handleParticipantsNext}>Continue</button>
				</div>
			</div>

		<!-- Step 4: Price summary -->
		{:else if step === 4 && priceBreakdown}
			<div class="bf-panel">
				<h2 class="bf-heading">Price summary</h2>
				<dl class="bf-dl">
					<dt>Base price</dt><dd>{formatCurrency(priceBreakdown.basePrice, tour.pricing.currency)}</dd>
					{#if priceBreakdown.groupDiscount > 0}
						<dt>Group discount</dt><dd class="bf-discount">−{formatCurrency(priceBreakdown.groupDiscount, tour.pricing.currency)}</dd>
					{/if}
					{#if priceBreakdown.addonsTotal > 0}
						<dt>Add-ons</dt><dd>{formatCurrency(priceBreakdown.addonsTotal, tour.pricing.currency)}</dd>
					{/if}
					{#if priceBreakdown.processingFee > 0}
						<dt>Processing fee</dt><dd>{formatCurrency(priceBreakdown.processingFee, tour.pricing.currency)}</dd>
					{/if}
				</dl>
				<div class="bf-total">
					<span>Total</span>
					<strong>{formatCurrency(priceBreakdown.totalAmount, tour.pricing.currency)}</strong>
				</div>
				{#if priceBreakdown.errors.length}
					<ul class="bf-errors">
						{#each priceBreakdown.errors as e}<li>{e}</li>{/each}
					</ul>
				{/if}
				{#if priceBreakdown.categoryBreakdown}
					<details class="bf-details">
						<summary>Per-category breakdown</summary>
						<dl class="bf-dl">
							{#each Object.entries(priceBreakdown.categoryBreakdown) as [, row]}
								<dt>{row.label} × {row.count}</dt>
								<dd>{formatCurrency(row.subtotal, tour.pricing.currency)}</dd>
							{/each}
						</dl>
					</details>
				{/if}
				<div class="bf-field">
					<label for="bf-special">Special requests (optional)</label>
					<textarea id="bf-special" bind:value={specialRequests} rows="2"></textarea>
				</div>
				<div class="bf-actions">
					<button class="bf-btn bf-btn--secondary" onclick={() => goToStep(3)}>Back</button>
					<button class="bf-btn bf-btn--primary" onclick={() => goToStep(5)}>Continue</button>
				</div>
			</div>

		<!-- Step 5: Confirm -->
		{:else if step === 5}
			<div class="bf-panel">
				<h2 class="bf-heading">Confirm booking</h2>
				{#if error}<p class="bf-error">{error}</p>{/if}
				<dl class="bf-dl">
					<dt>Tour</dt><dd>{tour.name}</dd>
					<dt>Date</dt><dd>{formatDate(slot.startTime)}</dd>
					<dt>Name</dt><dd>{guest.name}</dd>
					<dt>Email</dt><dd>{guest.email}</dd>
					{#if guest.phone}<dt>Phone</dt><dd>{guest.phone}</dd>{/if}
					<dt>Participants</dt>
					<dd>
						{#if tour.pricing.model === 'participant_categories'}
							{totalCategoryParticipants()}
						{:else}
							{participants}
						{/if}
					</dd>
					{#if priceBreakdown}
						<dt>Total</dt><dd><strong>{formatCurrency(priceBreakdown.totalAmount, tour.pricing.currency)}</strong></dd>
					{/if}
				</dl>
				<div class="bf-actions">
					<button class="bf-btn bf-btn--secondary" onclick={() => goToStep(4)} disabled={submitting}>Back</button>
					<button class="bf-btn bf-btn--primary" onclick={handleConfirm} disabled={submitting}>
						{submitting ? 'Booking…' : 'Confirm booking'}
					</button>
				</div>
			</div>

		<!-- Step 6: Confirmation -->
		{:else if step === 6 && booking}
			<div class="bf-panel bf-panel--success">
				<h2 class="bf-heading">Booking confirmed!</h2>
				<p class="bf-confirm-ref">Reference: <strong>{booking.bookingReference}</strong></p>
				<dl class="bf-dl">
					<dt>Tour</dt><dd>{tour.name}</dd>
					<dt>Date</dt><dd>{formatDate(slot.startTime)}</dd>
					<dt>Name</dt><dd>{booking.guest.name}</dd>
					<dt>Email</dt><dd>{booking.guest.email}</dd>
					<dt>Participants</dt><dd>{booking.participants}</dd>
					<dt>Total paid</dt><dd>{formatCurrency(booking.totalAmount, booking.currency)}</dd>
				</dl>
				<p class="bf-next-steps">A confirmation has been noted. Enjoy your tour!</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.bf-root {
		font-family: var(--asini-font-sans, sans-serif);
		color: var(--asini-text, #111);
		background: var(--asini-bg, #fff);
		max-width: 480px;
	}

	.bf-loading,
	.bf-error {
		padding: 0.75rem 1rem;
		border-radius: var(--asini-radius-sm, 4px);
	}

	.bf-loading {
		color: var(--asini-text-2, #555);
	}

	.bf-error {
		color: var(--asini-danger, #c00);
		background: color-mix(in srgb, var(--asini-danger, #c00) 10%, transparent);
		margin-bottom: 0.75rem;
	}

	.bf-errors {
		list-style: none;
		padding: 0;
		margin: 0 0 0.75rem;
	}

	.bf-errors li {
		color: var(--asini-danger, #c00);
		font-size: 0.875rem;
	}

	.bf-steps {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 1.5rem;
	}

	.bf-step {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--asini-surface, #f5f5f5);
		color: var(--asini-text-3, #999);
		font-size: 0.875rem;
		border: 1px solid var(--asini-border, #ddd);
	}

	.bf-step--active {
		background: var(--asini-accent, #0066cc);
		color: #fff;
		border-color: var(--asini-accent, #0066cc);
	}

	.bf-step--done {
		background: var(--asini-success, #009900);
		color: #fff;
		border-color: var(--asini-success, #009900);
	}

	.bf-panel {
		background: var(--asini-surface, #f9f9f9);
		border: 1px solid var(--asini-border, #ddd);
		border-radius: var(--asini-radius, 8px);
		padding: 1.5rem;
	}

	.bf-panel--success {
		border-color: var(--asini-success, #009900);
	}

	.bf-heading {
		margin: 0 0 1rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--asini-text, #111);
	}

	.bf-subheading {
		margin: 1rem 0 0.5rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--asini-text, #111);
	}

	.bf-dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.35rem 1rem;
		margin: 0 0 1rem;
	}

	.bf-dl dt {
		color: var(--asini-text-2, #555);
		font-size: 0.875rem;
	}

	.bf-dl dd {
		margin: 0;
		font-size: 0.875rem;
	}

	.bf-discount {
		color: var(--asini-success, #009900);
	}

	.bf-total {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 0;
		border-top: 1px solid var(--asini-border, #ddd);
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}

	.bf-total strong {
		color: var(--asini-accent, #0066cc);
		font-size: 1.25rem;
	}

	.bf-field {
		margin-bottom: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.bf-field label {
		font-size: 0.875rem;
		color: var(--asini-text-2, #555);
	}

	.bf-field input,
	.bf-field textarea {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--asini-border, #ddd);
		border-radius: var(--asini-radius-sm, 4px);
		background: var(--asini-bg, #fff);
		color: var(--asini-text, #111);
		font-family: inherit;
		font-size: 0.95rem;
	}

	.bf-field--inline {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}

	.bf-field--inline input {
		width: 5rem;
	}

	.bf-field--checkbox {
		flex-direction: row;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.bf-field--checkbox input {
		margin-top: 0.2rem;
		width: auto;
		padding: 0;
	}

	.bf-hint {
		font-size: 0.875rem;
		color: var(--asini-text-2, #555);
		margin-bottom: 0.75rem;
	}

	.bf-meta {
		font-size: 0.8rem;
		color: var(--asini-text-3, #999);
	}

	.bf-addons {
		border-top: 1px solid var(--asini-border, #ddd);
		padding-top: 0.75rem;
		margin-top: 0.75rem;
	}

	.bf-details {
		margin-bottom: 1rem;
	}

	.bf-details summary {
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--asini-accent, #0066cc);
	}

	.bf-confirm-ref {
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	.bf-next-steps {
		font-size: 0.875rem;
		color: var(--asini-text-2, #555);
		margin-top: 1rem;
	}

	.bf-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1.25rem;
	}

	.bf-btn {
		padding: 0.5rem 1.25rem;
		border-radius: var(--asini-radius-sm, 4px);
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		transition: opacity 0.15s;
	}

	.bf-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.bf-btn--primary {
		background: var(--asini-accent, #0066cc);
		color: #fff;
		border-color: var(--asini-accent, #0066cc);
	}

	.bf-btn--secondary {
		background: var(--asini-surface, #f5f5f5);
		color: var(--asini-text, #111);
		border-color: var(--asini-border, #ddd);
	}
</style>
