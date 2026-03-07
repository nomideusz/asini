import { error } from '@sveltejs/kit';
import { getListingsByCity, getUniqueCities } from '$lib/server/db/queries';

export async function load({ params }) {
  const requestedCity = params.city;
  const allCities = await getUniqueCities();
  const exactCityName = allCities.find(c => c.toLowerCase() === requestedCity.toLowerCase());

  if (!exactCityName) {
    throw error(404, 'Nie znaleziono takiego miasta w naszej bazie.');
  }

  const cityListing = await getListingsByCity(exactCityName);

  return {
    city: exactCityName,
    schools: cityListing
  };
}
