import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { PUBLISHER_IDS } from "@/config";
import { createTestMission, createTestPublisher, createTestPublisherOrganization } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Dashboard mission controller", () => {
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

  it("allows POST /mission/search for an authenticated user", async () => {
    const res = await request(app).post("/mission/search").set(authHeader()).send({});

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("allows GET /mission/:id for the owner publisher", async () => {
    const mission = await createTestMission({ publisherId });

    const res = await request(app).get(`/mission/${mission.id}`).set(authHeader());

    expect(res.status).toBe(200);
  });

  it("allows GET /mission/:id for a linked moderator publisher", async () => {
    await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER, moderator: true });
    const { token: moderatorToken } = await createTestUser({ role: "user", publishers: [PUBLISHER_IDS.JEVEUXAIDER] });
    const otherPublisher = await createTestPublisher();
    const mission = await createTestMission({ publisherId: otherPublisher.id });

    const res = await request(app)
      .get(`/mission/${mission.id}`)
      .set({ Authorization: `jwt ${moderatorToken}` });

    expect(res.status).toBe(200);
  });

  it("rejects GET /mission/:id for another publisher mission", async () => {
    const otherPublisher = await createTestPublisher();
    const mission = await createTestMission({ publisherId: otherPublisher.id });

    const res = await request(app).get(`/mission/${mission.id}`).set(authHeader());

    expect(res.status).toBe(403);
  });

  describe("GET /mission/autocomplete?field=parentOrganization", () => {
    it("returns a parent organization stored in publisher_organization even without a matching mission", async () => {
      // Réseau parent présent en base mais sans mission rattachée : doit malgré tout être proposé.
      await createTestPublisherOrganization({
        publisherId,
        clientId: "org-with-network",
        parentOrganizations: ["La Ligue de l'Enseignement"],
      });

      const res = await request(app)
        .get(`/mission/autocomplete?field=parentOrganization&search=${encodeURIComponent("ligue de l'ens")}&publishers[]=${publisherId}`)
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // La valeur remontée conserve la casse exacte stockée en base.
      expect(res.body.data).toEqual([{ key: "La Ligue de l'Enseignement", doc_count: 1 }]);
    });

    it("does not return parent organizations from other publishers", async () => {
      const otherPublisher = await createTestPublisher();
      await createTestPublisherOrganization({
        publisherId: otherPublisher.id,
        clientId: "org-other",
        parentOrganizations: ["Réseau Privé"],
      });

      const res = await request(app)
        .get(`/mission/autocomplete?field=parentOrganization&search=${encodeURIComponent("Réseau")}&publishers[]=${publisherId}`)
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
