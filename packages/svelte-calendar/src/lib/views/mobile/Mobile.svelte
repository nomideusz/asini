<script lang="ts">
	import MobileDay from './MobileDay.svelte';
	import MobileWeek from './MobileWeek.svelte';

	interface Props {
		mode?: 'day' | 'week';
		[key: string]: unknown;
	}

	let { mode = 'day', ...rest }: Props = $props();
</script>

{#if mode === 'day'}
	<MobileDay {...rest} />
{:else}
	<MobileWeek {...rest} />
{/if}
