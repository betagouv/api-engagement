import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PUBLISHER_IDS } from "@/config";
import { prisma } from "@/db/postgres";
import { createTestMission, createTestPublisher } from "../../fixtures";
import { createTestApp } from "../../testApp";

const brevoMock = vi.hoisted(() => ({
  createOrUpdateContact: vi.fn(),
  sendTemplate: vi.fn(),
}));

vi.mock("@/services/brevo", async () => {
  const { buildMissionContentHtml } = await vi.importActual<typeof import("@/services/brevo/mission-content")>("@/services/brevo/mission-content");
  return {
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
    buildMissionContentHtml,
    default: {
      createOrUpdateContact: brevoMock.createOrUpdateContact,
      sendTemplate: brevoMock.sendTemplate,
      LIST_IDS: {
        MISSION_MATCHING_RESULTS: 22,
      },
    },
  };
});

const app = createTestApp();
let apiKey: string;

const withApiKey = <T extends { set(name: string, value: string): T }>(test: T) => test.set("x-api-key", apiKey);
const postUserScoringRequest = () => withApiKey(request(app).post("/user-scoring"));
const putUserScoringRequest = (userScoringId: string) => withApiKey(request(app).put(`/user-scoring/${userScoringId}`));
const postMissionEmailRequest = () => withApiKey(request(app).post("/email/mission"));

beforeEach(async () => {
  const publisher = await createTestPublisher({ name: "User Scoring API Test Publisher" });
  apiKey = publisher.apikey!;
  brevoMock.createOrUpdateContact.mockReset();
  brevoMock.createOrUpdateContact.mockResolvedValue({ ok: true, data: { id: 1 } });
  brevoMock.sendTemplate.mockReset();
  brevoMock.sendTemplate.mockResolvedValue({ ok: true, data: { messageId: "message-id" } });
});

describe("POST /user-scoring", () => {
  let taxonomyAnswer: { taxonomy: string; value: string };
  let secondaryTaxonomyAnswer: { taxonomy: string; value: string };

  beforeEach(async () => {
    taxonomyAnswer = { taxonomy: "domaine", value: "social_solidarite" };
    secondaryTaxonomyAnswer = { taxonomy: "type_mission", value: "ponctuelle" };
  });

  it("should require an api key", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [taxonomyAnswer] });

    expect(res.status).toBe(401);
  });

  // ─── Success cases ──────────────────────────────────────────────────────────

  it("should create a user scoring with one answer (no geo)", async () => {
    const res = await postUserScoringRequest().send({ answers: [taxonomyAnswer] });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBeDefined();

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(1);
    expect(values[0].score).toBe(1.0);
    expect(values[0].taxonomyKey).toBe("domaine");
    expect(values[0].valueKey).toBe("social_solidarite");

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId: res.body.data.id },
    });
    expect(geo).toBeNull();
  });

  it("should create a user scoring with location params (lat/lon only)", async () => {
    const res = await postUserScoringRequest().send({
      answers: [taxonomyAnswer, { taxonomy: "location", params: { lat: 48.8566, lon: 2.3522 } }],
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

  it("should create a user scoring with location params including radius_km and country_code", async () => {
    const res = await postUserScoringRequest().send({
      answers: [taxonomyAnswer, { taxonomy: "location", params: { lat: 48.8566, lon: 2.3522, radius_km: 50, country_code: "fr" } }],
    });

    expect(res.status).toBe(201);

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId: res.body.data.id },
    });
    expect(geo!.radiusKm).toBe(50);
    expect(geo!.countryCode).toBe("FR");
  });

  it("should create a user scoring with only location params", async () => {
    const res = await postUserScoringRequest().send({
      answers: [{ taxonomy: "location", params: { lat: 48.8566, lon: 2.3522 } }],
    });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(0);

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId: res.body.data.id },
    });
    expect(geo).not.toBeNull();
    expect(geo!.lat).toBe(48.8566);
    expect(geo!.lon).toBe(2.3522);
  });

  it("should create a user scoring with multiple answers", async () => {
    const res = await postUserScoringRequest().send({
      answers: [taxonomyAnswer, secondaryTaxonomyAnswer],
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
    const res = await postUserScoringRequest().send({
      answers: [taxonomyAnswer],
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

  it("should deduplicate repeated answers", async () => {
    const res = await postUserScoringRequest().send({
      answers: [taxonomyAnswer, taxonomyAnswer],
    });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(1);
  });

  // ─── Validation errors ──────────────────────────────────────────────────────

  it("should return 400 when answers is empty", async () => {
    const res = await postUserScoringRequest().send({ answers: [] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when answers is missing", async () => {
    const res = await postUserScoringRequest().send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should create a user scoring from tranche_age params", async () => {
    const res = await postUserScoringRequest().send({
      answers: [{ taxonomy: "tranche_age", params: { age: 18, handicap: false } }],
    });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
      orderBy: [{ valueKey: "asc" }],
    });
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual(["tranche_age.entre_18_25_ans"]);
  });

  it("should create a user scoring with handicap tranche_age params", async () => {
    const res = await postUserScoringRequest().send({
      answers: [{ taxonomy: "tranche_age", params: { age: 30, handicap: true } }],
    });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
      orderBy: [{ valueKey: "asc" }],
    });
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual(["tranche_age.entre_25_30_ans", "tranche_age.moins_31_ans_handicap"]);
  });

  it("should deduplicate direct and resolved answers", async () => {
    const res = await postUserScoringRequest().send({
      answers: [
        { taxonomy: "tranche_age", value: "entre_18_25_ans" },
        { taxonomy: "tranche_age", params: { age: 18, handicap: false } },
      ],
    });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(1);
  });

  it("should return 400 when taxonomy is unknown", async () => {
    const res = await postUserScoringRequest().send({ answers: [{ taxonomy: "unknown", value: "sante_soins" }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when taxonomy value is unknown", async () => {
    const res = await postUserScoringRequest().send({ answers: [{ taxonomy: "domaine", value: "does_not_exist" }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when params target a taxonomy without transformer", async () => {
    const res = await postUserScoringRequest().send({ answers: [{ taxonomy: "domaine", params: { age: 18 } }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when tranche_age params are invalid", async () => {
    const responses = await Promise.all([
      postUserScoringRequest().send({ answers: [{ taxonomy: "tranche_age", params: { age: 121, handicap: false } }] }),
      postUserScoringRequest().send({ answers: [{ taxonomy: "tranche_age", params: { age: 18, handicap: "false" } }] }),
    ]);

    expect(responses.map((res) => res.status)).toEqual([400, 400]);
    expect(responses.every((res) => res.body.ok === false)).toBe(true);
  });

  it("should return 400 when answer has both value and params or neither", async () => {
    const responses = await Promise.all([
      postUserScoringRequest().send({ answers: [{ taxonomy: "domaine", value: "social_solidarite", params: { age: 18 } }] }),
      postUserScoringRequest().send({ answers: [{ taxonomy: "domaine" }] }),
    ]);

    expect(responses.map((res) => res.status)).toEqual([400, 400]);
    expect(responses.every((res) => res.body.ok === false)).toBe(true);
  });

  it("should create a user scoring with direct values, tranche_age and location params", async () => {
    const res = await postUserScoringRequest().send({
      answers: [taxonomyAnswer, { taxonomy: "tranche_age", params: { age: 18, handicap: false } }, { taxonomy: "location", params: { lat: 48.8566, lon: 2.3522 } }],
    });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(2);

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId: res.body.data.id },
    });
    expect(geo).not.toBeNull();
  });

  it("should return 400 when location lat is out of range", async () => {
    const res = await postUserScoringRequest().send({
      answers: [{ taxonomy: "location", params: { lat: 999, lon: 2.3522 } }],
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when location lon is out of range", async () => {
    const res = await postUserScoringRequest().send({
      answers: [{ taxonomy: "location", params: { lat: 48.8566, lon: 999 } }],
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when location radius_km is invalid", async () => {
    const res = await postUserScoringRequest().send({
      answers: [{ taxonomy: "location", params: { lat: 48.8566, lon: 2.3522, radius_km: 0 } }],
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when location country_code is invalid", async () => {
    const res = await postUserScoringRequest().send({
      answers: [{ taxonomy: "location", params: { lat: 48.8566, lon: 2.3522, country_code: "FRA" } }],
    });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when location uses a value or is duplicated", async () => {
    const responses = await Promise.all([
      postUserScoringRequest().send({ answers: [{ taxonomy: "location", value: "paris" }] }),
      postUserScoringRequest().send({
        answers: [
          { taxonomy: "location", params: { lat: 48.8566, lon: 2.3522 } },
          { taxonomy: "location", params: { lat: 45.764, lon: 4.8357 } },
        ],
      }),
    ]);

    expect(responses.map((res) => res.status)).toEqual([400, 400]);
    expect(responses.every((res) => res.body.ok === false)).toBe(true);
  });

  it("should return 400 when top-level geo is provided", async () => {
    const res = await postUserScoringRequest().send({
      answers: [taxonomyAnswer],
      geo: { lat: 48.8566, lon: 2.3522 },
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe("PUT /user-scoring/:userScoringId", () => {
  const distinctId = "distinct-user-1";
  let taxonomyAnswer: { taxonomy: string; value: string };
  let secondaryTaxonomyAnswer: { taxonomy: string; value: string };

  beforeEach(async () => {
    taxonomyAnswer = { taxonomy: "domaine", value: "social_solidarite" };
    secondaryTaxonomyAnswer = { taxonomy: "type_mission", value: "ponctuelle" };
  });

  const createUserScoring = async (
    params: {
      distinctId?: string;
      answers?: Array<{ taxonomy: string; value?: string; params?: Record<string, unknown> }>;
    } = { distinctId }
  ) => {
    const res = await postUserScoringRequest().send({ answers: params.answers ?? [taxonomyAnswer], distinctId: params.distinctId });

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

  // En production, les emails de missions sont toujours envoyés avec le publisher API Engagement,
  // seul publisher autorisé par la liste newsletter Brevo (subscribeToNewsletter).
  const createEmailPublisher = () => createTestPublisher({ id: PUBLISHER_IDS.API_ENGAGEMENT, name: "Email Publisher" });

  it("should require an api key to send mission emails", async () => {
    const res = await request(app)
      .post("/email/mission")
      .send({
        email: "user@example.com",
        publisherId: "publisher-id",
        missionIds: ["00000000-0000-0000-0000-000000000000"],
      });

    expect(res.status).toBe(401);
  });

  it("should replace existing answers on an existing user scoring", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({ distinctId, answers: [secondaryTaxonomyAnswer] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: { user_scoring_id: userScoringId, created_count: 1, mission_alert_enabled: false },
    });

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
      orderBy: [{ taxonomyKey: "asc" }, { valueKey: "asc" }],
    });
    expect(brevoMock.createOrUpdateContact).not.toHaveBeenCalled();
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();
    expect(values).toHaveLength(1);
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual(["type_mission.ponctuelle"]);
  });

  it("should update missionAlertEnabled without adding answers", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({ distinctId, missionAlertEnabled: true });

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

  it("should replace answers and update missionAlertEnabled in the same request", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({
      distinctId,
      missionAlertEnabled: true,
      answers: [secondaryTaxonomyAnswer],
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
    expect(values).toHaveLength(1);
  });

  it("should replace all existing values with payload values and deduplicate answers", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({
      distinctId,
      answers: [taxonomyAnswer, secondaryTaxonomyAnswer, secondaryTaxonomyAnswer],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.created_count).toBe(2);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
      orderBy: [{ taxonomyKey: "asc" }, { valueKey: "asc" }],
    });
    expect(values).toHaveLength(2);
  });

  it("should reject email fields on the update endpoint", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({
      distinctId,
      email: "user@example.com",
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(brevoMock.createOrUpdateContact).not.toHaveBeenCalled();
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();
  });

  it("should create or update Brevo contact and send matching email from the dedicated endpoint", async () => {
    const userScoringId = await createUserScoring();
    const matching = await createStoredMatchingResult(userScoringId);
    const emailPublisher = await createEmailPublisher();

    await putUserScoringRequest(userScoringId).send({ distinctId, missionAlertEnabled: true }).expect(200);

    const res = await postMissionEmailRequest().send({
      distinctId,
      email: " USER@EXAMPLE.COM ",
      publisherId: emailPublisher.id,
      userScoringId,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: {
        user_scoring_id: userScoringId,
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
    const [templateId, payload] = brevoMock.sendTemplate.mock.calls[0];
    expect(templateId).toBe(0);
    expect(payload.emailTo).toEqual(["user@example.com"]);
    expect(payload.tags).toEqual(["user-scoring", "mission-matching-results"]);

    const { contentHtml } = payload.params;
    matching.missions.slice(0, 5).forEach((mission) => {
      expect(contentHtml).toContain(mission.title);
      expect(contentHtml).toContain(mission.city);
      expect(contentHtml).toContain(`http://localhost:4000/r/email/${mission.id}/${emailPublisher.id}?user_scoring_id=${userScoringId}`);
    });
    expect(contentHtml).toContain("8 mois");
    expect(contentHtml).toContain("à partir du 2 février");
    expect(contentHtml).toContain("620€ par mois");

    const userScoring = await prisma.userScoring.findUniqueOrThrow({
      where: { id: userScoringId },
    });
    expect(userScoring.distinctId).toBe(distinctId);
    expect("email" in userScoring).toBe(false);
  });

  it("should send matching email with the city from the matched mission address", async () => {
    const userScoringId = await createUserScoring();
    const publisher = await createTestPublisher({ name: "Matching Publisher" });
    const emailPublisher = await createEmailPublisher();
    const mission = await createTestMission({
      compensationAmount: 620,
      compensationUnit: "month",
      duration: 8,
      endAt: new Date("2026-01-10T00:00:00.000Z"),
      organizationName: "Multi Address Organization",
      organizationClientId: "multi-address-organization",
      publisherId: publisher.id,
      startAt: new Date("2026-02-02T00:00:00.000Z"),
      title: "Multi Address Mission",
      addresses: [
        {
          city: "Oldest City",
          country: "France",
          location: { lat: 48.8566, lon: 2.3522 },
        },
        {
          city: "Matched City",
          country: "France",
          location: { lat: 45.764, lon: 4.8357 },
        },
      ],
    });
    const addresses = await prisma.missionAddress.findMany({ where: { missionId: mission.id } });
    const matchedAddress = addresses.find((address) => address.city === "Matched City");
    if (!matchedAddress) {
      throw new Error("Expected matched address to be created");
    }

    const enrichment = await prisma.missionEnrichment.create({
      data: {
        missionId: mission.id,
        status: "completed",
        promptVersion: "test-matched-address",
        completedAt: new Date(),
      },
    });
    const scoring = await prisma.missionScoring.create({
      data: {
        missionId: mission.id,
        missionEnrichmentId: enrichment.id,
      },
    });
    await prisma.missionMatchingResult.create({
      data: {
        userScoringId,
        matchingEngineVersion: "m1",
        results: [{ missionScoringId: scoring.id, missionAddressId: matchedAddress.id, taxonomyScores: {} }],
      },
    });

    const res = await postMissionEmailRequest().send({
      distinctId,
      email: "user@example.com",
      publisherId: emailPublisher.id,
      userScoringId,
    });

    expect(res.status).toBe(200);
    expect(brevoMock.sendTemplate).toHaveBeenCalledTimes(1);
    expect(brevoMock.sendTemplate.mock.calls[0][1].params.contentHtml).toContain("Matched City");
  });

  it("should send mission emails without user scoring when missionIds are provided", async () => {
    const publisher = await createTestPublisher({ name: "Single Mission Publisher" });
    const emailPublisher = await createEmailPublisher();
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

    const res = await postMissionEmailRequest().send({
      email: "user@example.com",
      publisherId: emailPublisher.id,
      missionIds: [mission.id],
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: {
        email_sent: true,
      },
    });

    expect(brevoMock.createOrUpdateContact).not.toHaveBeenCalled();
    expect(brevoMock.sendTemplate).toHaveBeenCalledTimes(1);
    const [templateId, payload] = brevoMock.sendTemplate.mock.calls[0];
    expect(templateId).toBe(0);
    expect(payload.emailTo).toEqual(["user@example.com"]);
    expect(payload.tags).toEqual(["user-scoring", "mission-matching-results"]);

    const { contentHtml } = payload.params;
    expect(contentHtml).toContain(mission.title);
    expect(contentHtml).toContain("Paris");
    expect(contentHtml).toContain("8 mois");
    expect(contentHtml).toContain("à partir du 2 février");
    expect(contentHtml).toContain("620€ par mois");
    expect(contentHtml).toContain(`http://localhost:4000/r/email/${mission.id}/${emailPublisher.id}`);
  });

  it("should skip mission email when missionIds are not found", async () => {
    const emailPublisher = await createEmailPublisher();

    const res = await postMissionEmailRequest().send({
      email: "user@example.com",
      publisherId: emailPublisher.id,
      missionIds: ["00000000-0000-0000-0000-000000000000"],
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: {
        email_sent: false,
        email_skip_reason: "MISSION_NOT_FOUND",
      },
    });
    expect(brevoMock.createOrUpdateContact).not.toHaveBeenCalled();
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();
  });

  it("should skip matching email when no matching result is stored", async () => {
    const userScoringId = await createUserScoring();
    const emailPublisher = await createEmailPublisher();

    const res = await postMissionEmailRequest().send({
      distinctId,
      email: "user@example.com",
      publisherId: emailPublisher.id,
      userScoringId,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: {
        user_scoring_id: userScoringId,
        email_sent: false,
        email_skip_reason: "NO_MATCHING_RESULT",
      },
    });
    expect(brevoMock.createOrUpdateContact).toHaveBeenCalledTimes(1);
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();
  });

  it("should return 403 when sending an email with an invalid distinctId", async () => {
    const userScoringId = await createUserScoring();
    await createStoredMatchingResult(userScoringId);
    const emailPublisher = await createEmailPublisher();

    const res = await postMissionEmailRequest().send({
      distinctId: "another-distinct-user",
      email: "user@example.com",
      publisherId: emailPublisher.id,
      userScoringId,
    });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(brevoMock.createOrUpdateContact).not.toHaveBeenCalled();
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();
  });

  it("should return 502 when Brevo contact creation fails", async () => {
    const userScoringId = await createUserScoring();
    await createStoredMatchingResult(userScoringId);
    const emailPublisher = await createEmailPublisher();
    brevoMock.createOrUpdateContact.mockResolvedValueOnce({ ok: false, data: { message: "contact failed" } });

    const res = await postMissionEmailRequest().send({
      distinctId,
      email: "user@example.com",
      publisherId: emailPublisher.id,
      userScoringId,
    });

    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({
      ok: false,
      code: "EMAIL_SEND_FAILED",
      data: {
        user_scoring_id: userScoringId,
        email_sent: false,
      },
    });
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();

    const userScoring = await prisma.userScoring.findUniqueOrThrow({ where: { id: userScoringId } });
    expect(userScoring.distinctId).toBe(distinctId);
  });

  it("should return 502 when Brevo transactional email fails", async () => {
    const userScoringId = await createUserScoring();
    await createStoredMatchingResult(userScoringId);
    const emailPublisher = await createEmailPublisher();
    brevoMock.sendTemplate.mockResolvedValueOnce({ ok: false, data: { message: "template failed" } });

    const res = await postMissionEmailRequest().send({
      distinctId,
      email: "user@example.com",
      publisherId: emailPublisher.id,
      userScoringId,
    });

    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({
      ok: false,
      code: "EMAIL_SEND_FAILED",
      data: {
        user_scoring_id: userScoringId,
        email_sent: false,
      },
    });
    expect(brevoMock.createOrUpdateContact).toHaveBeenCalledTimes(1);
    expect(brevoMock.sendTemplate).toHaveBeenCalledTimes(1);
  });

  it("should replace existing values for a direct taxonomy", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({
      distinctId,
      answers: [{ taxonomy: "domaine", value: "sante_soins" }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.created_count).toBe(1);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
    });
    expect(values).toHaveLength(1);
    expect(values[0].taxonomyKey).toBe("domaine");
    expect(values[0].valueKey).toBe("sante_soins");
  });

  it("should replace existing values with resolved tranche_age answers", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({
      distinctId,
      answers: [{ taxonomy: "tranche_age", params: { age: 18, handicap: false } }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.created_count).toBe(1);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
    });
    expect(values).toHaveLength(1);
  });

  it("should replace existing tranche_age values when age changes", async () => {
    const userScoringId = await createUserScoring();

    const firstRes = await putUserScoringRequest(userScoringId).send({
      distinctId,
      answers: [{ taxonomy: "tranche_age", params: { age: 18, handicap: false } }],
    });
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.data.created_count).toBe(1);

    const secondRes = await putUserScoringRequest(userScoringId).send({
      distinctId,
      answers: [{ taxonomy: "tranche_age", params: { age: 70, handicap: false } }],
    });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.created_count).toBe(1);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
      orderBy: [{ taxonomyKey: "asc" }, { valueKey: "asc" }],
    });
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual(["tranche_age.entre_68_72_ans"]);
  });

  it("should delete existing geo when answers do not include location", async () => {
    const userScoringId = await createUserScoring({
      distinctId,
      answers: [taxonomyAnswer, { taxonomy: "location", params: { lat: 48.8566, lon: 2.3522 } }],
    });

    const res = await putUserScoringRequest(userScoringId).send({
      distinctId,
      answers: [secondaryTaxonomyAnswer],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.created_count).toBe(1);

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId },
    });
    expect(geo).toBeNull();
  });

  it("should keep existing geo when update does not include answers", async () => {
    const userScoringId = await createUserScoring({
      distinctId,
      answers: [taxonomyAnswer, { taxonomy: "location", params: { lat: 48.8566, lon: 2.3522 } }],
    });

    const res = await putUserScoringRequest(userScoringId).send({ distinctId, missionAlertEnabled: true });

    expect(res.status).toBe(200);

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId },
    });
    expect(geo).not.toBeNull();
    expect(geo!.lat).toBe(48.8566);
    expect(geo!.lon).toBe(2.3522);
  });

  it("should update geo from location params", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({
      distinctId,
      answers: [{ taxonomy: "location", params: { lat: 48.8566, lon: 2.3522, radius_km: 25, country_code: "FR" } }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.created_count).toBe(0);

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId },
    });
    expect(geo).not.toBeNull();
    expect(geo!.lat).toBe(48.8566);
    expect(geo!.lon).toBe(2.3522);
    expect(geo!.radiusKm).toBe(25);
    expect(geo!.countryCode).toBe("FR");

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
    });
    expect(values).toHaveLength(0);
  });

  it("should accept an update with only location params", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({
      distinctId,
      answers: [{ taxonomy: "location", params: { lat: 45.764, lon: 4.8357 } }],
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: { user_scoring_id: userScoringId, created_count: 0, mission_alert_enabled: false },
    });
  });

  it("should return 400 when added answers are invalid", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({ distinctId, answers: [{ taxonomy: "domaine", value: "does_not_exist" }] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when no update field is provided", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({ distinctId });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when email is invalid", async () => {
    const emailPublisher = await createEmailPublisher();

    const res = await postMissionEmailRequest().send({ email: "not-an-email", publisherId: emailPublisher.id, missionIds: ["00000000-0000-0000-0000-000000000000"] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(brevoMock.createOrUpdateContact).not.toHaveBeenCalled();
    expect(brevoMock.sendTemplate).not.toHaveBeenCalled();
  });

  it("should return 400 when top-level geo is provided on update", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({ distinctId, geo: { lat: 48.8566, lon: 2.3522 } });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when distinctId is missing", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({ answers: [secondaryTaxonomyAnswer] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 403 when distinctId does not match the user scoring", async () => {
    const userScoringId = await createUserScoring();

    const res = await putUserScoringRequest(userScoringId).send({ distinctId: "another-distinct-user", answers: [secondaryTaxonomyAnswer] });

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

    const res = await putUserScoringRequest(userScoringId).send({ distinctId, answers: [secondaryTaxonomyAnswer] });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when userScoringId is not a uuid", async () => {
    const res = await putUserScoringRequest("not-a-uuid").send({ distinctId, answers: [taxonomyAnswer] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 404 when user scoring does not exist", async () => {
    const res = await putUserScoringRequest("00000000-0000-4000-8000-000000000000").send({ distinctId, answers: [taxonomyAnswer] });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });
});
