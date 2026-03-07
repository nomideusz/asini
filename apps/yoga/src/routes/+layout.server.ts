import { getAllListings, getUniqueCities, getUniqueStyles, getCityCoords } from '$lib/server/db/queries';
import { env } from '$env/dynamic/private';

export async function load() {
  const [listings, cities, styles, cityCoords] = await Promise.all([
    getAllListings(),
    getUniqueCities(),
    getUniqueStyles(),
    getCityCoords(),
  ]);

  return { listings, cities, styles, cityCoords, googleMapsApiKey: env.GOOGLE_MAPS_API_KEY ?? '' };
}
