import { error } from '@sveltejs/kit';
import { getListingsByCity, getUniqueCities } from '$lib/server/db/queries';

export async function load({ params }) {
  const requestedCity = params.city;
  const validCities = (await getUniqueCities()).map(c => c.toLowerCase());

  if (!validCities.includes(requestedCity.toLowerCase())) {
    throw error(404, 'Nie znaleziono takiego miasta w naszej bazie.');
  }

  const allCities = await getUniqueCities();
  const exactCityName = allCities.find(c => c.toLowerCase() === requestedCity.toLowerCase());
  const cityListing = await getListingsByCity(requestedCity);

  return {
    city: exactCityName,
    schools: cityListing
  };
}
