import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import { missionSearchClient } from "@/services/search/collections/missions/client";
import { createTestMission, createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Dashboard mission technical tabs (diffuseurs + doc Typesense)", () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    const admin = await createTestUser({ role: "admin" });
    adminToken = admin.token;
    const user = await createTestUser({ role: "user" });
    userToken = user.token;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const adminHeader = () => ({ Authorization: `jwt ${adminToken}` });

  describe("GET /mission/:id/diffuseurs", () => {
    it("returns the distribution publishers materialized for the mission", async () => {
      const mission = await createTestMission();
      const diffuseurA = await createTestPublisher({ name: "Diffuseur A" });
      const diffuseurB = await createTestPublisher({ name: "Diffuseur B" });
      await prisma.missionDiffusion.create({ data: { missionId: mission.id, distributionPublisherId: diffuseurA.id } });
      await prisma.missionDiffusion.create({ data: { missionId: mission.id, distributionPublisherId: diffuseurB.id } });

      const res = await request(app).get(`/mission/${mission.id}/diffuseurs`).set(adminHeader());

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveLength(2);
      const ids = res.body.data.map((diffuseur: { id: string }) => diffuseur.id);
      expect(ids).toEqual(expect.arrayContaining([diffuseurA.id, diffuseurB.id]));
      expect(res.body.data[0]).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String), diffusedAt: expect.any(String) }));
    });

    it("returns an empty list when no publisher diffuses the mission", async () => {
      const mission = await createTestMission();

      const res = await request(app).get(`/mission/${mission.id}/diffuseurs`).set(adminHeader());

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("returns 404 for an unknown mission", async () => {
      const res = await request(app).get("/mission/unknown-id/diffuseurs").set(adminHeader());

      expect(res.status).toBe(404);
    });

    it("rejects a non-admin user", async () => {
      const mission = await createTestMission();

      const res = await request(app)
        .get(`/mission/${mission.id}/diffuseurs`)
        .set({ Authorization: `jwt ${userToken}` });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /mission/:id/search-document", () => {
    it("returns the raw Typesense document for the mission", async () => {
      const mission = await createTestMission();
      const document = { id: mission.id, publisherId: mission.publisherId, departmentCodes: ["75"], distributionPublisherIds: ["pub-1"] };
      vi.spyOn(missionSearchClient, "retrieve").mockResolvedValue(document);

      const res = await request(app).get(`/mission/${mission.id}/search-document`).set(adminHeader());

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual(document);
      expect(missionSearchClient.retrieve).toHaveBeenCalledWith(mission.id);
    });

    it("returns data null when the mission is not indexed in Typesense", async () => {
      const mission = await createTestMission();
      vi.spyOn(missionSearchClient, "retrieve").mockResolvedValue(null);

      const res = await request(app).get(`/mission/${mission.id}/search-document`).set(adminHeader());

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });

    it("returns 404 for an unknown mission without hitting Typesense", async () => {
      const retrieveSpy = vi.spyOn(missionSearchClient, "retrieve");

      const res = await request(app).get("/mission/unknown-id/search-document").set(adminHeader());

      expect(res.status).toBe(404);
      expect(retrieveSpy).not.toHaveBeenCalled();
    });

    it("rejects a non-admin user", async () => {
      const mission = await createTestMission();

      const res = await request(app)
        .get(`/mission/${mission.id}/search-document`)
        .set({ Authorization: `jwt ${userToken}` });

      expect(res.status).toBe(401);
    });
  });
});
