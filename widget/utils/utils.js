/**
 * Calculate the distance between two points using the Haversine formula
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;

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
export const isPreventionRoutieres = (query) => {
  if (query === "6449707ff9d59c624d4dc666") {
    return true;
  }
  const slug = query
    .replace(/%C3%A9/g, "-")
    .replace(/%C3%A8/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");

  return slug === "widget-pr-vention-routi-re";
};

/**
 * Get the domain from the request headers
 * Split the host by the port if present
 */
export const getDomain = (ctx) => {
  const host = ctx.req ? ctx.req.headers.host : "";
  return host.split(":")[0];
};
