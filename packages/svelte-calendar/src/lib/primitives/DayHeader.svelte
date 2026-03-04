<!--
  DayHeader — shared day label primitive.

  Handles both:
    - Relative labels ("Today", "Tomorrow") for day views via fmtDay
    - Short/long weekday + date number for week views
-->
<script lang="ts">
	import { weekdayShort, weekdayLong, monthShort, fmtDay } from '../core/locale.js';

	interface Props {
		/** Timestamp (ms) of the day to label */
		dayMs: number;
		/** Timestamp (ms) of today (for relative labels) */
		todayMs?: number;
		/** Display format */
		format?: 'relative' | 'short' | 'long';
		/** Whether this day is "today" */
		isToday?: boolean;
		/** Whether this day is in the past */
		isPast?: boolean;
	}

	let {
		dayMs,
		todayMs = Date.now(),
		format = 'short',
		isToday = false,
		isPast = false,
	}: Props = $props();

	const dayNum = $derived(new Date(dayMs).getDate());
</script>

<div
	class="dh"
	class:dh-today={isToday}
	class:dh-past={isPast}
>
	{#if format === 'relative'}
		<span class="dh-rel">{fmtDay(dayMs, todayMs)}</span>
	{:else if format === 'long'}
		<span class="dh-name dh-name-long">{weekdayLong(dayMs)}</span>
		<span class="dh-date">{monthShort(dayMs)} {dayNum}</span>
	{:else}
		<span class="dh-name">{weekdayShort(dayMs)}</span>
		<span class="dh-num" class:dh-num-today={isToday}>{dayNum}</span>
	{/if}
</div>

<style>
	.dh {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		user-select: none;
	}
	.dh-past {
		opacity: 0.45;
	}

	.dh-name {
		font: 500 10px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--dt-text-2, rgba(148, 163, 184, 0.55));
	}
	.dh-name-long {
		font-size: 12px;
		text-transform: none;
		letter-spacing: 0.01em;
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
	}

	.dh-num {
		font: 600 14px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}
	.dh-num-today {
		background: var(--dt-accent, #ef4444);
		color: var(--dt-btn-text, #fff);
	}

	.dh-date {
		font: 400 10px / 1 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-text-2, rgba(148, 163, 184, 0.55));
	}

	.dh-rel {
		font: 500 12px / 1.3 var(--dt-sans, 'Outfit', system-ui, sans-serif);
		color: var(--dt-text, rgba(226, 232, 240, 0.85));
	}
	.dh-today .dh-rel {
		color: var(--dt-accent, #ef4444);
	}
</style>
