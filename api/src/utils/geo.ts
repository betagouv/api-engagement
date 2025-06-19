export const EARTH_RADIUS = 6371; // Radius of the Earth in kilometers

export const getDistanceKm = (value: string) => {
  const distance = parseInt(value);
  if (value.endsWith("km") || !value.endsWith("m")) {
    return distance;
  }
  return distance ? distance / 1000 : 50;
};

export const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);
export const getDistanceFromLatLonInKm = (lat1?: number, lon1?: number, lat2?: number, lon2?: number) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return undefined;
  }
  const r = EARTH_RADIUS; // Radius of the Earth in kilometers
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c; // Distance in kilometers
};
