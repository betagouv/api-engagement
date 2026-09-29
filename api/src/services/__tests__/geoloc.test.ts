import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchMock } = vi.hoisted(() => ({ searchMock: vi.fn() }));

vi.mock("@/services/geopf", () => ({ default: { searchAddressesCsv: searchMock } }));
vi.mock("@/error", () => ({ captureException: vi.fn() }));

import { enrichWithGeoloc } from "@/services/geoloc";

const HEADER = "clientid,addressindex,address,city,postcode,departmentcode,latitude,longitude,result_score,result_name,result_postcode,result_city,result_context";

describe("enrichWithGeoloc", () => {
  beforeEach(() => searchMock.mockReset());

  it("conserve les accents dans la requête envoyée à la Géoplateforme", async () => {
    searchMock.mockResolvedValue(HEADER);
    await enrichWithGeoloc("test", [{ clientId: "m1:c1", addresses: [{ street: "8 Rue de la Liberté", city: "Le Marin", postalCode: "97290", departmentCode: "972" }] }]);

    const csv = searchMock.mock.calls[0][0] as string;
    expect(csv).toContain("8 Rue de la Liberté");
    expect(csv).not.toContain("Libert ");
  });

  it("parse un résultat dont le contexte contient une virgule", async () => {
    searchMock.mockResolvedValue(`${HEADER}\nm1:c1,0,x,x,97290,972,14.46,-60.87,0.91,8 Rue de la Liberté,97290,Le Marin,"972, Martinique"`);
    const [result] = await enrichWithGeoloc("test", [{ clientId: "m1:c1", addresses: [{ street: "8 Rue de la Liberté", city: "Le Marin", postalCode: "97290" }] }]);

    expect(result).toMatchObject({ geolocStatus: "ENRICHED_BY_API", departmentCode: "972", city: "Le Marin", location: { lat: 14.46, lon: -60.87 } });
  });

  it("marque NOT_FOUND sous le seuil de score", async () => {
    searchMock.mockResolvedValue(`${HEADER}\nm1:c1,0,x,x,97290,972,14.46,-60.87,0.2,x,97290,Le Marin,"972, Martinique"`);
    const [result] = await enrichWithGeoloc("test", [{ clientId: "m1:c1", addresses: [{ street: "x", city: "Le Marin", postalCode: "97290" }] }]);

    expect(result.geolocStatus).toBe("NOT_FOUND");
  });
});
