import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import { type TaxonomyValueKey } from "@engagement/taxonomy";
import { createTestMission, createTestPublisher } from "../../fixtures";
import { createTestApp } from "../../testApp";

const brevoMock = vi.hoisted(() => ({
  createOrUpdateContact: vi.fn(),
  sendTemplate: vi.fn(),
}));

vi.mock("@/services/brevo", () => ({
  TEMPLATE_IDS: {
    INVITATION: 1,
    FORGOT_PASSWORD: 5,
    MISSION_MATCHING_RESULTS: 0,
  },
  LIST_IDS: {
    MISSION_MATCHING_RESULTS: 22,
  },
  createOrUpdateContact: brevoMock.createOrUpdateContact,
  sendTemplate: brevoMock.sendTemplate,
  default: {
    createOrUpdateContact: brevoMock.createOrUpdateContact,
    sendTemplate: brevoMock.sendTemplate,
    LIST_IDS: {
      MISSION_MATCHING_RESULTS: 22,
    },
  },
}));

const app = createTestApp();

beforeEach(() => {
  brevoMock.createOrUpdateContact.mockReset();
  brevoMock.createOrUpdateContact.mockResolvedValue({ ok: true, data: { id: 1 } });
  brevoMock.sendTemplate.mockReset();
  brevoMock.sendTemplate.mockResolvedValue({ ok: true, data: { messageId: "message-id" } });
});

describe("POST /user-scoring", () => {
  let taxonomyValueKey: string;
  let secondaryTaxonomyValueKey: string;

  beforeEach(async () => {
    taxonomyValueKey = "domaine.social_solidarite" satisfies TaxonomyValueKey;
    secondaryTaxonomyValueKey = "type_mission.ponctuelle" satisfies TaxonomyValueKey;
  });

  // ─── Success cases ──────────────────────────────────────────────────────────

  it("should create a user scoring with one answer (no geo)", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy_value_key: taxonomyValueKey }] });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.created_at).toBeDefined();

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(1);
    expect(values[0].score).toBe(1.0);
    expect(values[0].taxonomyKey).toBe("domaine");
    expect(values[0].valueKey).toBe("social_solidarite");
    expect(values[0].taxonomyValueId).toBeNull();

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId: res.body.data.id },
    });
    expect(geo).toBeNull();
  });

  it("should create a user scoring with geo (lat/lon only)", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_key: taxonomyValueKey }],
        geo: { lat: 48.8566, lon: 2.3522 },
      });

    expect(res.status).toBe(201);

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId: res.body.data.id },
    });
    expect(geo).not.toBeNull();
    expect(geo!.lat).toBe(48.8566);
    expect(geo!.lon).toBe(2.3522);
    expect(geo!.radiusKm).toBeNull();
  });

  it("should create a user scoring with geo including radius_km", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_key: taxonomyValueKey }],
        geo: { lat: 48.8566, lon: 2.3522, radius_km: 50 },
      });

    expect(res.status).toBe(201);

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId: res.body.data.id },
    });
    expect(geo!.radiusKm).toBe(50);
  });

  it("should create a user scoring with multiple answers", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_key: taxonomyValueKey }, { taxonomy_value_key: secondaryTaxonomyValueKey }],
      });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
      orderBy: [{ taxonomyKey: "asc" }, { valueKey: "asc" }],
    });
    expect(values).toHaveLength(2);
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual(["domaine.social_solidarite", "type_mission.ponctuelle"]);
  });

  it("should create a user scoring with distinctId and missionAlertEnabled", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_key: taxonomyValueKey }],
        distinctId: "distinct-user-1",
        missionAlertEnabled: true,
      });

    expect(res.status).toBe(201);

    const userScoring = await prisma.userScoring.findUniqueOrThrow({
      where: { id: res.body.data.id },
    });
    expect(userScoring.distinctId).toBe("distinct-user-1");
    expect(userScoring.missionAlertEnabled).toBe(true);
  });

  it("should deduplicate answers with repeated taxonomy_value_key", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_key: taxonomyValueKey }, { taxonomy_value_key: taxonomyValueKey }],
      });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(1);
  });

  it("should set expiresAt on the created user scoring", async () => {
    const before = Date.now();
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy_value_key: taxonomyValueKey }] });

    const userScoring = await prisma.userScoring.findUniqueOrThrow({
      where: { id: res.body.data.id },
    });
    expect(userScoring.expiresAt).not.toBeNull();
    // Should expire in roughly 7 days
    const diffMs = userScoring.expiresAt!.getTime() - before;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6);
    expect(diffDays).toBeLessThan(8);
  });

  // ─── Validation errors ──────────────────────────────────────────────────────

  it("should return 400 when answers is empty", async () => {
    const res = await request(app).post("/user-scoring").send({ answers: [] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when answers is missing", async () => {
    const res = await request(app).post("/user-scoring").send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should silently skip invalid answers and return 201 when at least one is valid", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_key: taxonomyValueKey }, { taxonomy_value_key: "domaine.does_not_exist" }, { taxonomy_value_key: "nodotinkey" }],
      });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(1);
    expect(values[0].taxonomyKey).toBe("domaine");
    expect(values[0].valueKey).toBe("social_solidarite");
  });

  it("should return 400 when all answers are invalid (no dot separator)", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy_value_key: "nodotinkey" }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when all answers reference unknown taxonomy values", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy_value_key: "domaine.does_not_exist" }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when taxonomy_value_key targets inherited object properties", async () => {
    const responses = await Promise.all([
      request(app)
        .post("/user-scoring")
        .send({ answers: [{ taxonomy_value_key: "domaine.toString" }] }),
      request(app)
        .post("/user-scoring")
        .send({ answers: [{ taxonomy_value_key: "__proto__.x" }] }),
    ]);

    expect(responses.map((res) => res.status)).toEqual([400, 400]);
    expect(responses.every((res) => res.body.ok === false)).toBe(true);
  });

  it("should return 400 when geo.lat is out of range", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_key: taxonomyValueKey }],
        geo: { lat: 999, lon: 2.3522 },
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when geo.lon is out of range", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_key: taxonomyValueKey }],
        geo: { lat: 48.8566, lon: 999 },
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("PUT /user-scoring/:userScoringId", () => {
  const distinctId = "distinct-user-1";
  let taxonomyValueKey: string;
  let secondaryTaxonomyValueKey: string;

  beforeEach(async () => {
    taxonomyValueKey = "domaine.social_solidarite" satisfies TaxonomyValueKey;
    secondaryTaxonomyValueKey = "type_mission.ponctuelle" satisfies TaxonomyValueKey;
  });

  const createUserScoring = async (params: { distinctId?: string } = { distinctId }) => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy_value_key: taxonomyValueKey }], distinctId: params.distinctId });

    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };

  const createStoredMatchingResult = async (userScoringId: string, missionCount = 6) => {
    const publisher = await createTestPublisher({ name: "Matching Publisher" });
    const missionScoringIds: string[] = [];
    const missions: Array<{ id: string; title: string; city: string; organizationName: string }> = [];

    for (let index = 0; index < missionCount; index++) {
      const mission = await createTestMission({
        compensationAmount: 620,
        compensationUnit: "month",
        duration: 8,
        endAt: new Date("2026-01-10T00:00:00.000Z"),
        organizationName: `Matching Organization ${index + 1}`,
        organizationClientId: `matching-organization-${index + 1}`,
        publisherId: publisher.id,
        startAt: new Date("2026-02-02T00:00:00.000Z"),
        title: `Matching Mission ${index + 1}`,
        city: `City ${index + 1}`,
      });
      const enrichment = await prisma.missionEnrichment.create({
        data: {
          missionId: mission.id,
          status: "completed",
          promptVersion: `test-${index + 1}`,
          completedAt: new Date(),
        },
      });
      const scoring = await prisma.missionScoring.create({
        data: {
          missionId: mission.id,
          missionEnrichmentId: enrichment.id,
        },
      });

      missionScoringIds.push(scoring.id);
      missions.push({ id: mission.id, title: mission.title, city: `City ${index + 1}`, organizationName: `Matching Organization ${index + 1}` });
    }

    await prisma.missionMatchingResult.create({
      data: {
        userScoringId,
        matchingEngineVersion: "m1",
        results: missionScoringIds.map((missionScoringId) => ({ missionScoringId, taxonomyScores: {} })),
      },
    });

    return { missionScoringIds, missions };
  };

  it("should add answers to an existing user scoring", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({ distinctId, answers: [{ taxonomy_value_key: secondaryTaxonomyValueKey }] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: { user_scoring_id: userScoringId, created_count: 1, mission_alert_enabled: false },
    });

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
      orderBy: [{ taxonomyKey: "asc" }, { valueKey: "asc" }],
    });
    expect(values).toHaveLength(2);
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual(["domaine.social_solidarite", "type_mission.ponctuelle"]);
    expect(brevoMock.createOrUpdateContact).not.toHaveBeenCalled();
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();
  });

  it("should update missionAlertEnabled without adding answers", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app).put(`/user-scoring/${userScoringId}`).send({ distinctId, missionAlertEnabled: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: { user_scoring_id: userScoringId, created_count: 0, mission_alert_enabled: true },
    });

    const userScoring = await prisma.userScoring.findUniqueOrThrow({
      where: { id: userScoringId },
    });
    expect(userScoring.missionAlertEnabled).toBe(true);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
    });
    expect(values).toHaveLength(1);
  });

  it("should add answers and update missionAlertEnabled in the same request", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
        distinctId,
        missionAlertEnabled: true,
        answers: [{ taxonomy_value_key: secondaryTaxonomyValueKey }],
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: { user_scoring_id: userScoringId, created_count: 1, mission_alert_enabled: true },
    });

    const userScoring = await prisma.userScoring.findUniqueOrThrow({
      where: { id: userScoringId },
    });
    expect(userScoring.missionAlertEnabled).toBe(true);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
    });
    expect(values).toHaveLength(2);
  });

  it("should create or update Brevo contact and send matching email when email and matching result are available", async () => {
    const userScoringId = await createUserScoring();
    const matching = await createStoredMatchingResult(userScoringId);

    const res = await request(app).put(`/user-scoring/${userScoringId}`).send({
      distinctId,
      email: " USER@EXAMPLE.COM ",
      missionAlertEnabled: true,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: {
        user_scoring_id: userScoringId,
        created_count: 0,
        mission_alert_enabled: true,
        email_sent: true,
      },
    });

    expect(brevoMock.createOrUpdateContact).toHaveBeenCalledWith({
      email: "user@example.com",
      distinctId,
      userScoringId,
      missionAlertEnabled: true,
      listId: 22,
    });
    expect(brevoMock.sendTemplate).toHaveBeenCalledTimes(1);
    expect(brevoMock.sendTemplate).toHaveBeenCalledWith(0, {
      emailTo: ["user@example.com"],
      params: {
        missions: matching.missions.slice(0, 5).map((mission) => ({
          title: mission.title,
          durationLabel: "8 mois",
          startAtLabel: "à partir du 2 février",
          compensationLabel: "620€ par mois",
          applicationDeadlineLabel: "Candidatures ouvertes jusqu'au 10 janvier",
          publisherLogo: "https://example.com/logo.png",
          publisherName: "Matching Publisher",
          publisherOrganizationName: mission.organizationName,
          city: mission.city,
          url: `http://localhost:4000/r/user-scoring/${userScoringId}/${mission.id}`,
        })),
      },
      tags: ["user-scoring", "mission-matching-results"],
    });

    const userScoring = await prisma.userScoring.findUniqueOrThrow({
      where: { id: userScoringId },
    });
    expect(userScoring.distinctId).toBe(distinctId);
    expect("email" in userScoring).toBe(false);
  });

  it("should send a single mission email when missionId is provided", async () => {
    const userScoringId = await createUserScoring();
    const publisher = await createTestPublisher({ name: "Single Mission Publisher" });
    const mission = await createTestMission({
      compensationAmount: 620,
      compensationUnit: "month",
      duration: 8,
      endAt: new Date("2026-01-10T00:00:00.000Z"),
      organizationName: "Single Mission Organization",
      organizationClientId: "single-mission-organization",
      publisherId: publisher.id,
      startAt: new Date("2026-02-02T00:00:00.000Z"),
      title: "Single Mission",
      city: "Paris",
    });

    const res = await request(app).put(`/user-scoring/${userScoringId}`).send({
      distinctId,
      email: "user@example.com",
      missionId: mission.id,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: {
        user_scoring_id: userScoringId,
        created_count: 0,
        mission_alert_enabled: false,
        email_sent: true,
      },
    });

    expect(brevoMock.createOrUpdateContact).toHaveBeenCalledWith({
      email: "user@example.com",
      distinctId,
      userScoringId,
      missionAlertEnabled: false,
      listId: 22,
    });
    expect(brevoMock.sendTemplate).toHaveBeenCalledTimes(1);
    expect(brevoMock.sendTemplate).toHaveBeenCalledWith(0, {
      emailTo: ["user@example.com"],
      params: {
        missions: [
          {
            title: mission.title,
            durationLabel: "8 mois",
            startAtLabel: "à partir du 2 février",
            compensationLabel: "620€ par mois",
            applicationDeadlineLabel: "Candidatures ouvertes jusqu'au 10 janvier",
            publisherLogo: "https://example.com/logo.png",
            publisherName: "Single Mission Publisher",
            publisherOrganizationName: "Single Mission Organization",
            city: "Paris",
            url: `http://localhost:4000/r/user-scoring/${userScoringId}/${mission.id}`,
          },
        ],
      },
      tags: ["user-scoring", "mission-matching-results"],
    });
  });

  it("should skip single mission email when missionId is not found", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app).put(`/user-scoring/${userScoringId}`).send({
      distinctId,
      email: "user@example.com",
      missionId: "00000000-0000-0000-0000-000000000000",
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: {
        user_scoring_id: userScoringId,
        created_count: 0,
        mission_alert_enabled: false,
        email_sent: false,
        email_skip_reason: "MISSION_NOT_FOUND",
      },
    });
    expect(brevoMock.createOrUpdateContact).toHaveBeenCalledTimes(1);
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();
  });

  it("should skip matching email when no matching result is stored", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app).put(`/user-scoring/${userScoringId}`).send({
      distinctId,
      email: "user@example.com",
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: {
        user_scoring_id: userScoringId,
        created_count: 0,
        mission_alert_enabled: false,
        email_sent: false,
        email_skip_reason: "NO_MATCHING_RESULT",
      },
    });
    expect(brevoMock.createOrUpdateContact).toHaveBeenCalledTimes(1);
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();
  });

  it("should return 502 when Brevo contact creation fails", async () => {
    const userScoringId = await createUserScoring();
    await createStoredMatchingResult(userScoringId);
    brevoMock.createOrUpdateContact.mockResolvedValueOnce({ ok: false, data: { message: "contact failed" } });

    const res = await request(app).put(`/user-scoring/${userScoringId}`).send({
      distinctId,
      email: "user@example.com",
      missionAlertEnabled: true,
    });

    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({
      ok: false,
      code: "EMAIL_SEND_FAILED",
      data: {
        user_scoring_id: userScoringId,
        mission_alert_enabled: true,
        email_sent: false,
      },
    });
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();

    const userScoring = await prisma.userScoring.findUniqueOrThrow({
      where: { id: userScoringId },
    });
    expect(userScoring.missionAlertEnabled).toBe(true);
  });

  it("should return 502 when Brevo transactional email fails", async () => {
    const userScoringId = await createUserScoring();
    await createStoredMatchingResult(userScoringId);
    brevoMock.sendTemplate.mockResolvedValueOnce({ ok: false, data: { message: "template failed" } });

    const res = await request(app).put(`/user-scoring/${userScoringId}`).send({
      distinctId,
      email: "user@example.com",
      missionAlertEnabled: true,
    });

    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({
      ok: false,
      code: "EMAIL_SEND_FAILED",
      data: {
        user_scoring_id: userScoringId,
        mission_alert_enabled: true,
        email_sent: false,
      },
    });
    expect(brevoMock.createOrUpdateContact).toHaveBeenCalledTimes(1);
    expect(brevoMock.sendTemplate).toHaveBeenCalledTimes(1);

    const userScoring = await prisma.userScoring.findUniqueOrThrow({
      where: { id: userScoringId },
    });
    expect(userScoring.missionAlertEnabled).toBe(true);
  });

  it("should skip duplicate answers when adding answers", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
        distinctId,
        answers: [{ taxonomy_value_key: taxonomyValueKey }, { taxonomy_value_key: secondaryTaxonomyValueKey }, { taxonomy_value_key: secondaryTaxonomyValueKey }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.created_count).toBe(1);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
    });
    expect(values).toHaveLength(2);
  });

  it("should silently skip invalid answers when adding answers", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
        distinctId,
        answers: [{ taxonomy_value_key: secondaryTaxonomyValueKey }, { taxonomy_value_key: "domaine.does_not_exist" }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.created_count).toBe(1);
  });

  it("should return 400 when all added answers are invalid", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({ distinctId, answers: [{ taxonomy_value_key: "domaine.does_not_exist" }] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when no update field is provided", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app).put(`/user-scoring/${userScoringId}`).send({ distinctId });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when email is invalid", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app).put(`/user-scoring/${userScoringId}`).send({ distinctId, email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(brevoMock.createOrUpdateContact).not.toHaveBeenCalled();
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();
  });

  it("should return 400 when distinctId is missing", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({ answers: [{ taxonomy_value_key: secondaryTaxonomyValueKey }] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 403 when distinctId does not match the user scoring", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({ distinctId: "another-distinct-user", answers: [{ taxonomy_value_key: secondaryTaxonomyValueKey }] });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(brevoMock.createOrUpdateContact).not.toHaveBeenCalled();
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
    });
    expect(values).toHaveLength(1);
  });

  it("should return 403 when user scoring has no distinctId", async () => {
    const userScoringId = await createUserScoring({ distinctId: undefined });

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({ distinctId, answers: [{ taxonomy_value_key: secondaryTaxonomyValueKey }] });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when userScoringId is not a uuid", async () => {
    const res = await request(app)
      .put("/user-scoring/not-a-uuid")
      .send({ distinctId, answers: [{ taxonomy_value_key: taxonomyValueKey }] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 404 when user scoring does not exist", async () => {
    const res = await request(app)
      .put("/user-scoring/00000000-0000-4000-8000-000000000000")
      .send({ distinctId, answers: [{ taxonomy_value_key: taxonomyValueKey }] });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });
});
