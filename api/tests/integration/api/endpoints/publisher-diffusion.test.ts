import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { PUBLISHER_IDS } from "@/config";
import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { PublisherMissionType } from "@/types/publisher";

import { createTestPublisher } from "../../../fixtures";
import { createTestUser } from "../../../fixtures/user";
import { createTestApp } from "../../../testApp";

const app = createTestApp();

describe("Publisher diffusions (dérivées des diffusion rules)", () => {
  let adminToken: string;

  beforeEach(async () => {
    const { token } = await createTestUser({ role: "admin" });
    adminToken = token;
  });

  const adminHeader = () => ({ Authorization: `jwt ${adminToken}` });

  describe("POST /publisher", () => {
    it("creates scope roots and returns publishers[] derived from rules", async () => {
      const annonceur = await createTestPublisher({ name: "Annonceur A", isAnnonceur: true, moderator: true });

      const res = await request(app)
        .post("/publisher")
        .set(adminHeader())
        .send({ name: "Diffuseur D", hasApiRights: true, publishers: [{ publisherId: annonceur.id }] });

      expect(res.status).toBe(200);
      expect(res.body.data.publishers).toHaveLength(1);
      expect(res.body.data.publishers[0]).toMatchObject({
        diffuseurPublisherId: annonceur.id,
        diffuseurPublisherName: "Annonceur A",
        annonceurPublisherId: res.body.data.id,
        moderator: true,
        missionType: PublisherMissionType.BENEVOLAT,
      });

      const roots = await publisherDiffusionRuleService.findRules({ publisherId: res.body.data.id, combinedWithId: null });
      expect(roots).toHaveLength(1);
      expect(roots[0]).toMatchObject({ field: "publisherId", operator: "is", value: annonceur.id });
    });
  });

  describe("PUT /publisher/:id", () => {
    it("preserves child rules of kept roots when the partner list changes", async () => {
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
        .set(adminHeader())
        .send({ publishers: [{ publisherId: annonceur1.id }, { publisherId: annonceur2.id }] });

      expect(res.status).toBe(200);
      expect(res.body.data.publishers).toHaveLength(2);

      const rules = await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id });
      const roots = rules.filter((rule) => rule.combinedWithId === null);
      expect(roots.map((rule) => rule.value).sort()).toEqual([annonceur1.id, annonceur2.id].sort());
      // Le root conservé n'a pas été recréé et sa rule enfant (exclusion) a survécu
      expect(roots.find((rule) => rule.value === annonceur1.id)?.id).toBe(rootBefore.id);
      expect(rules.find((rule) => rule.id === child.id)).toBeDefined();
    });

    it("deletes the root and its child rules when a partner is removed", async () => {
      const annonceur = await createTestPublisher({ name: "Annonceur" });
      const diffuseur = await createTestPublisher({ name: "Diffuseur", publishers: [{ publisherId: annonceur.id }] });
      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: diffuseur.id,
        annonceurPublisherId: annonceur.id,
        field: "publisherOrganization.clientId",
        operator: "is_not",
        value: "org-1",
      });

      const res = await request(app).put(`/publisher/${diffuseur.id}`).set(adminHeader()).send({ publishers: [] });

      expect(res.status).toBe(200);
      expect(res.body.data.publishers).toHaveLength(0);
      expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id })).toHaveLength(0);
    });

    it("clears all scope roots when diffusion rights are disabled", async () => {
      const annonceur = await createTestPublisher({ name: "Annonceur" });
      const diffuseur = await createTestPublisher({ name: "Diffuseur", publishers: [{ publisherId: annonceur.id }] });

      const res = await request(app).put(`/publisher/${diffuseur.id}`).set(adminHeader()).send({ hasApiRights: false, hasWidgetRights: false, hasCampaignRights: false });

      expect(res.status).toBe(200);
      expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, combinedWithId: null })).toHaveLength(0);
    });

    it("clears all scope roots when publishers is null (service)", async () => {
      const annonceur = await createTestPublisher({ name: "Annonceur" });
      const diffuseur = await createTestPublisher({ name: "Diffuseur", publishers: [{ publisherId: annonceur.id }] });

      const updated = await publisherService.updatePublisher(diffuseur.id, { publishers: null });

      expect(updated.publishers).toHaveLength(0);
      expect(await publisherDiffusionRuleService.findRules({ publisherId: diffuseur.id, combinedWithId: null })).toHaveLength(0);
    });
  });

  describe("POST /publisher/search", () => {
    it("filters publishers by diffuseursOf using scope roots", async () => {
      const annonceur = await createTestPublisher({ name: "Annonceur" });
      const diffuseur = await createTestPublisher({ name: "Diffuseur 1", publishers: [{ publisherId: annonceur.id }] });
      await createTestPublisher({ name: "Diffuseur 2" });

      const res = await request(app).post("/publisher/search").set(adminHeader()).send({ diffuseursOf: annonceur.id });

      expect(res.status).toBe(200);
      expect(res.body.data.map((publisher: { id: string }) => publisher.id)).toEqual([diffuseur.id]);
    });
  });

  describe("GET /publisher/:id/moderated", () => {
    it("returns true when JVA has a scope root for the publisher", async () => {
      const moderated = await createTestPublisher({ name: "Annonceur modéré" });
      const other = await createTestPublisher({ name: "Annonceur non modéré" });
      await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER, name: "JeVeuxAider", publishers: [{ publisherId: moderated.id }] });
      const { token } = await createTestUser({ role: "user", publishers: [moderated.id, other.id] });

      const resModerated = await request(app)
        .get(`/publisher/${moderated.id}/moderated`)
        .set({ Authorization: `jwt ${token}` });
      const resOther = await request(app)
        .get(`/publisher/${other.id}/moderated`)
        .set({ Authorization: `jwt ${token}` });

      expect(resModerated.status).toBe(200);
      expect(resModerated.body.data).toBe(true);
      expect(resOther.status).toBe(200);
      expect(resOther.body.data).toBe(false);
    });
  });

  describe("v0 GET /publisher", () => {
    it("lists the partners diffusing the authenticated publisher", async () => {
      const annonceur = await createTestPublisher({ name: "Annonceur" });
      const diffuseur = await createTestPublisher({ name: "Diffuseur 1", publishers: [{ publisherId: annonceur.id }] });
      await createTestPublisher({ name: "Diffuseur 2" });

      const res = await request(app)
        .get("/v0/publisher")
        .set("x-api-key", annonceur.apikey as string);

      expect(res.status).toBe(200);
      expect(res.body.data.map((partner: { _id: string }) => partner._id)).toEqual([diffuseur.id]);
    });

    it("returns a partner by id only when it diffuses the authenticated publisher", async () => {
      const annonceur = await createTestPublisher({ name: "Annonceur" });
      const diffuseur = await createTestPublisher({ name: "Diffuseur 1", publishers: [{ publisherId: annonceur.id }] });
      const unrelated = await createTestPublisher({ name: "Diffuseur 2" });

      const resOk = await request(app)
        .get(`/v0/publisher/${diffuseur.id}`)
        .set("x-api-key", annonceur.apikey as string);
      const resNotFound = await request(app)
        .get(`/v0/publisher/${unrelated.id}`)
        .set("x-api-key", annonceur.apikey as string);

      expect(resOk.status).toBe(200);
      expect(resOk.body.data._id).toBe(diffuseur.id);
      expect(resNotFound.status).toBe(404);
    });
  });
});
