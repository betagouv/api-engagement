import { hashString } from "~/utils/string";

export type GeoPosition = [number, number];

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Spirale déterministe serrée (~0,2 à 0,7 km) : rester près du centre limite le risque de tomber dans l'eau (côtes, lacs).
export function getNearbyPosition(center: GeoPosition, seed: string, index: number): GeoPosition {
  const angle = (hashString(seed) % 360) * (Math.PI / 180) + index * GOLDEN_ANGLE;
  const radiusKm = 0.2 * Math.sqrt(index + 1);
  const latDelta = (Math.cos(angle) * radiusKm) / 111;
  const lonDelta = (Math.sin(angle) * radiusKm) / (111 * Math.max(Math.cos((center[0] * Math.PI) / 180), 0.1));

  return [center[0] + latDelta, center[1] + lonDelta];
}
