<!--
  TimeGutter — shared hour labels / tick marks.

  Two orientations:
    "horizontal" — ticks along a horizontal track (for day timeline-style layouts)
    "vertical"   — label column along a vertical grid (for WeekTimeline style)
-->
<script lang="ts">
	import { HOURS } from '../core/time.js';
	import { fmtH } from '../core/locale.js';

	interface Props {
		orientation?: 'horizontal' | 'vertical';
		/** Pixel size per hour (width for horizontal, height for vertical) */
		hourSize?: number;
		/** Show half-hour ticks (horizontal only) */
		halfHour?: boolean;
		/** Hours to display (default 0-23) */
		hours?: readonly number[];
		/** Custom hour formatter */
		formatHour?: (h: number) => string;
	}

	let {
		orientation = 'horizontal',
		hourSize = 120,
		halfHour = true,
		hours = HOURS,
		formatHour = fmtH,
	}: Props = $props();
</script>

{#if orientation === 'horizontal'}
	<div class="tg tg-h" style="--tg-hour: {hourSize}px">
		{#each hours as h}
			<div class="tg-tick" style="left: {h * hourSize}px">
				<span class="tg-label">{formatHour(h)}</span>
			</div>
			{#if halfHour}
				<div class="tg-tick tg-tick-half" style="left: {(h + 0.5) * hourSize}px"></div>
			{/if}
		{/each}
	</div>
{:else}
	<div class="tg tg-v" style="--tg-hour: {hourSize}px">
		{#each hours as h}
			<div class="tg-row" style="top: {h * hourSize}px; height: {hourSize}px">
				<span class="tg-label">{formatHour(h)}</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.tg {
		position: relative;
		pointer-events: none;
		user-select: none;
	}

	/* ── Horizontal ── */
	.tg-h {
		height: 100%;
		width: calc(24 * var(--tg-hour));
	}
	.tg-tick {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 0;
		border-left: 1px solid var(--dt-border, rgba(148, 163, 184, 0.07));
	}
	.tg-tick-half {
		border-left-style: dashed;
		opacity: 0.4;
	}
	.tg-h .tg-label {
		position: absolute;
		top: 4px;
		left: 6px;
		font: 400 9px / 1 var(--dt-mono, 'SF Mono', 'Fira Code', monospace);
		color: var(--dt-text-3, rgba(100, 116, 139, 0.55));
		white-space: nowrap;
	}

	/* ── Vertical ── */
	.tg-v {
		width: 48px;
		flex-shrink: 0;
	}
	.tg-row {
		position: absolute;
		left: 0;
		right: 0;
		display: flex;
		align-items: flex-start;
		justify-content: flex-end;
		padding: 2px 8px 0 0;
		border-top: 1px solid var(--dt-border, rgba(148, 163, 184, 0.07));
	}
	.tg-v .tg-label {
		font: 400 9px / 1 var(--dt-mono, 'SF Mono', 'Fira Code', monospace);
		color: var(--dt-text-3, rgba(100, 116, 139, 0.55));
	}
</style>
