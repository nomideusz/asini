import { getAllListings, getUniqueCities, getUniqueStyles, getCityCoords } from '$lib/server/db/queries';

export async function load() {
  const [listings, cities, styles, cityCoords] = await Promise.all([
    getAllListings(),
    getUniqueCities(),
    getUniqueStyles(),
    getCityCoords(),
  ]);

  return { listings, cities, styles, cityCoords };
}
