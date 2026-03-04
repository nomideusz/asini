<!--
  NowIndicator — shared "now" marker component.

  Three visual modes:
    "line"  — vertical/horizontal line with time label (default)
    "dot"   — circular dot with time label
    "badge" — inline text badge ("now")

  Usage:
    <NowIndicator position={nowPx} time={clock.hm} seconds={clock.s} />
    <NowIndicator mode="dot" position={nowPx} time={clock.hm} />
    <NowIndicator mode="badge" />
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getLabels } from '../core/locale.js';

	const L = $derived(getLabels());

	interface Props {
		/** Visual mode */
		mode?: 'line' | 'dot' | 'badge';
		/** Pixel offset for positioning (line/dot modes) */
		position?: number;
		/** Orientation of the line/dot */
		orientation?: 'vertical' | 'horizontal';
		/** Formatted time string (e.g. "14:30") */
		time?: string;
		/** Formatted seconds string (e.g. ":05") */
		seconds?: string;
		/** Show the time label */
		showLabel?: boolean;
		/** Accent color override */
		color?: string;
		/** Custom content slot */
		children?: Snippet;
	}

	let {
		mode = 'line',
		position = 0,
		orientation = 'vertical',
		time = '',
		seconds = '',
		showLabel = true,
		color,
		children,
	}: Props = $props();

	const posStyle = $derived(
		orientation === 'vertical'
			? `left: ${position}px`
			: `top: ${position}px`,
	);
	const colorVar = $derived(color ? `--ni-color: ${color}` : '');
</script>

{#if mode === 'badge'}
	<span class="ni-badge" style={colorVar} role="status" aria-live="polite" aria-label="{L.currentTime}: {time}">
		{#if children}
			{@render children()}
		{:else}
			{L.now}
		{/if}
	</span>
{:else if mode === 'dot'}
	<div class="ni ni-dot {orientation}" style="{posStyle}; {colorVar}" role="status" aria-label="{L.currentTime}: {time}">
		<div class="ni-dot-circle"></div>
		{#if showLabel && time}
			<div class="ni-label">
				<span class="ni-time">{time}</span>
				{#if seconds}<span class="ni-sec">{seconds}</span>{/if}
			</div>
		{/if}
	</div>
{:else}
	<div class="ni ni-line {orientation}" style="{posStyle}; {colorVar}" role="status" aria-label="{L.currentTime}: {time}">
		<div class="ni-line-bar"></div>
		{#if showLabel && time}
			<div class="ni-label">
				<span class="ni-time">{time}</span>
				{#if seconds}<span class="ni-sec">{seconds}</span>{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.ni {
		position: absolute;
		z-index: 10;
		pointer-events: none;
	}

	/* ── Line mode ── */
	.ni-line.vertical {
		top: 0;
		bottom: 0;
		width: 0;
	}
	.ni-line.horizontal {
		left: 0;
		right: 0;
		height: 0;
	}
	.ni-line-bar {
		background: var(--ni-color, var(--dt-accent, #ef4444));
	}
	.ni-line.vertical .ni-line-bar {
		width: 2px;
		height: 100%;
		margin-left: -1px;
	}
	.ni-line.horizontal .ni-line-bar {
		height: 2px;
		width: 100%;
		margin-top: -1px;
	}

	/* ── Dot mode ── */
	.ni-dot-circle {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--ni-color, var(--dt-accent, #ef4444));
		box-shadow: 0 0 6px var(--ni-color, var(--dt-glow, rgba(239, 68, 68, 0.35)));
	}
	.ni-dot.vertical .ni-dot-circle {
		margin-left: -5px;
	}
	.ni-dot.horizontal .ni-dot-circle {
		margin-top: -5px;
	}

	/* ── Label ── */
	.ni-label {
		position: absolute;
		white-space: nowrap;
		font: 600 10px / 1 var(--dt-mono, 'SF Mono', 'Fira Code', monospace);
		color: var(--dt-btn-text, #fff);
		background: var(--ni-color, var(--dt-accent, #ef4444));
		padding: 3px 6px;
		border-radius: 4px;
	}
	.ni-line.vertical .ni-label,
	.ni-dot.vertical .ni-label {
		top: 0;
		transform: translateX(-50%);
	}
	.ni-line.horizontal .ni-label,
	.ni-dot.horizontal .ni-label {
		left: 0;
		transform: translateY(-100%) translateY(-4px);
	}
	.ni-sec {
		opacity: 0.6;
		font-weight: 400;
	}

	/* ── Badge mode ── */
	.ni-badge {
		display: inline-flex;
		align-items: center;
		font: 700 9px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--dt-btn-text, #fff);
		background: var(--ni-color, var(--dt-accent, #ef4444));
		padding: 2px 7px;
		border-radius: 3px;
		animation: ni-pulse 2s ease-in-out infinite;
	}

	@keyframes ni-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}
</style>
