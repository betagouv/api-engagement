//https://api.gouv.fr/documentation/api_carto_codes_postaux

import { DEPARTMENTS } from "../../../constants/departments";

import { captureException } from "../../../error";
import { getAddressCsv } from "../../../services/data-gouv/api";
import { GeolocStatus, Mission, Publisher } from "../../../types";

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

export const enrichWithGeoloc = async (publisher: Publisher, missions: Mission[]): Promise<GeolocResult[]> => {
  if (!missions.length) {
    return [];
  }
  try {
    console.log(`[${publisher.name}] Enriching with geoloc ${missions.length} missions...`);
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
      const results = await getAddressCsv(csvString);
      if (!results) {
        console.log(`[${publisher.name}] No results from api-adresse for remaining addresses`);
        return updates;
      }

      const lines = results.split("\n").filter((line: string) => line.trim());
      const data = lines.map((line: string) => line.split(","));
      const header = data.shift();
      if (!header) {
        throw new Error("No header in api-adresse results");
      }
      const headerIndex: Record<string, number> = {};
      header.forEach((h: string, i: number) => (headerIndex[h] = i));

      let found = 0;
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
          found++;
        }

        if (obj.location && obj.location.lon && obj.location.lat) {
          obj.geoPoint = {
            type: "Point",
            coordinates: [obj.location.lon, obj.location.lat],
          };
        } else {
          obj.geoPoint = null;
        }

        updates.push(obj);
      }
      console.log(`[${publisher.name}] Geoloc found for ${found} addresses`);
    }

    return updates;
  } catch (error) {
    captureException(error, `[${publisher.name}] Failure during geoloc enrichment`);
    return missions.flatMap((m) =>
      m.addresses.map((_, index) => ({
        clientId: m.clientId,
        addressIndex: index,
        geolocStatus: "FAILED",
      }))
    ) as GeolocResult[];
  }
};
