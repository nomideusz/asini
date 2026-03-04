/**
 * Vite config for building the standalone widget bundle.
 *
 * Produces a single IIFE file (widget.js) that registers <day-calendar>
 * as a custom element. No framework dependencies needed on the host page.
 *
 * Usage: pnpm run build:widget
 */
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [
		svelte(),
	],
	build: {
		lib: {
			entry: 'src/lib/widget/widget.ts',
			name: 'DayCalendar',
			formats: ['iife'],
			fileName: () => 'widget.js',
		},
		outDir: 'widget',
		emptyOutDir: true,
		minify: 'esbuild',
		rollupOptions: {
			output: {
				inlineDynamicImports: true,
			},
		},
	},
});
