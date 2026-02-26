import { afterEach, describe, expect, it, vi } from "vitest";

import { enrichWithGeoloc } from "@/jobs/import-missions/utils/geoloc";
import geopfService from "@/services/geopf";
import { buildPublisher } from "./factories";
import type { ImportedMission } from "@/jobs/import-missions/types";
import type { MissionAddress } from "@/types/mission";

vi.mock("@/error", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/services/geopf", () => ({
  default: {
    searchAddressesCsv: vi.fn(),
  },
}));

const buildAddress = (overrides: Partial<MissionAddress> = {}): MissionAddress => ({
  street: "10 rue de la Paix",
  city: "Paris",
  postalCode: "75002",
  departmentCode: "75",
  departmentName: "Paris",
  region: "Île-de-France",
  country: "FR",
  location: null,
  geoPoint: null,
  geolocStatus: "SHOULD_ENRICH",
  ...overrides,
});

const buildImportedMission = (overrides: Partial<ImportedMission> = {}): ImportedMission =>
  ({
    clientId: "mission-1",
    addresses: [buildAddress()],
    ...overrides,
  }) as ImportedMission;

const GEOPF_CSV_HEADER =
  "clientid,addressindex,address,city,postcode,departmentcode,latitude,longitude,result_label,result_score,result_score_next,result_type,result_id,result_housenumber,result_name,result_postcode,result_city,result_context,result_citycode";

const buildGeopfResultLine = (overrides: {
  clientid?: string;
  addressindex?: string;
  address?: string;
  city?: string;
  postcode?: string;
  departmentcode?: string;
  latitude?: string;
  longitude?: string;
  result_score?: string;
  result_name?: string;
  result_postcode?: string;
  result_city?: string;
  result_context?: string;
} = {}) => {
  const defaults = {
    clientid: "mission-1",
    addressindex: "0",
    address: "10 rue de la Paix",
    city: "Paris",
    postcode: "75002",
    departmentcode: "75",
    latitude: "48.8698",
    longitude: "2.3311",
    result_label: "10 Rue de la Paix 75002 Paris",
    result_score: "0.85",
    result_score_next: "0.40",
    result_type: "housenumber",
    result_id: "75102_7240_00010",
    result_housenumber: "10",
    result_name: "10 Rue de la Paix",
    result_postcode: "75002",
    result_city: "Paris",
    result_context: '"75","Paris","Île-de-France"',
    result_citycode: "75102",
  };
  const merged = { ...defaults, ...overrides };
  return [
    merged.clientid,
    merged.addressindex,
    merged.address,
    merged.city,
    merged.postcode,
    merged.departmentcode,
    merged.latitude,
    merged.longitude,
    merged.result_label,
    merged.result_score,
    merged.result_score_next,
    merged.result_type,
    merged.result_id,
    merged.result_housenumber,
    merged.result_name,
    merged.result_postcode,
    merged.result_city,
    merged.result_context,
    merged.result_citycode,
  ].join(",");
};

describe("enrichWithGeoloc", () => {
  const publisher = buildPublisher({ name: "TestPub" });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array for empty missions", async () => {
    const results = await enrichWithGeoloc(publisher, []);
    expect(results).toEqual([]);
    expect(geopfService.searchAddressesCsv).not.toHaveBeenCalled();
  });

  it("skips addresses already enriched by publisher or API", async () => {
    const mission = buildImportedMission({
      addresses: [buildAddress({ geolocStatus: "ENRICHED_BY_PUBLISHER" })],
    });

    const results = await enrichWithGeoloc(publisher, [mission]);
    expect(results).toEqual([]);
    expect(geopfService.searchAddressesCsv).not.toHaveBeenCalled();
  });

  it("passes columns and postcode options to geopf service", async () => {
    const mission = buildImportedMission();
    vi.mocked(geopfService.searchAddressesCsv).mockResolvedValue(null);

    await enrichWithGeoloc(publisher, [mission]);

    expect(geopfService.searchAddressesCsv).toHaveBeenCalledWith(expect.any(String), {
      columns: ["address", "city", "postcode", "departmentcode"],
    });
  });

  it("enriches address when score > 0.5 and department matches", async () => {
    const mission = buildImportedMission();
    const csvResponse = [GEOPF_CSV_HEADER, buildGeopfResultLine({ result_score: "0.85" })].join("\n");
    vi.mocked(geopfService.searchAddressesCsv).mockResolvedValue(csvResponse);

    const results = await enrichWithGeoloc(publisher, [mission]);

    expect(results).toHaveLength(1);
    expect(results[0].geolocStatus).toBe("ENRICHED_BY_API");
    expect(results[0].city).toBe("Paris");
    expect(results[0].postalCode).toBe("75002");
    expect(results[0].departmentCode).toBe("75");
    expect(results[0].location).toEqual({ lat: 48.8698, lon: 2.3311 });
    expect(results[0].geoPoint).toEqual({
      type: "Point",
      coordinates: [2.3311, 48.8698],
    });
  });

  it("rejects result when score <= 0.5", async () => {
    const mission = buildImportedMission();
    const csvResponse = [GEOPF_CSV_HEADER, buildGeopfResultLine({ result_score: "0.45" })].join("\n");
    vi.mocked(geopfService.searchAddressesCsv).mockResolvedValue(csvResponse);

    const results = await enrichWithGeoloc(publisher, [mission]);

    expect(results).toHaveLength(1);
    expect(results[0].geolocStatus).toBe("NOT_FOUND");
    expect(results[0].location).toBeUndefined();
    expect(results[0].geoPoint).toBeNull();
  });

  it("rejects result when department code mismatches source", async () => {
    const mission = buildImportedMission({
      addresses: [buildAddress({ departmentCode: "31", postalCode: "31000", city: "Toulouse" })],
    });
    const csvResponse = [
      GEOPF_CSV_HEADER,
      buildGeopfResultLine({
        departmentcode: "31",
        result_score: "0.75",
        result_city: "Mulhouse",
        result_postcode: "68100",
        result_context: '"68","Haut-Rhin","Grand Est"',
      }),
    ].join("\n");
    vi.mocked(geopfService.searchAddressesCsv).mockResolvedValue(csvResponse);

    const results = await enrichWithGeoloc(publisher, [mission]);

    expect(results).toHaveLength(1);
    expect(results[0].geolocStatus).toBe("NOT_FOUND");
    expect(results[0].city).toBeUndefined();
    expect(results[0].location).toBeUndefined();
    expect(results[0].geoPoint).toBeNull();
  });

  it("accepts result when source has no department code", async () => {
    const mission = buildImportedMission({
      addresses: [buildAddress({ departmentCode: "", postalCode: "", city: "Toulouse" })],
    });
    const csvResponse = [
      GEOPF_CSV_HEADER,
      buildGeopfResultLine({
        departmentcode: "",
        postcode: "",
        result_score: "0.75",
        result_city: "Toulouse",
        result_postcode: "31000",
        result_context: '"31","Haute-Garonne","Occitanie"',
      }),
    ].join("\n");
    vi.mocked(geopfService.searchAddressesCsv).mockResolvedValue(csvResponse);

    const results = await enrichWithGeoloc(publisher, [mission]);

    expect(results).toHaveLength(1);
    expect(results[0].geolocStatus).toBe("ENRICHED_BY_API");
    expect(results[0].departmentCode).toBe("31");
  });

  it("handles multiple missions in one batch", async () => {
    const missions = [
      buildImportedMission({ clientId: "m1", addresses: [buildAddress({ city: "Lyon", postalCode: "69001", departmentCode: "69" })] }),
      buildImportedMission({ clientId: "m2", addresses: [buildAddress({ city: "Marseille", postalCode: "13001", departmentCode: "13" })] }),
    ];
    const csvResponse = [
      GEOPF_CSV_HEADER,
      buildGeopfResultLine({ clientid: "m1", result_score: "0.80", result_city: "Lyon", departmentcode: "69", result_context: '"69","Rhône","Auvergne-Rhône-Alpes"' }),
      buildGeopfResultLine({ clientid: "m2", result_score: "0.30", result_city: "Marseille", departmentcode: "13", result_context: '"13","Bouches-du-Rhône","Provence-Alpes-Côte d\'Azur"' }),
    ].join("\n");
    vi.mocked(geopfService.searchAddressesCsv).mockResolvedValue(csvResponse);

    const results = await enrichWithGeoloc(publisher, missions);

    expect(results).toHaveLength(2);
    expect(results[0].geolocStatus).toBe("ENRICHED_BY_API");
    expect(results[1].geolocStatus).toBe("NOT_FOUND");
  });

  it("returns FAILED results when geopf throws", async () => {
    const mission = buildImportedMission();
    vi.mocked(geopfService.searchAddressesCsv).mockRejectedValue(new Error("Network error"));

    const results = await enrichWithGeoloc(publisher, [mission]);

    expect(results).toHaveLength(1);
    expect(results[0].geolocStatus).toBe("FAILED");
  });
});
