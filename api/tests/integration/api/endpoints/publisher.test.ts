import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PUBLISHER_IDS } from "@/config";
import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { PublisherMissionType } from "@/types/publisher";

import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp({ auditLogs: true });

const getAuditLogs = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.map((call: unknown[]) => JSON.parse(String(call[0]))).filter((log: { type?: string }) => log.type === "security_audit");

describe("Dashboard publisher controller", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let token: string;
  let publisherId: string;

  beforeEach(async () => {
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const publisher = await createTestPublisher({ moderator: true });
    publisherId = publisher.id;
    const { token: userToken } = await createTestUser({ role: "user", publishers: [publisherId] });
    token = userToken;
  });

  const authHeader = () => ({ Authorization: `jwt ${token}` });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows POST /publisher/search for an authenticated user", async () => {
    const res = await request(app).post("/publisher/search").set(authHeader()).send({});

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("creates scope roots on POST /publisher and returns publishers[] derived from rules", async () => {
    const { token: adminToken } = await createTestUser({ role: "admin" });
    const annonceur = await createTestPublisher({ name: "Annonceur A", isAnnonceur: true, moderator: true });

    const res = await request(app)
      .post("/publisher")
      .set({ Authorization: `jwt ${adminToken}` })
      .send({ name: "Diffuseur D", hasApiRights: true, publishers: [{ publisherId: annonceur.id }] });

    expect(res.status).toBe(200);
    expect(res.body.data.publishers).toHaveLength(1);
    expect(res.body.data.publishers[0]).toMatchObject({
      publisherId: annonceur.id,
      publisherName: "Annonceur A",
      moderator: true,
      missionType: PublisherMissionType.BENEVOLAT,
    });

    const roots = await publisherDiffusionRuleService.findRules({ publisherId: res.body.data.id, combinedWithId: null });
    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({ field: "publisherId", operator: "is", value: annonceur.id });
  });

  it("filters POST /publisher/search by diffuseursOf using scope roots", async () => {
    const { token: adminToken } = await createTestUser({ role: "admin" });
    const annonceur = await createTestPublisher({ name: "Annonceur" });
    const diffuseur = await createTestPublisher({ name: "Diffuseur 1", publishers: [{ publisherId: annonceur.id }] });
    await createTestPublisher({ name: "Diffuseur 2" });

    const res = await request(app)
      .post("/publisher/search")
      .set({ Authorization: `jwt ${adminToken}` })
      .send({ diffuseursOf: annonceur.id });

    expect(res.status).toBe(200);
    expect(res.body.data.map((publisher: { id: string }) => publisher.id)).toEqual([diffuseur.id]);
  });

  it("allows GET /publisher/:id for an accessible publisher", async () => {
    const res = await request(app).get(`/publisher/${publisherId}`).set(authHeader());

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("allows GET /publisher/:id for an annonceur linked to an accessible diffuseur", async () => {
    const annonceur = await createTestPublisher({ name: "Annonceur linked" });
    const diffuseur = await createTestPublisher({ name: "Diffuseur linked", publishers: [{ publisherId: annonceur.id }] });
    const { token: userToken } = await createTestUser({ role: "user", publishers: [diffuseur.id] });

    const res = await request(app)
      .get(`/publisher/${annonceur.id}`)
      .set({ Authorization: `jwt ${userToken}` });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(annonceur.id);
  });

  it("rejects POST /publisher/:id/apikey for another publisher", async () => {
    const otherPublisher = await createTestPublisher();

    const res = await request(app).post(`/publisher/${otherPublisher.id}/apikey`).set(authHeader());

    expect(res.status).toBe(403);
  });

  it("rejects POST /publisher/:id/image for another publisher", async () => {
    const otherPublisher = await createTestPublisher();

    const res = await request(app).post(`/publisher/${otherPublisher.id}/image`).set(authHeader()).attach("files", Buffer.from("logo"), "logo.png");

    expect(res.status).toBe(403);
  });

  it("rejects GET /publisher/:id/diffusion-rules for another publisher", async () => {
    const otherPublisher = await createTestPublisher();

    const res = await request(app).get(`/publisher/${otherPublisher.id}/diffusion-rules`).set(authHeader());

    expect(res.status).toBe(403);
  });

  it("rejects GET /publisher/:id/moderated for another publisher", async () => {
    const otherPublisher = await createTestPublisher();

    const res = await request(app).get(`/publisher/${otherPublisher.id}/moderated`).set(authHeader());

    expect(res.status).toBe(403);
  });

  it("logs an audit event when regenerating a publisher API key", async () => {
    const res = await request(app).post(`/publisher/${publisherId}/apikey`).set(authHeader()).set("x-request-id", "request-api-key");

    expect(res.status).toBe(200);
    expect(JSON.stringify(getAuditLogs(consoleInfoSpy))).not.toContain(res.body.data);
    expect(getAuditLogs(consoleInfoSpy)).toContainEqual(
      expect.objectContaining({
        type: "security_audit",
        action: "publisher.api_key.regenerate",
        outcome: "success",
        actor: expect.objectContaining({ type: "user" }),
        target: { type: "publisher", id: publisherId },
        request_id: "request-api-key",
        status: 200,
      })
    );
  });

  it("logs an audit event when updating a publisher", async () => {
    const { token: adminToken } = await createTestUser({ role: "admin" });

    const res = await request(app)
      .put(`/publisher/${publisherId}`)
      .set({ Authorization: `jwt ${adminToken}` })
      .set("x-request-id", "request-publisher-update")
      .send({
        name: "Updated publisher",
      });

    expect(res.status).toBe(200);
    expect(getAuditLogs(consoleInfoSpy)).toContainEqual(
      expect.objectContaining({
        type: "security_audit",
        action: "publisher.update",
        outcome: "success",
        actor: expect.objectContaining({ type: "user", role: "admin" }),
        target: { type: "publisher", id: publisherId },
        request_id: "request-publisher-update",
        status: 200,
        metadata: { fields: ["name"] },
      })
    );
  });

  it("preserves child rules of kept roots when PUT /publisher/:id changes the partner list", async () => {
    const { token: adminToken } = await createTestUser({ role: "admin" });
    const annonceur1 = await createTestPublisher({ name: "Annonceur 1" });
    const annonceur2 = await createTestPublisher({ name: "Annonceur 2" });
    const diffuseur = await createTestPublisher({ name: "Diffuseur", publishers: [{ publisherId: annonceur1.id }] });

    const rootBefore = (await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, combinedWithId: null }))[0];
    const child = await publisherDiffusionRuleService.createScopedRule({
      diffuseurPublisherId: diffuseur.id,
      annonceurPublisherId: annonceur1.id,
      field: "publisherOrganization.clientId",
      operator: "is_not",
      value: "org-1",
    });

    const res = await request(app)
      .put(`/publisher/${diffuseur.id}`)
      .set({ Authorization: `jwt ${adminToken}` })
      .send({ publishers: [{ publisherId: annonceur1.id }, { publisherId: annonceur2.id }] });

    expect(res.status).toBe(200);
    expect(res.body.data.publishers).toHaveLength(2);

    const rules = await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id });
    const roots = rules.filter((rule) => rule.combinedWithId === null);
    expect(roots.map((rule) => rule.value).sort()).toEqual([annonceur1.id, annonceur2.id].sort());
    expect(roots.find((rule) => rule.value === annonceur1.id)?.id).toBe(rootBefore.id);
    expect(rules.find((rule) => rule.id === child.id)).toBeDefined();
  });

  it("deletes the root and its child rules when PUT /publisher/:id removes a partner", async () => {
    const { token: adminToken } = await createTestUser({ role: "admin" });
    const annonceur = await createTestPublisher({ name: "Annonceur" });
    const diffuseur = await createTestPublisher({ name: "Diffuseur", publishers: [{ publisherId: annonceur.id }] });
    await publisherDiffusionRuleService.createScopedRule({
      diffuseurPublisherId: diffuseur.id,
      annonceurPublisherId: annonceur.id,
      field: "publisherOrganization.clientId",
      operator: "is_not",
      value: "org-1",
    });

    const res = await request(app)
      .put(`/publisher/${diffuseur.id}`)
      .set({ Authorization: `jwt ${adminToken}` })
      .send({ publishers: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.publishers).toHaveLength(0);
    expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id })).toHaveLength(0);
  });

  it("clears all scope roots when PUT /publisher/:id disables diffusion rights", async () => {
    const { token: adminToken } = await createTestUser({ role: "admin" });
    const annonceur = await createTestPublisher({ name: "Annonceur" });
    const diffuseur = await createTestPublisher({ name: "Diffuseur", publishers: [{ publisherId: annonceur.id }] });

    const res = await request(app)
      .put(`/publisher/${diffuseur.id}`)
      .set({ Authorization: `jwt ${adminToken}` })
      .send({ hasApiRights: false, hasWidgetRights: false, hasCampaignRights: false });

    expect(res.status).toBe(200);
    expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, combinedWithId: null })).toHaveLength(0);
  });

  it("returns true from GET /publisher/:id/moderated when JVA has a scope root for the publisher", async () => {
    const moderated = await createTestPublisher({ name: "Annonceur modéré" });
    const other = await createTestPublisher({ name: "Annonceur non modéré" });
    await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER, name: "JeVeuxAider", publishers: [{ publisherId: moderated.id }] });
    const { token: userToken } = await createTestUser({ role: "user", publishers: [moderated.id, other.id] });

    const resModerated = await request(app)
      .get(`/publisher/${moderated.id}/moderated`)
      .set({ Authorization: `jwt ${userToken}` });
    const resOther = await request(app)
      .get(`/publisher/${other.id}/moderated`)
      .set({ Authorization: `jwt ${userToken}` });

    expect(resModerated.status).toBe(200);
    expect(resModerated.body.data).toBe(true);
    expect(resOther.status).toBe(200);
    expect(resOther.body.data).toBe(false);
  });

  it("rejects POST /publisher with an unknown diffusion partner id", async () => {
    const { token: adminToken } = await createTestUser({ role: "admin" });

    const res = await request(app)
      .post("/publisher")
      .set({ Authorization: `jwt ${adminToken}` })
      .send({ name: "Diffuseur unknown partner", hasApiRights: true, publishers: [{ publisherId: "unknown-publisher-id" }] });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_BODY");
    await expect(publisherService.findOnePublisherByName("Diffuseur unknown partner")).resolves.toBeNull();
    expect(await publisherDiffusionRuleService.findRules({ value: "unknown-publisher-id" })).toHaveLength(0);
  });

  it("rejects PUT /publisher/:id with an unknown diffusion partner id without partial update", async () => {
    const { token: adminToken } = await createTestUser({ role: "admin" });
    const annonceur = await createTestPublisher({ name: "Annonceur existing" });
    const diffuseur = await createTestPublisher({ name: "Diffuseur before unknown partner", publishers: [{ publisherId: annonceur.id }] });

    const res = await request(app)
      .put(`/publisher/${diffuseur.id}`)
      .set({ Authorization: `jwt ${adminToken}` })
      .send({ name: "Diffuseur after unknown partner", publishers: [{ publisherId: "unknown-publisher-id" }] });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_BODY");

    const persisted = await publisherService.findOnePublisherById(diffuseur.id);
    expect(persisted?.name).toBe("Diffuseur before unknown partner");
    expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, combinedWithId: null })).toHaveLength(1);
    expect(await publisherDiffusionRuleService.findRules({ value: "unknown-publisher-id" })).toHaveLength(0);
  });
});
