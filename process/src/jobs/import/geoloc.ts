//https://api.gouv.fr/documentation/api_carto_codes_postaux

import { DEPARTMENTS } from "../../constants/departments";

import apiAdresse from "../../services/api-adresse";
import { captureException } from "../../error";
import { Mission, Publisher } from "../../types";

export interface GeolocResult {
  clientId: string;
  addressIndex: number;
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
    const csv = ["clientid;addressindex;address;city;postcode;departmentcode"];

    missions.forEach((mission) => {
      mission.addresses.forEach((addressItem, addressIndex) => {
        // if lat lon is given --> set to enriched by publisher
        if (addressItem.location && addressItem.location.lat && addressItem.location.lon) {
          addressItem.geolocStatus = "ENRICHED_BY_PUBLISHER";
        } else {
          // if no lat lon then call api adresse
          const clientId = `${mission.clientId}_${addressIndex}`;
          const address = (addressItem.address || "").replace(/[^a-zA-Z0-9]/g, " ") || "";
          const city = (addressItem.city || "").replace(/[^a-zA-Z0-9]/g, " ") || "";
          const postcode = addressItem.postalCode || "";
          const departmentCode = addressItem.departmentCode || "";
          csv.push(`${clientId};${addressIndex};${address};${city};${postcode};${departmentCode}`);
        }
      });
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
      const clientId = line[headerIndex.clientid];
      const addressIndex = line[headerIndex.addressindex];
      const mission = missions.find((m) => m.clientId.toString() === clientId);

      if (!mission) continue;

      const obj = {
        clientId: mission.clientId,
        addressIndex: Number(addressIndex),
        geolocStatus: "NOT_FOUND",
        geoPoint: null,
      } as GeolocResult;

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
        obj.geolocStatus = "ENRICHED";
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
    return missions.flatMap((m) =>
      m.addresses.map((_, index) => ({
        clientId: m.clientId,
        addressIndex: index,
        geolocStatus: "FAILED",
      })),
    ) as GeolocResult[];
  }
};
