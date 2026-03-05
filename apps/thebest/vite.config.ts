import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// @ts-ignore — pnpm resolves two vite copies with different peer contexts
	plugins: [tailwindcss(), sveltekit()]
});
