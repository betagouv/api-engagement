import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";

import { PUBLISHER_IDS } from "../../../src/config";
import { prismaCore } from "../../../src/db/postgres";
import { createTestApp } from "../../testApp";
import { createTestMission, createTestPublisher } from "../../fixtures";
import { createTestUser } from "../../fixtures/user";

const app = createTestApp();

/**
 * Moderation API endpoints integration tests
 * Covers POST /moderation/search, /moderation/aggs, GET /moderation/:id,
 * PUT /moderation/:id, PUT /moderation/many
 *
 * Note: createTestMission() automatically creates a MissionModerationStatus
 * with publisherId = PUBLISHER_IDS.JEVEUXAIDER and status = "PENDING".
 * We use the factory's moderationStatus/moderationComment overrides to control the initial state.
 */
describe("Moderation API endpoints (integration test)", () => {
  let jva: Awaited<ReturnType<typeof createTestPublisher>>;
  let partner: Awaited<ReturnType<typeof createTestPublisher>>;
  let adminToken: string;

  beforeEach(async () => {
    partner = await createTestPublisher();
    jva = await createTestPublisher({
      id: PUBLISHER_IDS.JEVEUXAIDER,
      moderator: true,
    });

    const adminResult = await createTestUser({ role: "admin", publishers: [jva.id] });
    adminToken = adminResult.token;
  });

  // Helper: create mission with a given moderation state via factory overrides
  const createMissionWithModeration = async (opts: { status?: string; comment?: string } = {}) => {
    const mission = await createTestMission({
      publisherId: partner.id,
      statusCode: "ACCEPTED",
      description: "D".repeat(350),
      moderationStatus: (opts.status ?? "PENDING") as any,
      moderationComment: (opts.comment ?? null) as any,
    });

    // Fetch the moderation record created by the factory
    const moderation = await prismaCore.missionModerationStatus.findFirst({
      where: { missionId: mission.id, publisherId: PUBLISHER_IDS.JEVEUXAIDER },
    });
    if (!moderation) throw new Error("Moderation record not found after createTestMission");

    return { mission, moderation };
  };

  // ─── POST /moderation/search ──────────────────────────────────────────────

  describe("POST /moderation/search", () => {
    it("should return 401 when unauthenticated", async () => {
      const res = await request(app).post("/moderation/search").send({ publisherId: partner.id });
      expect(res.status).toBe(401);
    });

    it("should return 400 for an invalid status value", async () => {
      const res = await request(app)
        .post("/moderation/search")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ status: "INVALID_STATUS" });
      expect(res.status).toBe(400);
    });

    it("should return empty results when there are no moderation records for this moderator", async () => {
      const otherPublisher = await createTestPublisher({ moderator: true });

      const res = await request(app)
        .post("/moderation/search")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: otherPublisher.id });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it("should return moderation records for a given moderatorId", async () => {
      await createMissionWithModeration();
      await createMissionWithModeration();

      const res = await request(app)
        .post("/moderation/search")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it("should filter by status", async () => {
      await createMissionWithModeration({ status: "REFUSED", comment: "CONTENT_INSUFFICIENT" });
      await createMissionWithModeration({ status: "PENDING" });

      const res = await request(app)
        .post("/moderation/search")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id, status: "REFUSED" });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe("REFUSED");
    });

    it("should filter by comment", async () => {
      await createMissionWithModeration({ status: "REFUSED", comment: "CONTENT_INSUFFICIENT" });
      await createMissionWithModeration({ status: "REFUSED", comment: "MISSION_CREATION_DATE_TOO_OLD" });

      const res = await request(app)
        .post("/moderation/search")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id, comment: "CONTENT_INSUFFICIENT" });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].comment).toBe("CONTENT_INSUFFICIENT");
    });

    it("should filter by search (mission title)", async () => {
      await createTestMission({
        publisherId: partner.id,
        statusCode: "ACCEPTED",
        title: "Mission bénévole Paris",
        moderationStatus: "PENDING" as any,
      });
      await createTestMission({
        publisherId: partner.id,
        statusCode: "ACCEPTED",
        title: "Mission Lyon",
        moderationStatus: "PENDING" as any,
      });

      const res = await request(app)
        .post("/moderation/search")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id, search: "Paris" });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("should paginate results with from and size", async () => {
      for (let i = 0; i < 5; i++) {
        await createMissionWithModeration();
      }

      const res = await request(app)
        .post("/moderation/search")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id, size: 2, from: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(5);
    });

    it("should include mission fields in response (flattened record)", async () => {
      await createMissionWithModeration();

      const res = await request(app)
        .post("/moderation/search")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id });

      expect(res.status).toBe(200);
      const record = res.body.data[0];
      expect(record).toHaveProperty("id");
      expect(record).toHaveProperty("missionId");
      expect(record).toHaveProperty("missionTitle");
      expect(record).toHaveProperty("missionPublisherId");
      expect(record).toHaveProperty("status");
    });
  });

  // ─── POST /moderation/aggs ────────────────────────────────────────────────

  describe("POST /moderation/aggs", () => {
    it("should return 401 when unauthenticated", async () => {
      const res = await request(app).post("/moderation/aggs").send({});
      expect(res.status).toBe(401);
    });

    it("should return aggregations with correct keys", async () => {
      await createMissionWithModeration({ status: "REFUSED", comment: "CONTENT_INSUFFICIENT" });
      await createMissionWithModeration({ status: "PENDING" });

      const res = await request(app)
        .post("/moderation/aggs")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveProperty("status");
      expect(res.body.data).toHaveProperty("comments");
      expect(res.body.data).toHaveProperty("domains");
      expect(res.body.data).toHaveProperty("departments");
      expect(res.body.data).toHaveProperty("organizations");
    });

    it("should reflect actual status distribution in status aggregation", async () => {
      await createMissionWithModeration({ status: "REFUSED", comment: "CONTENT_INSUFFICIENT" });
      await createMissionWithModeration({ status: "PENDING" });
      await createMissionWithModeration({ status: "PENDING" });

      const res = await request(app)
        .post("/moderation/aggs")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id });

      const statusAgg = res.body.data.status;
      const refused = statusAgg.find((s: any) => s.key === "REFUSED");
      const pending = statusAgg.find((s: any) => s.key === "PENDING");
      expect(refused?.doc_count).toBe(1);
      expect(pending?.doc_count).toBe(2);
    });

    it("should reduce aggregations when a status filter is active", async () => {
      await createMissionWithModeration({ status: "REFUSED", comment: "CONTENT_INSUFFICIENT" });
      await createMissionWithModeration({ status: "PENDING" });

      const res = await request(app)
        .post("/moderation/aggs")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id, status: "REFUSED" });

      expect(res.status).toBe(200);
      const commentsAgg = res.body.data.comments;
      expect(commentsAgg).toHaveLength(1);
      expect(commentsAgg[0].key).toBe("CONTENT_INSUFFICIENT");
    });
  });

  // ─── GET /moderation/:id ──────────────────────────────────────────────────

  describe("GET /moderation/:id", () => {
    it("should return 401 when unauthenticated", async () => {
      const res = await request(app).get("/moderation/unknown-id").query({ moderatorId: jva.id });
      expect(res.status).toBe(401);
    });

    it("should return 404 for a non-existent moderation id", async () => {
      const res = await request(app)
        .get("/moderation/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `jwt ${adminToken}`)
        .query({ moderatorId: jva.id });

      expect(res.status).toBe(404);
    });

    it("should return 403 when the moderatorId is not a moderator", async () => {
      const { moderation } = await createMissionWithModeration();
      const nonModerator = await createTestPublisher({ moderator: false });

      const res = await request(app)
        .get(`/moderation/${moderation.id}`)
        .set("Authorization", `jwt ${adminToken}`)
        .query({ moderatorId: nonModerator.id });

      expect(res.status).toBe(403);
    });

    it("should return 403 when user does not have access to the moderator publisher", async () => {
      const { moderation } = await createMissionWithModeration();
      const { token } = await createTestUser({ role: "user", publishers: [partner.id] });

      const res = await request(app)
        .get(`/moderation/${moderation.id}`)
        .set("Authorization", `jwt ${token}`)
        .query({ moderatorId: jva.id });

      expect(res.status).toBe(403);
    });

    it("should return the moderation record with flattened mission fields", async () => {
      const { moderation, mission } = await createMissionWithModeration();

      const res = await request(app)
        .get(`/moderation/${moderation.id}`)
        .set("Authorization", `jwt ${adminToken}`)
        .query({ moderatorId: jva.id });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.id).toBe(moderation.id);
      expect(res.body.data.missionId).toBe(mission.id);
      expect(res.body.data.status).toBe("PENDING");
    });
  });

  // ─── PUT /moderation/:id ──────────────────────────────────────────────────

  describe("PUT /moderation/:id", () => {
    it("should return 401 when unauthenticated", async () => {
      const res = await request(app).put("/moderation/unknown-id").send({ moderatorId: jva.id, status: "ACCEPTED" });
      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid body (invalid status)", async () => {
      const { moderation } = await createMissionWithModeration();

      const res = await request(app)
        .put(`/moderation/${moderation.id}`)
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id, status: "NOT_A_STATUS" });

      expect(res.status).toBe(400);
    });

    it("should return 403 when user does not have access to the moderator publisher", async () => {
      const { moderation } = await createMissionWithModeration();
      const { token } = await createTestUser({ role: "user", publishers: [partner.id] });

      const res = await request(app)
        .put(`/moderation/${moderation.id}`)
        .set("Authorization", `jwt ${token}`)
        .send({ moderatorId: jva.id, status: "ACCEPTED" });

      expect(res.status).toBe(403);
    });

    it("should update the status and persist it in the database", async () => {
      const { moderation } = await createMissionWithModeration();

      const res = await request(app)
        .put(`/moderation/${moderation.id}`)
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id, status: "ACCEPTED" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("ACCEPTED");

      const inDb = await prismaCore.missionModerationStatus.findUnique({ where: { id: moderation.id } });
      expect(inDb?.status).toBe("ACCEPTED");
    });

    it("should create a ModerationEvent when status changes", async () => {
      const { moderation } = await createMissionWithModeration();

      await request(app)
        .put(`/moderation/${moderation.id}`)
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id, status: "ACCEPTED" });

      const events = await prismaCore.moderationEvent.findMany({ where: { missionId: moderation.missionId } });
      expect(events).toHaveLength(1);
      expect(events[0].initialStatus).toBe("PENDING");
      expect(events[0].newStatus).toBe("ACCEPTED");
      expect(events[0].moderatorId).toBe(jva.id);
    });

    it("should clear the comment when changing from REFUSED to ACCEPTED", async () => {
      const { moderation } = await createMissionWithModeration({ status: "REFUSED", comment: "CONTENT_INSUFFICIENT" });

      const res = await request(app)
        .put(`/moderation/${moderation.id}`)
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id, status: "ACCEPTED" });

      expect(res.status).toBe(200);
      expect(res.body.data.comment).toBeNull();

      const inDb = await prismaCore.missionModerationStatus.findUnique({ where: { id: moderation.id } });
      expect(inDb?.comment).toBeNull();
    });

    it("should update note without changing status", async () => {
      const { moderation } = await createMissionWithModeration();

      const res = await request(app)
        .put(`/moderation/${moderation.id}`)
        .set("Authorization", `jwt ${adminToken}`)
        .send({ moderatorId: jva.id, note: "Note interne" });

      expect(res.status).toBe(200);
      const inDb = await prismaCore.missionModerationStatus.findUnique({ where: { id: moderation.id } });
      expect(inDb?.note).toBe("Note interne");
      expect(inDb?.status).toBe("PENDING");
    });
  });

  // ─── PUT /moderation/many ─────────────────────────────────────────────────

  describe("PUT /moderation/many", () => {
    it("should return 401 when unauthenticated", async () => {
      const res = await request(app)
        .put("/moderation/many")
        .send({ where: { moderatorId: jva.id, ids: [] }, update: { status: "ACCEPTED" } });
      expect(res.status).toBe(401);
    });

    it("should return 403 when moderatorId is not a moderator", async () => {
      const nonModerator = await createTestPublisher({ moderator: false });

      const res = await request(app)
        .put("/moderation/many")
        .set("Authorization", `jwt ${adminToken}`)
        .send({ where: { moderatorId: nonModerator.id, ids: [] }, update: { status: "ACCEPTED" } });

      expect(res.status).toBe(403);
    });

    it("should return empty result when no records match the ids", async () => {
      const res = await request(app)
        .put("/moderation/many")
        .set("Authorization", `jwt ${adminToken}`)
        .send({
          where: { moderatorId: jva.id, ids: ["00000000-0000-0000-0000-000000000000"] },
          update: { status: "ACCEPTED" },
        });

      expect(res.status).toBe(200);
      // When total === 0, the controller returns { updated: 0, events: 0 }
      expect(res.body.data).toMatchObject({ updated: 0, events: 0 });
    });

    it("should update multiple moderation records by ids", async () => {
      const { moderation: mod1 } = await createMissionWithModeration();
      const { moderation: mod2 } = await createMissionWithModeration();

      const res = await request(app)
        .put("/moderation/many")
        .set("Authorization", `jwt ${adminToken}`)
        .send({
          where: { moderatorId: jva.id, ids: [mod1.id, mod2.id] },
          update: { status: "ACCEPTED" },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedIds).toHaveLength(2);

      const inDb1 = await prismaCore.missionModerationStatus.findUnique({ where: { id: mod1.id } });
      const inDb2 = await prismaCore.missionModerationStatus.findUnique({ where: { id: mod2.id } });
      expect(inDb1?.status).toBe("ACCEPTED");
      expect(inDb2?.status).toBe("ACCEPTED");
    });

    it("should create one ModerationEvent per updated record", async () => {
      const { moderation: mod1 } = await createMissionWithModeration();
      const { moderation: mod2 } = await createMissionWithModeration();

      await request(app)
        .put("/moderation/many")
        .set("Authorization", `jwt ${adminToken}`)
        .send({
          where: { moderatorId: jva.id, ids: [mod1.id, mod2.id] },
          update: { status: "ACCEPTED" },
        });

      const events = await prismaCore.moderationEvent.findMany({ where: { moderatorId: jva.id } });
      expect(events).toHaveLength(2);
      events.forEach((e) => {
        expect(e.newStatus).toBe("ACCEPTED");
        expect(e.initialStatus).toBe("PENDING");
      });
    });

    it("should update all moderation records for a given organization name", async () => {
      const mission1 = await createTestMission({ publisherId: partner.id, statusCode: "ACCEPTED", organizationName: "Croix Rouge", moderationStatus: "PENDING" as any });
      const mission2 = await createTestMission({ publisherId: partner.id, statusCode: "ACCEPTED", organizationName: "Croix Rouge", moderationStatus: "PENDING" as any });
      const otherMission = await createTestMission({ publisherId: partner.id, statusCode: "ACCEPTED", organizationName: "SAMU Social", moderationStatus: "PENDING" as any });

      const modOther = await prismaCore.missionModerationStatus.findFirst({ where: { missionId: otherMission.id, publisherId: jva.id } });
      expect(modOther).toBeTruthy();

      const res = await request(app)
        .put("/moderation/many")
        .set("Authorization", `jwt ${adminToken}`)
        .send({
          where: { moderatorId: jva.id, organizationName: "Croix Rouge" },
          update: { status: "ACCEPTED" },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedIds).toHaveLength(2);

      const otherStatus = await prismaCore.missionModerationStatus.findUnique({ where: { id: modOther!.id } });
      expect(otherStatus?.status).toBe("PENDING");
    });
  });
});
