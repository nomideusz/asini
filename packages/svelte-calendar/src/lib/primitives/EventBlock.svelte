<!--
  EventBlock — shared event rendering primitive.

  Three display variants:
    "chip"   — compact colored chip (dot + title)
    "card"   — full card (title, time, duration, color stripe)
    "row"    — full-width row (time, title, duration — agenda style)

  Emits: onclick, ondragstart, onresize (for future interaction wiring)
-->
<script lang="ts">
	import type { TimelineEvent } from '../core/types.js';
	import { fmtTime, fmtDuration, getLabels } from '../core/locale.js';
	import type { Snippet } from 'svelte';

	const L = $derived(getLabels());

	interface Props {
		event: TimelineEvent;
		/** Display variant */
		variant?: 'chip' | 'card' | 'row';
		/** Is this event currently in-progress? */
		active?: boolean;
		/** Is this event in the past? */
		past?: boolean;
		/** Show the time range */
		showTime?: boolean;
		/** Show the duration */
		showDuration?: boolean;
		/** Editable (shows resize handles in future) */
		editable?: boolean;
		/** Click handler */
		onclick?: (event: TimelineEvent) => void;
		/** Custom content slot */
		children?: Snippet<[TimelineEvent]>;
	}

	let {
		event,
		variant = 'chip',
		active = false,
		past = false,
		showTime = false,
		showDuration = false,
		editable = false,
		onclick,
		children,
	}: Props = $props();

	const accentColor = $derived(event.color || 'var(--dt-accent, #ef4444)');
	const isCancelled = $derived(event.status === 'cancelled');
	const isTentative = $derived(event.status === 'tentative');

	const ariaLabel = $derived.by(() => {
		const t = event.title;
		const time = `${fmtTime(event.start)} to ${fmtTime(event.end)}`;
		const dur = fmtDuration(event.start, event.end);
		const loc = event.location ? `, ${event.location}` : '';
		const statusStr = isCancelled ? ', cancelled' : isTentative ? ', tentative' : '';
		const activeStr = active ? `, ${L.happeningNow}` : past ? `, ${L.past}` : '';
		return `${t}${loc}, ${time}, ${dur}${statusStr}${activeStr}`;
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onclick?.(event);
		}
	}
</script>

{#snippet content()}
	{#if children}
		{@render children(event)}
	{:else if variant === 'chip'}
		<span class="eb-dot"></span>
		<span class="eb-title">{event.title}</span>
		{#if active}<span class="eb-live">●</span>{/if}
	{:else if variant === 'card'}
		<div class="eb-stripe"></div>
		<div class="eb-body">
			<span class="eb-title">{event.title}</span>
			{#if event.subtitle}
				<span class="eb-subtitle">{event.subtitle}</span>
			{/if}
			{#if event.location}
				<span class="eb-location">📍 {event.location}</span>
			{/if}
			{#if showTime}
				<span class="eb-time">{fmtTime(event.start)} – {fmtTime(event.end)}</span>
			{/if}
			{#if showDuration}
				<span class="eb-dur">{fmtDuration(event.start, event.end)}</span>
			{/if}
			{#if event.tags && event.tags.length > 0}
				<div class="eb-tags">
					{#each event.tags as tag}
						<span class="eb-tag">{tag}</span>
					{/each}
				</div>
			{/if}
			{#if isCancelled}<span class="eb-status-badge eb-cancelled-badge">Cancelled</span>{/if}
			{#if isTentative}<span class="eb-status-badge eb-tentative-badge">Tentative</span>{/if}
			{#if active}<span class="eb-live-badge">{L.now}</span>{/if}
		</div>
	{:else}
		<!-- row -->
		<span class="eb-stripe"></span>
		<span class="eb-time">{fmtTime(event.start)} – {fmtTime(event.end)}</span>
		<span class="eb-title">{event.title}</span>
		{#if event.subtitle}
			<span class="eb-subtitle">{event.subtitle}</span>
		{/if}
		{#if event.location}
			<span class="eb-location">📍 {event.location}</span>
		{/if}
		{#if showDuration}
			<span class="eb-dur">{fmtDuration(event.start, event.end)}</span>
		{/if}
		{#if event.tags && event.tags.length > 0}
			<span class="eb-tags">
				{#each event.tags as tag}
					<span class="eb-tag">{tag}</span>
				{/each}
			</span>
		{/if}
		{#if isCancelled}<span class="eb-status-badge eb-cancelled-badge">Cancelled</span>{/if}
		{#if active}<span class="eb-live-badge">{L.now}</span>{/if}
	{/if}
{/snippet}

{#if onclick}
<div
	class="eb eb-{variant}"
	class:eb-active={active}
	class:eb-past={past}
	class:eb-cancelled={isCancelled}
	class:eb-tentative={isTentative}
	class:eb-editable={editable}
	style="--eb-color: {accentColor}"
	role="button"
	tabindex="0"
	aria-label={ariaLabel}
	aria-current={active ? 'true' : undefined}
	onclick={() => onclick?.(event)}
	onkeydown={handleKeydown}
>
	{@render content()}
</div>
{:else}
<div
	class="eb eb-{variant}"
	class:eb-active={active}
	class:eb-past={past}
	class:eb-cancelled={isCancelled}
	class:eb-tentative={isTentative}
	class:eb-editable={editable}
	style="--eb-color: {accentColor}"
	role="article"
	aria-label={ariaLabel}
	aria-current={active ? 'true' : undefined}
>
	{@render content()}
</div>
{/if}

<style>
	.eb {
		--_color: var(--eb-color, var(--dt-accent, #ef4444));
		cursor: default;
		transition: opacity 120ms, transform 80ms;
	}
	.eb-editable {
		cursor: pointer;
	}
	.eb-editable:hover {
		transform: translateY(-1px);
	}
	.eb:focus-visible {
		outline: 2px solid var(--dt-accent, #ef4444);
		outline-offset: 2px;
		border-radius: 4px;
	}
	.eb-past {
		opacity: 0.5;
	}
	.eb-cancelled {
		opacity: 0.45;
	}
	.eb-cancelled .eb-title {
		text-decoration: line-through;
	}
	.eb-tentative {
		opacity: 0.7;
	}
	.eb-tentative .eb-stripe {
		background: repeating-linear-gradient(
			45deg,
			var(--_color),
			var(--_color) 2px,
			transparent 2px,
			transparent 4px
		);
	}

	/* ── Chip ── */
	.eb-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font: 400 11px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.eb-chip .eb-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--_color);
		flex-shrink: 0;
	}
	.eb-chip .eb-title {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.eb-live {
		color: var(--_color);
		font-size: 8px;
		animation: eb-blink 1.5s ease-in-out infinite;
	}

	/* ── Card ── */
	.eb-card {
		display: flex;
		border-radius: 8px;
		background: var(--dt-surface, #10141c);
		border: 1px solid var(--dt-border, rgba(148, 163, 184, 0.07));
		overflow: hidden;
	}
	.eb-card .eb-stripe {
		width: 4px;
		flex-shrink: 0;
		background: var(--_color);
	}
	.eb-card .eb-body {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 8px 10px;
		min-width: 0;
	}
	.eb-card .eb-title {
		font: 500 12px / 1.3 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.eb-card .eb-time {
		font: 400 10px / 1 var(--dt-mono, 'SF Mono', monospace);
		color: var(--dt-text-2, rgba(148, 163, 184, 0.55));
	}
	.eb-card .eb-dur {
		font: 300 10px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-text-3, rgba(100, 116, 139, 0.55));
	}

	/* ── Row ── */
	.eb-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 12px;
		border-bottom: 1px solid var(--dt-border, rgba(148, 163, 184, 0.07));
	}
	.eb-row .eb-stripe {
		width: 3px;
		height: 100%;
		min-height: 20px;
		border-radius: 2px;
		background: var(--_color);
		flex-shrink: 0;
	}
	.eb-row .eb-time {
		font: 400 10px / 1 var(--dt-mono, 'SF Mono', monospace);
		color: var(--dt-text-2, rgba(148, 163, 184, 0.55));
		flex-shrink: 0;
		width: 90px;
	}
	.eb-row .eb-title {
		font: 400 12px / 1.3 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.eb-row .eb-dur {
		font: 300 10px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-text-3, rgba(100, 116, 139, 0.55));
		flex-shrink: 0;
	}

	/* ── Shared ── */
	.eb-subtitle {
		font: 400 10px / 1.2 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-text-2, rgba(148, 163, 184, 0.65));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.eb-tags {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 3px;
	}
	.eb-tag {
		display: inline-block;
		font: 500 8px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 2px 5px;
		border-radius: 3px;
		background: color-mix(in srgb, var(--_color) 18%, transparent);
		color: var(--_color);
	}
	.eb-location {
		font: 400 9px / 1.2 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-text-3, rgba(100, 116, 139, 0.55));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.eb-status-badge {
		display: inline-flex;
		align-items: center;
		font: 700 8px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 2px 6px;
		border-radius: 3px;
		width: fit-content;
	}
	.eb-cancelled-badge {
		color: var(--dt-text-2, rgba(148, 163, 184, 0.65));
		background: color-mix(in srgb, var(--dt-text-2, rgba(148, 163, 184, 0.3)) 15%, transparent);
	}
	.eb-tentative-badge {
		color: var(--_color);
		background: color-mix(in srgb, var(--_color) 12%, transparent);
	}
	.eb-live-badge {
		display: inline-flex;
		align-items: center;
		font: 700 8px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--dt-btn-text, #fff);
		background: var(--_color);
		padding: 2px 6px;
		border-radius: 3px;
		width: fit-content;
		animation: eb-blink 2s ease-in-out infinite;
	}

	@keyframes eb-blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}
</style>
