import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import { createTestApp } from "../../../testApp";

vi.mock("@/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/config")>()),
  MISSION_V2_LIST_ENABLED: false,
}));

describe("Routing", () => {
  const app = createTestApp();

  describe("Alias de lecture v2 → v0", () => {
    const aliasApp = createTestApp({ syncMissionDiffusion: true });

    it("conserve les filtres, l'offset et le format de réponse v0", async () => {
      const owner = await createTestPublisher();
      const diffuseur = await createTestPublisher({ publishers: [{ publisherId: owner.id }] });
      await createTestMission({ publisherId: owner.id, city: "Paris" });
      await createTestMission({ publisherId: owner.id, city: "Paris" });
      await createTestMission({ publisherId: owner.id, city: "Lyon" });
      const query = `publisher=${owner.id}&city=Paris&skip=1&limit=1`;

      const v0 = await request(aliasApp).get(`/v0/mission?${query}`).set("x-api-key", diffuseur.apikey!).expect(200);
      const v2 = await request(aliasApp).get(`/v2/mission?${query}`).set("x-api-key", diffuseur.apikey!).expect(200);

      expect(v2.body).toEqual(v0.body);
      expect(v2.body.total).toBe(2);
      expect(v2.body.skip).toBe(1);
      expect(v2.body.data).toHaveLength(1);
      expect(v2.body.data[0]).toHaveProperty("_id");
      expect(v2.body).not.toHaveProperty("nextCursor");
    });

    it("conserve l'authentification sur l'alias", async () => {
      await request(app).get("/v2/mission").expect(401);
    });
  });

  describe("Unknown routes", () => {
    it("should return 404 for unknown GET route", async () => {
      const response = await request(app).get("/jeecg-boot/jmreport/show");
      expect(response.status).toBe(404);
    });

    it("should return 404 for unknown POST route", async () => {
      const response = await request(app).post("/jeecg-boot/jmreport/show").send({ id: "test" });
      expect(response.status).toBe(404);
    });
  });

  describe("Invalid JSON body", () => {
    it("should return 400 for malformed JSON", async () => {
      const response = await request(app).post("/v0/mission").set("Content-Type", "application/json").send('{"invalid json}');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ ok: false, code: "INVALID_BODY" });
    });

    it("should return 400 for exploit payload with malformed JSON", async () => {
      const payload = '{"id":"961455b47c0b86dc961e90b5893bff05","apiUrl":"","params":"{"id":"1\' or \'%1%\' like (updatexml(0x3a,concat(1,(version())),1)) or \'%%\' like \'"}"}';
      const response = await request(app).post("/jeecg-boot/jmreport/show").set("Content-Type", "application/json").send(payload);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ ok: false, code: "INVALID_BODY" });
    });
  });

  describe("Valid routes still work", () => {
    it("should not return 404 for known route prefix", async () => {
      const response = await request(app).get("/v0/mission");
      expect(response.status).not.toBe(404);
    });
  });
});
