import { error } from '@sveltejs/kit';
import { getListingById } from '$lib/server/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const listing = await getListingById(params.id);

  if (!listing) {
    throw error(404, 'Nie znaleziono szkoły');
  }

  return {
    listing
  };
};
