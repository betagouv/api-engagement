import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { type TaxonomyValueKey } from "@engagement/taxonomy";
import { prisma } from "@/db/postgres";
import { createTestApp } from "../../testApp";

const app = createTestApp();

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
    expect(values.map((value) => `${value.taxonomyKey}.${value.valueKey}`)).toEqual([
      "domaine.social_solidarite",
      "type_mission.ponctuelle",
    ]);
  });

  it("should deduplicate answers with repeated taxonomy_value_key", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [
          { taxonomy_value_key: taxonomyValueKey },
          { taxonomy_value_key: taxonomyValueKey },
        ],
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

  it("should return 400 when taxonomy_value_key has no dot separator", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy_value_key: "nodotinkey" }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when taxonomy_value_key does not exist in package", async () => {
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
