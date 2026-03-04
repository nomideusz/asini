import { getListingsByStyle } from '$lib/server/db/queries';

export async function load({ params }) {
  const slug = params.slug;
  // Convert URL slug back to style name (e.g. "power-yoga" → "power yoga")
  const styleName = slug.replace(/-/g, ' ');
  const listings = await getListingsByStyle(styleName);

  return {
    slug,
    styleName,
    listings,
  };
}
