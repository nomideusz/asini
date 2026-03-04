<script lang="ts">
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { themeStore, setTheme, demoThemes, demoThemeNames } from './theme.svelte.js';
	import type { DemoThemeName } from './theme.svelte.js';

	let { children } = $props();

	const path = $derived(page.url.pathname);

	$effect(() => {
		const t = themeStore.current;
		const dt = demoThemes[t];
		const scheme = dt.dark ? 'dark' : 'light';
		document.documentElement.dataset.theme = t;
		document.documentElement.dataset.scheme = scheme;
		// Set --dt-* vars on <html> to simulate the host page's design system.
		// Also expose --accent so Calendar's auto-probe can discover the brand color.
		document.documentElement.style.cssText = `${dt.vars}; --accent: ${dt.accent}; color-scheme: ${scheme};`;
		document.body.style.background = dt.stageBg;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<header class="site-hd">
	<a class="site-logo" href="/">svelte-calendar</a>

	<nav class="site-nav">
		<a class="site-link" class:site-link--active={path === '/'} href="/">Demo</a>
		<a class="site-link" class:site-link--active={path === '/docs'} href="/docs">Docs</a>
	</nav>

	<div class="theme-pills">
		{#each demoThemeNames as name (name)}
			{@const dt = demoThemes[name]}
			<button
				class="theme-dot"
				class:active={themeStore.current === name}
				title={dt.label}
				aria-label={"Theme: " + dt.label}
				aria-pressed={themeStore.current === name}
				style="--dot: {dt.accent}"
				onclick={() => setTheme(name)}
			></button>
		{/each}
	</div>

	<a class="site-gh" href="https://github.com/nomideusz/svelte-calendar" target="_blank" rel="noopener">
		<svg viewBox="0 0 16 16" fill="currentColor" width="15" height="15" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.62 7.62 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
		<span>GitHub</span>
	</a>
</header>

{@render children()}

<style>
	:global(body) {
		margin: 0;
		background: #08080c;
		color: rgba(220, 225, 235, 0.85);
		font-family: 'Outfit', system-ui, -apple-system, sans-serif;
		-webkit-font-smoothing: antialiased;
		transition: background 300ms ease;
	}

	:global(a) {
		color: inherit;
		text-decoration: none;
	}

	/* ─── Site header ────────────────────────────────── */
	.site-hd {
		display: flex;
		align-items: center;
		gap: 16px;
		max-width: 1100px;
		margin: 0 auto;
		padding: 16px 24px;
	}

	.site-logo {
		font: 600 15px/1 'Outfit', system-ui, sans-serif;
		color: rgba(226, 232, 240, 0.92);
		letter-spacing: -0.01em;
		margin-right: auto;
	}

	.site-nav {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.site-link {
		padding: 5px 12px;
		border-radius: 6px;
		font: 500 11.5px/1 'Outfit', system-ui, sans-serif;
		color: rgba(148, 163, 184, 0.55);
		text-decoration: none;
		transition: color 120ms, background 120ms;
	}
	.site-link:hover {
		color: rgba(226, 232, 240, 0.85);
		background: rgba(148, 163, 184, 0.06);
	}
	.site-link--active {
		color: rgba(226, 232, 240, 0.88);
	}

	.site-gh {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid rgba(148, 163, 184, 0.1);
		background: rgba(148, 163, 184, 0.04);
		font: 500 11px/1 'Outfit', system-ui, sans-serif;
		color: rgba(148, 163, 184, 0.5);
		text-decoration: none;
		transition: color 120ms, border-color 120ms;
	}
	.site-gh:hover {
		color: rgba(226, 232, 240, 0.85);
		border-color: rgba(148, 163, 184, 0.2);
	}
	.site-gh svg { opacity: 0.65; }

	/* ─── Theme pills ───────────────────────────────── */
	.theme-pills {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.theme-dot {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		border: none;
		padding: 0;
		background: var(--dot);
		cursor: pointer;
		outline: 2px solid transparent;
		outline-offset: 2px;
		transition: outline-color 150ms, transform 150ms;
		opacity: 0.55;
	}
	.theme-dot:hover {
		opacity: 1;
		transform: scale(1.2);
	}
	.theme-dot.active {
		opacity: 1;
		outline-color: var(--dot);
	}

	/* ─── Mobile layout ─────────────────────────────── */
	@media (max-width: 600px) {
		.site-hd {
			padding: 12px 16px;
			gap: 10px;
		}
		.site-logo {
			font-size: 14px;
		}
		.site-link {
			padding: 8px 12px;
			font-size: 12px;
		}
		.site-gh span {
			display: none;
		}
		.site-gh {
			padding: 6px 8px;
		}
	}

	/* ─── Light scheme overrides ─────────────────────── */
	:global([data-scheme="light"] body) {
		background: #ffffff;
		color: rgba(0, 0, 0, 0.8);
	}
	:global([data-scheme="light"]) .site-logo {
		color: rgba(0, 0, 0, 0.85);
	}
	:global([data-scheme="light"]) .site-link {
		color: rgba(0, 0, 0, 0.4);
	}
	:global([data-scheme="light"]) .site-link:hover {
		color: rgba(0, 0, 0, 0.75);
		background: rgba(0, 0, 0, 0.04);
	}
	:global([data-scheme="light"]) .site-link--active {
		color: rgba(0, 0, 0, 0.8);
	}
	:global([data-scheme="light"]) .site-gh {
		color: rgba(0, 0, 0, 0.45);
		border-color: rgba(0, 0, 0, 0.1);
		background: rgba(0, 0, 0, 0.03);
	}
	:global([data-scheme="light"]) .site-gh:hover {
		color: rgba(0, 0, 0, 0.75);
		border-color: rgba(0, 0, 0, 0.18);
	}
</style>
