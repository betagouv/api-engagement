const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export type LocationTransformerResult = {
  geo: {
    lat: number;
    lon: number;
    radiusKm?: number;
    countryCode?: string;
  };
};

export const resolveLocationValues = (params: unknown): LocationTransformerResult => {
  if (!isRecord(params)) {
    throw new Error("location params must be an object");
  }

  const lat = params.lat;
  const lon = params.lon;
  const radiusKm = params.radius_km;
  const countryCode = params.country_code;

  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    throw new Error("location.lat must be a number between -90 and 90");
  }

  if (typeof lon !== "number" || lon < -180 || lon > 180) {
    throw new Error("location.lon must be a number between -180 and 180");
  }

  if (radiusKm !== undefined && (typeof radiusKm !== "number" || radiusKm <= 0)) {
    throw new Error("location.radius_km must be a positive number");
  }

  if (countryCode !== undefined && (typeof countryCode !== "string" || !/^[a-zA-Z]{2}$/.test(countryCode))) {
    throw new Error("location.country_code must be a two-letter country code");
  }

  return {
    geo: {
      lat,
      lon,
      ...(radiusKm === undefined ? {} : { radiusKm }),
      ...(countryCode === undefined ? {} : { countryCode: countryCode.toUpperCase() }),
    },
  };
};
