import { DEPARTMENTS } from "@/constants/departments";
import { captureException } from "@/error";
import geopfService from "@/services/geopf";
import { GeolocStatus } from "@/types";

export interface GeolocMissionInput {
  clientId: string;
  addresses: Array<{
    street?: string | null;
    city?: string | null;
    postalCode?: string | null;
    departmentCode?: string | null;
    geolocStatus?: string | null;
  }>;
}

export interface GeolocResult {
  clientId: string;
  addressIndex: number;
  street: string | undefined;
  city: string | undefined;
  postalCode: string | undefined;
  departmentCode: string | undefined;
  departmentName: string | undefined;
  region: string | undefined;
  location:
    | {
        lat: number;
        lon: number;
      }
    | undefined;
  geoPoint: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  geolocStatus: GeolocStatus;
}

const parseGeopfResults = (results: string, missions: GeolocMissionInput[]): GeolocResult[] => {
  const lines = results.split("\n").filter((line: string) => line.trim());
  const data = lines.map((line: string) => line.split(","));
  const header = data.shift();
  if (!header) {
    throw new Error("No header in geopf results");
  }
  const headerIndex: Record<string, number> = {};
  header.forEach((h: string, i: number) => (headerIndex[h] = i));

  const parsed: GeolocResult[] = [];
  for (let i = 0; i < data.length; i++) {
    const line = data[i];
    const clientId = line[headerIndex.clientid]?.trim();
    const addressIndex = parseInt(line[headerIndex.addressindex], 10);
    const mission = missions.find((m) => m.clientId.toString() === clientId);
    if (!mission) {
      continue;
    }

    const obj: GeolocResult = {
      clientId: mission.clientId,
      addressIndex,
      geolocStatus: "NOT_FOUND",
      geoPoint: null,
      street: undefined,
      city: undefined,
      postalCode: undefined,
      departmentCode: undefined,
      departmentName: undefined,
      region: undefined,
      location: undefined,
    };

    if (parseFloat(line[headerIndex.result_score]) > 0.4) {
      if (line[headerIndex.result_name]) {
        obj.street = line[headerIndex.result_name];
      }
      if (line[headerIndex.result_postcode]) {
        obj.postalCode = line[headerIndex.result_postcode];
      }
      if (line[headerIndex.result_city]) {
        obj.city = line[headerIndex.result_city];
      }
      if (line[headerIndex.latitude]) {
        obj.location = {
          lat: Number(line[headerIndex.latitude]),
          lon: Number(line[headerIndex.longitude]),
        };
      }
      if (line[headerIndex.result_context]) {
        const context = line[headerIndex.result_context].split(",").map((val: string) => val.replace(/^"|"$/g, "").trim());
        obj.departmentCode = context[0];

        if (DEPARTMENTS[obj.departmentCode as string]) {
          [obj.departmentName, obj.region] = DEPARTMENTS[obj.departmentCode as string];
        } else {
          console.log(`No department info found for code: ${obj.departmentCode}`);
          obj.departmentName = obj.departmentCode;
        }
      }
      obj.geolocStatus = "ENRICHED_BY_API";
    }

    if (obj.location && obj.location.lon && obj.location.lat) {
      obj.geoPoint = {
        type: "Point",
        coordinates: [obj.location.lon, obj.location.lat],
      };
    } else {
      obj.geoPoint = null;
    }

    parsed.push(obj);
  }
  return parsed;
};

export const enrichWithGeoloc = async (label: string, missions: GeolocMissionInput[]): Promise<GeolocResult[]> => {
  if (!missions.length) {
    return [];
  }
  try {
    console.log(`[${label}] Enriching with geoloc ${missions.length} missions...`);
    const csv = ["clientid,addressindex,address,city,postcode,departmentcode"];
    const updates: GeolocResult[] = [];

    missions.forEach((mission) => {
      (mission.addresses || []).forEach((addressItem, addressIndex) => {
        if (addressItem.geolocStatus === "ENRICHED_BY_PUBLISHER" || addressItem.geolocStatus === "ENRICHED_BY_API") {
          return;
        }
        const clientId = mission.clientId;
        const street = (addressItem.street || "").replace(/[^a-zA-Z0-9]/g, " ") || "";
        const city = (addressItem.city || "").replace(/[^a-zA-Z0-9]/g, " ") || "";
        const postcode = addressItem.postalCode || "";
        const departmentCode = addressItem.departmentCode || "";
        csv.push(`${clientId},${addressIndex},${street},${city},${postcode},${departmentCode}`);
      });
    });

    if (csv.length > 1) {
      const csvString = csv.join("\n");
      const results = await geopfService.searchAddressesCsv(csvString);
      if (!results) {
        console.log(`[${label}] No results from geopf for remaining addresses`);
        return updates;
      }

      const parsed = parseGeopfResults(results, missions);
      updates.push(...parsed);
      const found = parsed.filter((r) => r.geolocStatus === "ENRICHED_BY_API").length;
      console.log(`[${label}] Geoloc found for ${found} addresses`);
    }

    // Second pass: city-level fallback for NOT_FOUND addresses that have city/postalCode
    const notFoundKeys = new Set(updates.filter((r) => r.geolocStatus === "NOT_FOUND").map((r) => `${r.clientId}:${r.addressIndex}`));

    if (notFoundKeys.size > 0) {
      const retryCsv = ["clientid,addressindex,address,city,postcode,departmentcode"];
      missions.forEach((mission) => {
        (mission.addresses || []).forEach((addressItem, addressIndex) => {
          if (!notFoundKeys.has(`${mission.clientId}:${addressIndex}`)) {
            return;
          }
          const city = (addressItem.city || "").replace(/[^a-zA-Z0-9]/g, " ").trim();
          const postcode = addressItem.postalCode || "";
          const departmentCode = addressItem.departmentCode || "";
          if (!city && !postcode) {
            return;
          }
          retryCsv.push(`${mission.clientId},${addressIndex},,${city},${postcode},${departmentCode}`);
        });
      });

      if (retryCsv.length > 1) {
        try {
          const retryResults = await geopfService.searchAddressesCsv(retryCsv.join("\n"));
          if (retryResults) {
            const retryParsed = parseGeopfResults(retryResults, missions);
            let retryFound = 0;
            for (const retryResult of retryParsed) {
              if (retryResult.geolocStatus !== "ENRICHED_BY_API") {
                continue;
              }
              const existing = updates.find((r) => r.clientId === retryResult.clientId && r.addressIndex === retryResult.addressIndex);
              if (existing) {
                // City-level geocode: update coordinates and location fields but keep street undefined
                existing.city = retryResult.city;
                existing.postalCode = retryResult.postalCode;
                existing.departmentCode = retryResult.departmentCode;
                existing.departmentName = retryResult.departmentName;
                existing.region = retryResult.region;
                existing.location = retryResult.location;
                existing.geoPoint = retryResult.geoPoint;
                existing.geolocStatus = "ENRICHED_BY_API";
                retryFound++;
              }
            }
            console.log(`[${label}] Geoloc city fallback found for ${retryFound} addresses`);
          }
        } catch (retryError) {
          captureException(retryError, `[${label}] Failure during city-level fallback geoloc enrichment`);
          // Do not rethrow: first-pass results already in `updates` are preserved
        }
      }
    }

    return updates;
  } catch (error) {
    captureException(error, `[${label}] Failure during geoloc enrichment`);
    return missions.flatMap((m) =>
      m.addresses.map((_, index) => ({
        clientId: m.clientId,
        addressIndex: index,
        geolocStatus: "FAILED",
      }))
    ) as GeolocResult[];
  }
};
