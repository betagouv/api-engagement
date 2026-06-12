import request from "supertest";
import { describe, expect, it } from "vitest";

import { createTestPublisher } from "../../../../fixtures";
import { createTestApp } from "../../../../testApp";

const app = createTestApp();

describe("Publisher V0 API Integration Tests", () => {
  describe("GET /v0/publisher", () => {
    it("lists the partners diffusing the authenticated publisher", async () => {
      const annonceur = await createTestPublisher({ name: "Annonceur" });
      const diffuseur = await createTestPublisher({ name: "Diffuseur 1", publishers: [{ publisherId: annonceur.id }] });
      await createTestPublisher({ name: "Diffuseur 2" });

      const res = await request(app)
        .get("/v0/publisher")
        .set("x-api-key", annonceur.apikey as string);

      expect(res.status).toBe(200);
      expect(res.body.data.map((partner: { _id: string }) => partner._id)).toEqual([diffuseur.id]);
    });
  });

  describe("GET /v0/publisher/:id", () => {
    it("returns a partner by id only when it diffuses the authenticated publisher", async () => {
      const annonceur = await createTestPublisher({ name: "Annonceur" });
      const diffuseur = await createTestPublisher({ name: "Diffuseur 1", publishers: [{ publisherId: annonceur.id }] });
      const unrelated = await createTestPublisher({ name: "Diffuseur 2" });

      const resOk = await request(app)
        .get(`/v0/publisher/${diffuseur.id}`)
        .set("x-api-key", annonceur.apikey as string);
      const resNotFound = await request(app)
        .get(`/v0/publisher/${unrelated.id}`)
        .set("x-api-key", annonceur.apikey as string);

      expect(resOk.status).toBe(200);
      expect(resOk.body.data._id).toBe(diffuseur.id);
      expect(resNotFound.status).toBe(404);
    });
  });
});
