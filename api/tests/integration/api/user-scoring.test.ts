import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/db/postgres";
import { createTestApp } from "../../testApp";

const app = createTestApp();

let _valueCounter = 0;
const createTaxonomyValue = async (opts: { active?: boolean } = {}) => {
  const taxonomy = await prisma.taxonomy.upsert({
    where: { key: "domaine" },
    update: {},
    create: { key: "domaine", label: "Domaine", type: "multi_value" },
  });
  return prisma.taxonomyValue.create({
    data: {
      taxonomyId: taxonomy.id,
      key: `value_${++_valueCounter}`,
      label: `Value ${_valueCounter}`,
      active: opts.active ?? true,
    },
  });
};

describe("POST /user-scoring", () => {
  let taxonomyValueId: string;

  beforeEach(async () => {
    const tv = await createTaxonomyValue();
    taxonomyValueId = tv.id;
  });

  // ─── Success cases ──────────────────────────────────────────────────────────

  it("should create a user scoring with one answer (no geo)", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy_value_id: taxonomyValueId }] });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.created_at).toBeDefined();

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(1);
    expect(values[0].score).toBe(1.0);
    expect(values[0].taxonomyValueId).toBe(taxonomyValueId);

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId: res.body.data.id },
    });
    expect(geo).toBeNull();
  });

  it("should create a user scoring with geo (lat/lon only)", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_id: taxonomyValueId }],
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
        answers: [{ taxonomy_value_id: taxonomyValueId }],
        geo: { lat: 48.8566, lon: 2.3522, radius_km: 50 },
      });

    expect(res.status).toBe(201);

    const geo = await prisma.userScoringGeo.findUnique({
      where: { userScoringId: res.body.data.id },
    });
    expect(geo!.radiusKm).toBe(50);
  });

  it("should create a user scoring with multiple answers", async () => {
    const tv2 = await createTaxonomyValue();

    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_id: taxonomyValueId }, { taxonomy_value_id: tv2.id }],
      });

    expect(res.status).toBe(201);

    const values = await prisma.userScoringValue.findMany({
      where: { userScoringId: res.body.data.id },
    });
    expect(values).toHaveLength(2);
  });

  it("should deduplicate answers with repeated taxonomy_value_id", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [
          { taxonomy_value_id: taxonomyValueId },
          { taxonomy_value_id: taxonomyValueId },
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
      .send({ answers: [{ taxonomy_value_id: taxonomyValueId }] });

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

  it("should return 400 when taxonomy_value_id is not a valid UUID", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy_value_id: "not-a-uuid" }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when taxonomy_value_id does not exist in DB", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy_value_id: "00000000-0000-0000-0000-000000000000" }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when taxonomy_value_id is inactive", async () => {
    const inactiveTv = await createTaxonomyValue({ active: false });

    const res = await request(app)
      .post("/user-scoring")
      .send({ answers: [{ taxonomy_value_id: inactiveTv.id }] });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when geo.lat is out of range", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_id: taxonomyValueId }],
        geo: { lat: 999, lon: 2.3522 },
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 when geo.lon is out of range", async () => {
    const res = await request(app)
      .post("/user-scoring")
      .send({
        answers: [{ taxonomy_value_id: taxonomyValueId }],
        geo: { lat: 48.8566, lon: 999 },
      });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});
