import { Location } from "../types";

export const fetchLocation = async (lat: number, lon: number): Promise<Location | null> => {
  try {
    const url = `https://data.geopf.fr/geocodage/reverse?lon=${lon}&lat=${lat}&limit=1`;
    const result = await fetch(url).then((response) => response.json());
    if (result.features?.length) {
      const feature = result.features[0];
      return {
        label: `${feature.properties.city} (${feature.properties.postcode})`,
        value: feature.properties.id,
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        city: feature.properties.city,
        postcode: feature.properties.postcode,
      };
    }
    return null;
  } catch (e) {
    console.error("Error fetching location:", e);
    return null;
  }
};
