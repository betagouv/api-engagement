//https://api.gouv.fr/documentation/api_carto_codes_postaux

import { DEPARTMENTS } from "../../constants/departments";

import apiAdresse from "../../services/api-adresse";
import { captureException } from "../../error";
import { Mission, Publisher } from "../../types";

export interface GeolocResult {
  clientId: string;
  address: string | undefined;
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
  geolocStatus: "NOT_FOUND" | "FAILED" | "ENRICHED_BY_PUBLISHER" | "ENRICHED" | "NO_DATA" | "SHOULD_ENRICH";
}

export const enrichWithGeoloc = async (publisher: Publisher, missions: Mission[]) => {
  if (!missions.length) return [];
  try {
    console.log(`[${publisher.name}] Enriching with geoloc ${missions.length} missions...`);
    const csv = ["clientid;address;city;postcode;departmentcode"];

    missions.forEach((mission) => {
      const clientId = mission.clientId || "";
      // replace all non alphanumeric characters by space
      const address = (mission.address || "").replace(/[^a-zA-Z0-9]/g, " ") || "";
      const city = (mission.city || "").replace(/[^a-zA-Z0-9]/g, " ") || "";
      const postcode = mission.postalCode || "";
      const departmentCode = mission.departmentCode || "";
      csv.push(`${clientId};${address};${city};${postcode};${departmentCode}`);
    });

    const csvString = csv.join("\n");

    const results = await apiAdresse.csv(csvString);
    if (!results) throw new Error("No results from api-adresse");

    const lines = results.split("\n");
    const data = lines.map((line) => line.split(";"));
    const header = data.shift();
    if (!header) throw new Error("No header in api-adresse results");
    const headerIndex = {} as Record<string, number>;
    header.forEach((h, i) => (headerIndex[h] = i));

    const updates = [] as GeolocResult[];
    let found = 0;
    for (let i = 0; i < data.length; i++) {
      const line = data[i];
      const mission = missions.find((m) => m.clientId.toString() === line[headerIndex.clientid]?.toString());

      if (!mission) continue;

      const obj = { clientId: mission.clientId, geolocStatus: "NOT_FOUND", geoPoint: null } as GeolocResult;

      if (parseFloat(line[headerIndex.result_score]) > 0.4) {
        if (line[headerIndex.result_name]) obj.address = line[headerIndex.result_name];
        if (line[headerIndex.result_postcode]) obj.postalCode = line[headerIndex.result_postcode];
        if (line[headerIndex.result_city]) obj.city = line[headerIndex.result_city];
        if (line[headerIndex.latitude]) {
          obj.location = {
            lat: Number(line[headerIndex.latitude]),
            lon: Number(line[headerIndex.longitude]),
          };
        }
        if (line[headerIndex.result_context]) {
          const context = line[headerIndex.result_context].split(", ");
          obj.departmentCode = context[0].trim();
          obj.departmentName = DEPARTMENTS[context[0].trim()][0];
          obj.region = DEPARTMENTS[context[0].trim()][1];
        }
        obj.geolocStatus === "ENRICHED";
        found++;
      }

      if (obj.location) obj.geoPoint = { type: "Point", coordinates: [obj.location.lon, obj.location.lat] };
      else obj.geoPoint = null;

      updates.push(obj);
    }
    console.log(`[${publisher.name}] Geoloc found for ${found} missions`);
    return updates;
  } catch (error) {
    captureException(error, `[${publisher.name}] Failure during geoloc enrichment`);
    return missions.map((m) => ({ clientId: m.clientId, geolocStatus: "FAILED" })) as Mission[];
  }
};
