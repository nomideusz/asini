<script lang="ts">
	import AgendaDay from './AgendaDay.svelte';
	import AgendaWeek from './AgendaWeek.svelte';

	interface Props {
		mode?: 'day' | 'week';
		[key: string]: unknown;
	}

	let { mode = 'day', ...rest }: Props = $props();
</script>

{#if mode === 'day'}
	<AgendaDay {...rest} />
{:else}
	<AgendaWeek {...rest} />
{/if}
