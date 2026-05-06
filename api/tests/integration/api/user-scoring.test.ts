import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/db/postgres";
import { createTestApp } from "../../testApp";

const app = createTestApp();

describe("POST /user-scoring", () => {
  let taxonomyAnswer: { taxonomy: string; value: string };
  let secondaryTaxonomyAnswer: { taxonomy: string; value: string };

  beforeEach(async () => {
    taxonomyAnswer = { taxonomy: "domaine", value: "social_solidarite" };
    secondaryTaxonomyAnswer = { taxonomy: "type_mission", value: "ponctuelle" };
  });

  // ─── Success cases ──────────────────────────────────────────────────────────

  it("should create a user scoring with one answer (no geo)", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [taxonomyAnswer] });

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

  it("should create a user scoring with location params (lat/lon only)", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
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
    const res = await request(app)
      .post("/user-scoring")
      .send({
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
    const res = await request(app)
      .post("/user-scoring")
      .send({
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
    const res = await request(app)
      .post("/user-scoring")
      .send({
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
    const res = await request(app)
      .post("/user-scoring")
      .send({
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
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [taxonomyAnswer, taxonomyAnswer],
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
      .send({ answers: [taxonomyAnswer] });

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

  it("should create a user scoring from tranche_age params", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy: "tranche_age", params: { age: 18, handicap: false } }],
      });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
      orderBy: [{ valueKey: "asc" }],
    });
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual([
      "tranche_age.entre_16_67_ans",
      "tranche_age.entre_17_72_ans",
      "tranche_age.moins_26_ans",
    ]);
  });

  it("should create a user scoring with handicap tranche_age params", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy: "tranche_age", params: { age: 30, handicap: true } }],
      });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
      orderBy: [{ valueKey: "asc" }],
    });
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual([
      "tranche_age.entre_16_67_ans",
      "tranche_age.entre_17_72_ans",
      "tranche_age.moins_31_ans_handicap",
    ]);
  });

  it("should deduplicate direct and resolved answers", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [
          { taxonomy: "tranche_age", value: "moins_26_ans" },
          { taxonomy: "tranche_age", params: { age: 18, handicap: false } },
        ],
      });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(3);
  });

  it("should return 400 when taxonomy is unknown", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy: "unknown", value: "sante_soins" }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when taxonomy value is unknown", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy: "domaine", value: "does_not_exist" }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when params target a taxonomy without transformer", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy: "domaine", params: { age: 18 } }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when tranche_age params are invalid", async () => {
    const responses = await Promise.all([
      request(app)
        .post("/user-scoring")
        .send({ answers: [{ taxonomy: "tranche_age", params: { age: 121, handicap: false } }] }),
      request(app)
        .post("/user-scoring")
        .send({ answers: [{ taxonomy: "tranche_age", params: { age: 18, handicap: "false" } }] }),
    ]);

    expect(responses.map((res) => res.status)).toEqual([400, 400]);
    expect(responses.every((res) => res.body.ok === false)).toBe(true);
  });

  it("should return 400 when answer has both value and params or neither", async () => {
    const responses = await Promise.all([
      request(app)
        .post("/user-scoring")
        .send({ answers: [{ taxonomy: "domaine", value: "social_solidarite", params: { age: 18 } }] }),
      request(app)
        .post("/user-scoring")
        .send({ answers: [{ taxonomy: "domaine" }] }),
    ]);

    expect(responses.map((res) => res.status)).toEqual([400, 400]);
    expect(responses.every((res) => res.body.ok === false)).toBe(true);
  });

  it("should create a user scoring with direct values, tranche_age and location params", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [
          taxonomyAnswer,
          { taxonomy: "tranche_age", params: { age: 18, handicap: false } },
          { taxonomy: "location", params: { lat: 48.8566, lon: 2.3522 } },
        ],
      });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(4);

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId: res.body.data.id },
    });
    expect(geo).not.toBeNull();
  });

  it("should return 400 when location lat is out of range", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy: "location", params: { lat: 999, lon: 2.3522 } }],
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when location lon is out of range", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy: "location", params: { lat: 48.8566, lon: 999 } }],
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when location radius_km is invalid", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy: "location", params: { lat: 48.8566, lon: 2.3522, radius_km: 0 } }],
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when location country_code is invalid", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy: "location", params: { lat: 48.8566, lon: 2.3522, country_code: "FRA" } }],
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when location uses a value or is duplicated", async () => {
    const responses = await Promise.all([
      request(app)
        .post("/user-scoring")
        .send({ answers: [{ taxonomy: "location", value: "paris" }] }),
      request(app)
        .post("/user-scoring")
        .send({
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
    const res = await request(app)
      .post("/user-scoring")
      .send({
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
    } = { distinctId },
  ) => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: params.answers ?? [taxonomyAnswer], distinctId: params.distinctId });

    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };

  it("should replace existing answers on an existing user scoring", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({ distinctId, answers: [secondaryTaxonomyAnswer] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      data: { user_scoring_id: userScoringId, created_count: 1, mission_alert_enabled: false },
    });

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
      orderBy: [{ taxonomyKey: "asc" }, { valueKey: "asc" }],
    });
    expect(values).toHaveLength(1);
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual(["type_mission.ponctuelle"]);
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

  it("should replace answers and update missionAlertEnabled in the same request", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
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

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
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
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual(["domaine.social_solidarite", "type_mission.ponctuelle"]);
  });

  it("should replace existing values for a direct taxonomy", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
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

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
        distinctId,
        answers: [{ taxonomy: "tranche_age", params: { age: 18, handicap: false } }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.created_count).toBe(3);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
    });
    expect(values).toHaveLength(3);
  });

  it("should replace existing tranche_age values when age changes", async () => {
    const userScoringId = await createUserScoring();

    const firstRes = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
        distinctId,
        answers: [{ taxonomy: "tranche_age", params: { age: 18, handicap: false } }],
      });
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.data.created_count).toBe(3);

    const secondRes = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
        distinctId,
        answers: [{ taxonomy: "tranche_age", params: { age: 70, handicap: false } }],
      });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.created_count).toBe(1);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
      orderBy: [{ taxonomyKey: "asc" }, { valueKey: "asc" }],
    });
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual(["tranche_age.entre_17_72_ans"]);
  });

  it("should delete existing geo when answers do not include location", async () => {
    const userScoringId = await createUserScoring({
      distinctId,
      answers: [taxonomyAnswer, { taxonomy: "location", params: { lat: 48.8566, lon: 2.3522 } }],
    });

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
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

    const res = await request(app).put(`/user-scoring/${userScoringId}`).send({ distinctId, missionAlertEnabled: true });

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

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
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

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({
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

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({ distinctId, answers: [{ taxonomy: "domaine", value: "does_not_exist" }] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when no update field is provided", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app).put(`/user-scoring/${userScoringId}`).send({ distinctId });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when top-level geo is provided on update", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({ distinctId, geo: { lat: 48.8566, lon: 2.3522 } });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when distinctId is missing", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({ answers: [secondaryTaxonomyAnswer] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 403 when distinctId does not match the user scoring", async () => {
    const userScoringId = await createUserScoring();

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({ distinctId: "another-distinct-user", answers: [secondaryTaxonomyAnswer] });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId },
    });
    expect(values).toHaveLength(1);
  });

  it("should return 403 when user scoring has no distinctId", async () => {
    const userScoringId = await createUserScoring({ distinctId: undefined });

    const res = await request(app)
      .put(`/user-scoring/${userScoringId}`)
      .send({ distinctId, answers: [secondaryTaxonomyAnswer] });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when userScoringId is not a uuid", async () => {
    const res = await request(app)
      .put("/user-scoring/not-a-uuid")
      .send({ distinctId, answers: [taxonomyAnswer] });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 404 when user scoring does not exist", async () => {
    const res = await request(app)
      .put("/user-scoring/00000000-0000-4000-8000-000000000000")
      .send({ distinctId, answers: [taxonomyAnswer] });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });
});
