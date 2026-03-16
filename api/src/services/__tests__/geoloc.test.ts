import { describe, expect, it, vi } from "vitest";

import { enrichWithGeoloc, GeolocMissionInput } from "@/services/geoloc";

vi.mock("@/services/geopf", () => ({
  default: {
    searchAddressesCsv: vi.fn(),
  },
}));

// Re-import after mock registration
const { default: geopfService } = await import("@/services/geopf");

// Builds a geopf-style CSV response. context must NOT contain commas (the parser splits on all commas).
const buildGeopfCsvResponse = (rows: { clientId: string; addressIndex: number; score: number; street?: string; city?: string; postcode?: string; lat?: number | ""; lon?: number | ""; context?: string }[]) => {
  const header = "clientid,addressindex,result_score,result_name,result_city,result_postcode,result_context,latitude,longitude";
  const lines = rows.map((r) =>
    [r.clientId, r.addressIndex, r.score, r.street ?? "", r.city ?? "", r.postcode ?? "", r.context ?? "", r.lat ?? "", r.lon ?? ""].join(",")
  );
  return [header, ...lines].join("\n");
};

describe("enrichWithGeoloc", () => {
  it("enriches an address when geopf returns a high-score result", async () => {
    const missions: GeolocMissionInput[] = [
      {
        clientId: "mission-1",
        addresses: [{ street: "46 Rue Saint-Antoine", city: "Paris", postalCode: "75004", geolocStatus: "SHOULD_ENRICH" }],
      },
    ];

    vi.mocked(geopfService.searchAddressesCsv).mockResolvedValueOnce(
      buildGeopfCsvResponse([{ clientId: "mission-1", addressIndex: 0, score: 0.95, street: "46 Rue Saint-Antoine", city: "Paris", postcode: "75004", lat: 48.854, lon: 2.364, context: "75" }])
    );

    const results = await enrichWithGeoloc("test", missions);

    expect(results).toHaveLength(1);
    expect(results[0].geolocStatus).toBe("ENRICHED_BY_API");
    expect(results[0].city).toBe("Paris");
    expect(results[0].postalCode).toBe("75004");
    expect(results[0].street).toBe("46 Rue Saint-Antoine");
    expect(results[0].location).toEqual({ lat: 48.854, lon: 2.364 });
    // Second pass should NOT have been called
    expect(geopfService.searchAddressesCsv).toHaveBeenCalledTimes(1);
  });

  it("falls back to city-level geocoding when street is invalid (score too low)", async () => {
    const missions: GeolocMissionInput[] = [
      {
        clientId: "mission-2",
        addresses: [{ street: "champ libre invalide", city: "Grenoble", postalCode: "", geolocStatus: "SHOULD_ENRICH" }],
      },
    ];

    // First pass: low score → NOT_FOUND
    vi.mocked(geopfService.searchAddressesCsv).mockResolvedValueOnce(
      buildGeopfCsvResponse([{ clientId: "mission-2", addressIndex: 0, score: 0.1 }])
    );

    // Second pass (city-only): high score → ENRICHED_BY_API
    vi.mocked(geopfService.searchAddressesCsv).mockResolvedValueOnce(
      buildGeopfCsvResponse([{ clientId: "mission-2", addressIndex: 0, score: 0.9, city: "Grenoble", postcode: "38000", lat: 45.1875, lon: 5.7357, context: "38" }])
    );

    const results = await enrichWithGeoloc("test", missions);

    expect(geopfService.searchAddressesCsv).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(1);
    expect(results[0].geolocStatus).toBe("ENRICHED_BY_API");
    expect(results[0].city).toBe("Grenoble");
    expect(results[0].postalCode).toBe("38000");
    // Street stays undefined since city-level geocoding doesn't return street
    expect(results[0].street).toBeUndefined();
    expect(results[0].location).toEqual({ lat: 45.1875, lon: 5.7357 });
    expect(results[0].departmentCode).toBe("38");
    expect(results[0].departmentName).toBe("Isère");
    expect(results[0].region).toBe("Auvergne-Rhône-Alpes");
  });

  it("does not trigger second pass when NOT_FOUND address has no city or postalCode", async () => {
    const missions: GeolocMissionInput[] = [
      {
        clientId: "mission-3",
        addresses: [{ street: "rue invalide", city: "", postalCode: "", geolocStatus: "SHOULD_ENRICH" }],
      },
    ];

    vi.mocked(geopfService.searchAddressesCsv).mockResolvedValueOnce(
      buildGeopfCsvResponse([{ clientId: "mission-3", addressIndex: 0, score: 0.05 }])
    );

    const results = await enrichWithGeoloc("test", missions);

    expect(geopfService.searchAddressesCsv).toHaveBeenCalledTimes(1);
    expect(results[0].geolocStatus).toBe("NOT_FOUND");
  });

  it("does not geocode addresses already ENRICHED_BY_PUBLISHER", async () => {
    const missions: GeolocMissionInput[] = [
      {
        clientId: "mission-4",
        addresses: [{ street: "46 Rue Saint-Antoine", city: "Paris", postalCode: "75004", geolocStatus: "ENRICHED_BY_PUBLISHER" }],
      },
    ];

    const results = await enrichWithGeoloc("test", missions);

    expect(geopfService.searchAddressesCsv).not.toHaveBeenCalled();
    expect(results).toHaveLength(0);
  });
});
