import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createTestPublisher } from "../../fixtures";
import { createTestUser } from "../../fixtures/user";
import { createTestApp } from "../../testApp";

const app = createTestApp();

/**
 * Tests d'accès aux endpoints dashboard pour les utilisateurs role: "user".
 *
 * Objectif : s'assurer qu'aucun de ces endpoints ne retourne 401 ou 403 avec un token user valide.
 * Une régression (endpoint qui devient admin-only) ferait échouer ces tests avant d'atteindre le frontend.
 *
 * Chaque test vérifie uniquement le statut d'authentification/autorisation (≠ 401, ≠ 403).
 * Les statuts 200, 404, etc. sont acceptables — ils prouvent que l'authentification a réussi.
 */
describe("Endpoints accessibles aux users (≠ 401, ≠ 403)", () => {
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

  it("GET /user/refresh", async () => {
    const res = await request(app).get(`/user/refresh?publisherId=${publisherId}`).set(authHeader());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("PUT /user", async () => {
    const res = await request(app).put("/user").set(authHeader()).send({ firstname: "Test" });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /publisher/search", async () => {
    const res = await request(app).post("/publisher/search").set(authHeader()).send({});
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("GET /publisher/:id", async () => {
    const res = await request(app).get(`/publisher/${publisherId}`).set(authHeader());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /campaign/search", async () => {
    const res = await request(app).post("/campaign/search").set(authHeader()).send({});
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /widget/search", async () => {
    const res = await request(app).post("/widget/search").set(authHeader()).send({});
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /mission/search", async () => {
    const res = await request(app).post("/mission/search").set(authHeader()).send({});
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /moderation/search", async () => {
    // moderatorId est requis — on passe le publisher créé en test (moderator: true)
    const res = await request(app).post("/moderation/search").set(authHeader()).send({ moderatorId: publisherId });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /import/search", async () => {
    // publisherId requis pour les users (vérification d'autorisation côté controller)
    const res = await request(app).post("/import/search").set(authHeader()).send({ publisherId });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /stats/search", async () => {
    const res = await request(app).post("/stats/search").set(authHeader()).send({ fromPublisherId: publisherId });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("GET /warning/state", async () => {
    const res = await request(app).get("/warning/state").set(authHeader());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("POST /warning/search", async () => {
    // publisherId requis pour les users (vérification d'autorisation côté controller)
    const res = await request(app).post("/warning/search").set(authHeader()).send({ publisherId });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
