export type GeoSuggestion = { label: string; lat: number; lon: number; country_code?: string };

type AddressFeature = {
  properties: { label: string; name: string; postcode: string; type: string; id: string };
  geometry: { coordinates: [number, number] };
};

export async function searchAddress(query: string): Promise<GeoSuggestion[]> {
  const res = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(query)}&autocomplete=1&limit=6`);
  const data: { features?: AddressFeature[] } = await res.json();
  if (!data.features) return [];
  return data.features.map((f) => ({
    // Villes : on garde "Nom (code postal)" pour lever l'ambiguïté entre homonymes.
    // Adresses/rues : on utilise le `label` complet fourni par l'API.
    label: f.properties.type === "municipality" ? `${f.properties.name} (${f.properties.postcode})` : f.properties.label,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    country_code: "fr",
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoSuggestion | null> {
  const res = await fetch(`https://data.geopf.fr/geocodage/reverse?lon=${lon}&lat=${lat}&limit=1`);
  const data: { features?: AddressFeature[] } = await res.json();
  if (!data.features?.length) return null;
  const f = data.features[0];
  return {
    label: f.properties.label ?? f.properties.name,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    country_code: "fr",
  };
}
