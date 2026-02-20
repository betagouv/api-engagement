import { ServerSideContext } from "@/types";

/**
 * Calculate the distance between two points using the Haversine formula
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (value: number): number => (value * Math.PI) / 180;

  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if the widget is the prevention routieres widget
 */
export const isPreventionRoutieres = (widgetId: string | null): boolean => {
  if (!widgetId) {
    return false;
  }
  if (widgetId === "6449707ff9d59c624d4dc666") {
    return true;
  }
  return false;
};

/**
 * Get the domain from the request headers
 * Split the host by the port if present
 */
export const getDomain = (ctx: ServerSideContext): string => {
  const host = ctx.req?.headers?.host || "";
  return host.split(":")[0];
};
