export const EARTH_RADIUS = 6371; // Radius of the Earth in kilometers

/**
 * Get the distance in kilometers from a string
 *
 * @param value The string to parse
 * @returns The distance in kilometers
 */
export const getDistanceKm = (value: string): number => {
  const distance = parseInt(value, 10);

  if (isNaN(distance)) {
    return 50;
  }

  if (value.endsWith("m") && !value.endsWith("km")) {
    return distance / 1000;
  }

  return distance;
};

/**
 * Calculate the distance between two points in kilometers
 *
 * @param lat1 The latitude of the first point
 * @param lon1 The longitude of the first point
 * @param lat2 The latitude of the second point
 * @param lon2 The longitude of the second point
 * @returns The distance between the two points in kilometers
 */
export const getDistanceFromLatLonInKm = (lat1?: number, lon1?: number, lat2?: number, lon2?: number): number | undefined => {
  const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);

  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return undefined;
  }
  const r = EARTH_RADIUS; // Radius of the Earth in kilometers
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c; // Distance in kilometers
};

export const calculateBoundingBox = (lat: number, lon: number, distanceKm: number) => {
  const latDelta = distanceKm / 111.32; // 1 degree of latitude is approximately 111.32 km
  const lonDelta = distanceKm / (111.32 * Math.cos((lat * Math.PI) / 180));

  return {
    latMin: lat - latDelta,
    latMax: lat + latDelta,
    lonMin: lon - lonDelta,
    lonMax: lon + lonDelta,
  };
};
