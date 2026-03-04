<!--
  EmptySlot — clickable empty time slot for "click to create" interactions.

  Renders a transparent hit-target that highlights on hover and emits
  the time range when clicked. View components place these in gaps
  between events.
-->
<script lang="ts">
	import { fmtTime, fmtDuration, getLabels } from '../core/locale.js';

	const L = $derived(getLabels());

	interface Props {
		/** Start time of the empty slot */
		start: Date;
		/** End time of the empty slot */
		end: Date;
		/** Click handler — create event in this range */
		onclick?: (range: { start: Date; end: Date }) => void;
		/** Orientation for cursor hint */
		orientation?: 'horizontal' | 'vertical';
	}

	let {
		start,
		end,
		onclick,
		orientation = 'vertical',
	}: Props = $props();

	const dur = $derived(`${fmtDuration(start, end)} ${L.free}`);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onclick?.({ start, end });
		}
	}
</script>

<div
	class="es"
	class:es-v={orientation === 'vertical'}
	class:es-h={orientation === 'horizontal'}
	role="button"
	tabindex="0"
	aria-label="{L.createEvent}, {fmtTime(start)} to {fmtTime(end)}, {dur}"
	onclick={() => onclick?.({ start, end })}
	onkeydown={handleKeydown}
>
	<div class="es-hint" aria-hidden="true">
		<span class="es-plus">+</span>
		<span class="es-range">{fmtTime(start)} – {fmtTime(end)}</span>
	</div>
</div>

<style>
	.es {
		position: relative;
		cursor: pointer;
		border: 1px dashed transparent;
		border-radius: 6px;
		transition: border-color 150ms, background 150ms;
		min-height: 24px;
	}
	.es:hover {
		border-color: var(--dt-accent-dim, rgba(239, 68, 68, 0.18));
		background: var(--dt-accent-dim, rgba(239, 68, 68, 0.05));
	}
	.es:focus-visible {
		outline: 2px solid var(--dt-accent, #ef4444);
		outline-offset: 2px;
		border-color: var(--dt-accent-dim, rgba(239, 68, 68, 0.18));
	}

	.es-hint {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		opacity: 0;
		transition: opacity 150ms;
	}
	.es:hover .es-hint {
		opacity: 1;
	}

	.es-plus {
		font: 500 14px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-accent, #ef4444);
	}
	.es-range {
		font: 400 10px / 1 var(--dt-mono, 'SF Mono', monospace);
		color: var(--dt-text-2, rgba(148, 163, 184, 0.55));
	}

	.es-v {
		width: 100%;
	}
	.es-h {
		height: 100%;
	}
</style>
