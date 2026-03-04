<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>svelte-calendar – Docs</title>
</svelte:head>

<main class="doc-content">
	{@html data.html}
</main>

<style>
	/* ─── Main content ───────────────────────────────── */
	.doc-content {
		flex: 1;
		min-width: 0;
		max-width: 1100px;
		margin: 0 auto;
		padding: 48px 24px 96px;
		color: rgba(226, 232, 240, 0.82);
		line-height: 1.7;
	}

	/* ── Typography ── */
	.doc-content :global(h1) {
		font: 700 28px/1.2 'Outfit', system-ui, sans-serif;
		color: rgba(226, 232, 240, 0.95);
		margin: 0 0 8px;
	}

	.doc-content :global(h2) {
		font: 600 20px/1.3 'Outfit', system-ui, sans-serif;
		color: rgba(226, 232, 240, 0.92);
		margin: 48px 0 16px;
		padding-bottom: 8px;
		border-bottom: 1px solid rgba(148, 163, 184, 0.07);
	}

	.doc-content :global(h3) {
		font: 600 15px/1.3 'Outfit', system-ui, sans-serif;
		color: rgba(226, 232, 240, 0.88);
		margin: 32px 0 12px;
	}

	.doc-content :global(p) {
		font-size: 14px;
		margin: 0 0 16px;
	}

	.doc-content :global(> p:first-of-type) {
		font-size: 15px;
		color: rgba(148, 163, 184, 0.7);
		margin-bottom: 32px;
	}

	.doc-content :global(blockquote) {
		margin: 0 0 16px;
		padding: 10px 16px;
		border-left: 3px solid rgba(239, 68, 68, 0.4);
		background: rgba(239, 68, 68, 0.04);
		border-radius: 0 6px 6px 0;
		font-size: 13px;
		color: rgba(226, 232, 240, 0.7);
	}
	.doc-content :global(blockquote p) {
		margin: 0;
	}

	/* ── Code blocks ── */
	.doc-content :global(pre) {
		background: #0d1017;
		border: 1px solid rgba(148, 163, 184, 0.06);
		border-radius: 8px;
		padding: 16px 20px;
		overflow-x: auto;
		margin: 0 0 20px;
		font: 400 13px/1.55 ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
		color: rgba(226, 232, 240, 0.78);
		scrollbar-width: thin;
		scrollbar-color: rgba(148, 163, 184, 0.1) transparent;
	}

	.doc-content :global(code) {
		font: 400 12.5px/1 ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
		background: rgba(148, 163, 184, 0.08);
		padding: 2px 6px;
		border-radius: 4px;
		color: rgba(226, 232, 240, 0.85);
	}

	.doc-content :global(pre code) {
		background: none;
		padding: 0;
		border-radius: 0;
		font-size: inherit;
		line-height: inherit;
	}

	/* ── Tables ── */
	.doc-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0 0 20px;
		font-size: 13px;
	}

	.doc-content :global(th) {
		text-align: left;
		padding: 8px 12px;
		font: 600 11px/1 'Outfit', system-ui, sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(148, 163, 184, 0.5);
		border-bottom: 1px solid rgba(148, 163, 184, 0.1);
	}

	.doc-content :global(td) {
		padding: 7px 12px;
		border-bottom: 1px solid rgba(148, 163, 184, 0.05);
		color: rgba(226, 232, 240, 0.72);
		vertical-align: top;
	}

	.doc-content :global(td code) {
		font-size: 12px;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.08);
	}

	.doc-content :global(tr:hover td) {
		background: rgba(148, 163, 184, 0.03);
	}

	/* ── Lists ── */
	.doc-content :global(ul),
	.doc-content :global(ol) {
		padding-left: 20px;
		margin: 0 0 16px;
	}

	.doc-content :global(li) {
		font-size: 14px;
		margin-bottom: 4px;
	}

	/* ── Links ── */
	.doc-content :global(a) {
		color: #ef4444;
		text-decoration: none;
		border-bottom: 1px solid rgba(239, 68, 68, 0.2);
		transition: border-color 120ms;
	}
	.doc-content :global(a:hover) {
		border-color: #ef4444;
	}

	/* ── Details ── */
	.doc-content :global(details) {
		margin: 0 0 20px;
		border: 1px solid rgba(148, 163, 184, 0.07);
		border-radius: 8px;
		overflow: hidden;
	}
	.doc-content :global(summary) {
		padding: 10px 16px;
		cursor: pointer;
		font: 500 13px/1 'Outfit', system-ui, sans-serif;
		color: rgba(226, 232, 240, 0.8);
		background: rgba(148, 163, 184, 0.03);
	}
	.doc-content :global(details[open] summary) {
		border-bottom: 1px solid rgba(148, 163, 184, 0.07);
	}
	.doc-content :global(details > :not(summary)) {
		padding: 0 16px;
	}
	.doc-content :global(details > table) {
		padding: 0;
		margin: 12px 16px;
		width: calc(100% - 32px);
	}

	/* ── Horizontal rule ── */
	.doc-content :global(hr) {
		border: none;
		border-top: 1px solid rgba(148, 163, 184, 0.07);
		margin: 32px 0;
	}

	/* ── Strong / em ── */
	.doc-content :global(strong) {
		font-weight: 600;
		color: rgba(226, 232, 240, 0.92);
	}

	/* ─── Responsive ─────────────────────────────────── */
	@media (max-width: 768px) {
		.doc-content {
			padding: 24px 16px 64px;
		}
		.doc-content :global(h1) {
			font-size: 22px;
		}
		.doc-content :global(h2) {
			font-size: 17px;
			margin-top: 32px;
		}
		.doc-content :global(pre) {
			padding: 12px 14px;
			font-size: 12px;
			border-radius: 6px;
		}
		/* Prevent tables from breaking layout */
		.doc-content :global(table) {
			display: block;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}
		.doc-content :global(th),
		.doc-content :global(td) {
			padding: 6px 8px;
			white-space: nowrap;
		}
		.doc-content :global(details > table) {
			margin: 8px 12px;
			width: calc(100% - 24px);
		}
	}

	/* ─── Light scheme overrides ────────────────────── */
	:global([data-scheme="light"]) .doc-content {
		color: rgba(0, 0, 0, 0.72);
	}
	:global([data-scheme="light"]) .doc-content :global(h1) {
		color: rgba(0, 0, 0, 0.9);
	}
	:global([data-scheme="light"]) .doc-content :global(h2) {
		color: rgba(0, 0, 0, 0.85);
		border-bottom-color: rgba(0, 0, 0, 0.08);
	}
	:global([data-scheme="light"]) .doc-content :global(h3) {
		color: rgba(0, 0, 0, 0.8);
	}
	:global([data-scheme="light"]) .doc-content :global(> p:first-of-type) {
		color: rgba(0, 0, 0, 0.5);
	}
	:global([data-scheme="light"]) .doc-content :global(blockquote) {
		border-left-color: rgba(37, 99, 235, 0.4);
		background: rgba(37, 99, 235, 0.04);
		color: rgba(0, 0, 0, 0.6);
	}
	:global([data-scheme="light"]) .doc-content :global(pre) {
		background: #f8f9fa;
		border-color: rgba(0, 0, 0, 0.08);
		color: rgba(0, 0, 0, 0.72);
		scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
	}
	:global([data-scheme="light"]) .doc-content :global(code) {
		background: rgba(0, 0, 0, 0.05);
		color: rgba(0, 0, 0, 0.78);
	}
	:global([data-scheme="light"]) .doc-content :global(pre code) {
		background: none;
	}
	:global([data-scheme="light"]) .doc-content :global(th) {
		color: rgba(0, 0, 0, 0.45);
		border-bottom-color: rgba(0, 0, 0, 0.1);
	}
	:global([data-scheme="light"]) .doc-content :global(td) {
		border-bottom-color: rgba(0, 0, 0, 0.05);
		color: rgba(0, 0, 0, 0.65);
	}
	:global([data-scheme="light"]) .doc-content :global(td code) {
		color: #2563eb;
		background: rgba(37, 99, 235, 0.07);
	}
	:global([data-scheme="light"]) .doc-content :global(tr:hover td) {
		background: rgba(0, 0, 0, 0.02);
	}
	:global([data-scheme="light"]) .doc-content :global(a) {
		color: #2563eb;
		border-bottom-color: rgba(37, 99, 235, 0.2);
	}
	:global([data-scheme="light"]) .doc-content :global(a:hover) {
		border-color: #2563eb;
	}
	:global([data-scheme="light"]) .doc-content :global(details) {
		border-color: rgba(0, 0, 0, 0.08);
	}
	:global([data-scheme="light"]) .doc-content :global(summary) {
		color: rgba(0, 0, 0, 0.75);
		background: rgba(0, 0, 0, 0.02);
	}
	:global([data-scheme="light"]) .doc-content :global(details[open] summary) {
		border-bottom-color: rgba(0, 0, 0, 0.08);
	}
	:global([data-scheme="light"]) .doc-content :global(hr) {
		border-top-color: rgba(0, 0, 0, 0.08);
	}
	:global([data-scheme="light"]) .doc-content :global(strong) {
		color: rgba(0, 0, 0, 0.87);
	}
</style>
