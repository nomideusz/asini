import { readFileSync } from 'fs';
import { resolve } from 'path';
import { marked } from 'marked';

export const prerender = true;

export async function load() {
	const md = readFileSync(resolve('README.md'), 'utf-8');
	const html = await marked(md, { gfm: true });

	// Extract TOC from h2 headings
	const toc: { id: string; label: string }[] = [];
	const h2Re = /<h2[^>]*id="([^"]*)"[^>]*>(.*?)<\/h2>/gi;
	let match;
	while ((match = h2Re.exec(html)) !== null) {
		toc.push({ id: match[1], label: match[2].replace(/<[^>]+>/g, '') });
	}

	return { html, toc };
}
