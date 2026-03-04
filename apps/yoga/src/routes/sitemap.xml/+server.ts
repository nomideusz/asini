import { getAllListings, getUniqueCities, getUniqueStyles } from '$lib/server/db/queries';
import type { RequestHandler } from './$types';

const BASE = 'https://szkolyjogi.pl';

function escapeXml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urlEntry(loc: string, changefreq: string, priority: string, lastmod?: string | null): string {
	let entry = `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>`;
	if (lastmod) {
		entry += `\n    <lastmod>${lastmod.split('T')[0]}</lastmod>`;
	}
	entry += '\n  </url>';
	return entry;
}

export const GET: RequestHandler = async () => {
	const [listings, cities, styles] = await Promise.all([
		getAllListings(),
		getUniqueCities(),
		getUniqueStyles(),
	]);

	const urls: string[] = [];

	// Static pages
	urls.push(urlEntry(BASE, 'weekly', '1.0'));
	urls.push(urlEntry(`${BASE}/about`, 'monthly', '0.5'));
	urls.push(urlEntry(`${BASE}/post`, 'monthly', '0.5'));
	urls.push(urlEntry(`${BASE}/terms`, 'monthly', '0.3'));

	// Listing pages
	for (const listing of listings) {
		urls.push(urlEntry(`${BASE}/listing/${listing.id}`, 'weekly', '0.8', listing.lastUpdated));
	}

	// City pages
	for (const city of cities) {
		urls.push(urlEntry(`${BASE}/${encodeURIComponent(city)}`, 'weekly', '0.7'));
	}

	// Category pages
	for (const style of styles) {
		const slug = style.toLowerCase().replace(/\s+/g, '-');
		urls.push(urlEntry(`${BASE}/category/${encodeURIComponent(slug)}`, 'weekly', '0.6'));
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600',
		},
	});
};
