<script lang="ts">
	import PlannerDay from './PlannerDay.svelte';
	import PlannerWeek from './PlannerWeek.svelte';

	interface Props {
		mode?: 'day' | 'week';
		[key: string]: unknown;
	}

	let { mode = 'week', ...rest }: Props = $props();
</script>

{#if mode === 'day'}
	<PlannerDay {...rest} />
{:else}
	<PlannerWeek {...rest} />
{/if}
