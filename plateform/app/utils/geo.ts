import { hashString } from "~/utils/string";

export type GeoPosition = [number, number];

export function getNearbyPosition(center: GeoPosition, seed: string, index: number): GeoPosition {
  const hash = hashString(`${seed}-${index}`);
  const angle = ((hash % 360) * Math.PI) / 180;
  const radiusKm = 0.8 + ((hash >>> 8) % 25) / 10;
  const latDelta = (Math.cos(angle) * radiusKm) / 111;
  const lonDelta = (Math.sin(angle) * radiusKm) / (111 * Math.max(Math.cos((center[0] * Math.PI) / 180), 0.1));

  return [center[0] + latDelta, center[1] + lonDelta];
}
