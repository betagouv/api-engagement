import sharp from "sharp";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PUBLISHER_IDS } from "@/config";
import { prisma } from "@/db/postgres";
import { putObject } from "@/services/s3";
import { missionSearchClient } from "@/services/search/collections/missions/client";
import { createTestMission, createTestMissionWithModeration, createTestPublisher, createTestPublisherOrganization } from "../../../fixtures";
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

  it("stores the mission photo as a resized WebP cached for a year on POST /mission/:id/image", async () => {
    vi.mocked(putObject).mockClear();
    const { token: adminToken } = await createTestUser({ role: "admin" });
    const mission = await createTestMission({ publisherId });
    const photo = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#e1000f" } })
      .jpeg()
      .toBuffer();

    const res = await request(app)
      .post(`/mission/${mission.id}/image`)
      .set({ Authorization: `jwt ${adminToken}` })
      .attach("file", photo, "photo.jpg");

    expect(res.status).toBe(200);
    const [objectName, body, options] = vi.mocked(putObject).mock.calls[0];
    expect(objectName).toMatch(new RegExp(`/missions/${mission.id}-[0-9a-f-]{36}\\.webp$`));
    expect(options).toMatchObject({ ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable" });
    expect(await sharp(body as Buffer).metadata()).toMatchObject({ format: "webp", width: 1200, height: 800 });
  });

  it("rejects a file that is not an image on POST /mission/:id/image", async () => {
    vi.mocked(putObject).mockClear();
    const { token: adminToken } = await createTestUser({ role: "admin" });
    const mission = await createTestMission({ publisherId });

    const res = await request(app)
      .post(`/mission/${mission.id}/image`)
      .set({ Authorization: `jwt ${adminToken}` })
      .attach("file", Buffer.from("not an image"), "photo.txt");

    expect(res.status).toBe(400);
    expect(putObject).not.toHaveBeenCalled();
  });

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

  it("allows GET /mission/:id for a diffuser publisher of the mission", async () => {
    const otherPublisher = await createTestPublisher();
    const mission = await createTestMission({ publisherId: otherPublisher.id });
    await prisma.missionDiffusion.create({ data: { distributionPublisherId: publisherId, missionId: mission.id } });

    const res = await request(app).get(`/mission/${mission.id}`).set(authHeader());

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

  describe("GET /mission/autocomplete?field=city", () => {
    it("returns cities of missions moderated by the user's publisher, even without any diffusion snapshot entry", async () => {
      const annonceur = await createTestPublisher();
      const moderateur = await createTestPublisher({ moderator: true, publishers: [{ publisherId: annonceur.id }] });
      const { token: moderateurToken } = await createTestUser({ role: "user", publishers: [moderateur.id] });
      // Mission modérée par le user (aucune ligne mission_diffusion) : doit alimenter l'autocomplete.
      await createTestMissionWithModeration({ publisherId: annonceur.id, city: "Nantes", moderatorPublisherId: moderateur.id });
      // Mission du même annonceur non modérée par le user (statut JVA seulement) : hors périmètre.
      await createTestMission({ publisherId: annonceur.id, city: "Nancy" });

      const res = await request(app)
        .get(`/mission/autocomplete?field=city&search=nan&publishers=${annonceur.id}`)
        .set({ Authorization: `jwt ${moderateurToken}` });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([{ key: "Nantes", doc_count: 1 }]);
    });

    it("rejects a publisher the user neither owns nor moderates", async () => {
      const otherPublisher = await createTestPublisher();

      const res = await request(app).get(`/mission/autocomplete?field=city&search=nan&publishers=${otherPublisher.id}`).set(authHeader());

      expect(res.status).toBe(403);
    });
  });

  describe("GET /mission/:id/diffuseurs", () => {
    let adminToken: string;

    beforeEach(async () => {
      const admin = await createTestUser({ role: "admin" });
      adminToken = admin.token;
    });

    const adminHeader = () => ({ Authorization: `jwt ${adminToken}` });

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

      const res = await request(app).get(`/mission/${mission.id}/diffuseurs`).set(authHeader());

      expect(res.status).toBe(401);
    });
  });

  describe("GET /mission/:id/search-document", () => {
    let adminToken: string;

    beforeEach(async () => {
      const admin = await createTestUser({ role: "admin" });
      adminToken = admin.token;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const adminHeader = () => ({ Authorization: `jwt ${adminToken}` });

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

      const res = await request(app).get(`/mission/${mission.id}/search-document`).set(authHeader());

      expect(res.status).toBe(401);
    });
  });
});
