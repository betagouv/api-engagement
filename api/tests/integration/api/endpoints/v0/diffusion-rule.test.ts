import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { type PublisherRecord } from "@/types";

import { createTestPublisher, createTestPublisherOrganization } from "../../../../fixtures";
import { createTestApp } from "../../../../testApp";

describe("DiffusionRule API Integration Tests", () => {
  const app = createTestApp();
  let publisher: PublisherRecord;
  let apiKey: string;
  let diffuseur1: PublisherRecord;
  let diffuseur2: PublisherRecord;
  let otherDiffuseur: PublisherRecord;
  let organization: { id: string; clientId: string };

  beforeEach(async () => {
    publisher = await createTestPublisher();
    apiKey = publisher.apikey || "";
    diffuseur1 = await createTestPublisher({
      publishers: [{ publisherId: publisher.id }],
    });
    diffuseur2 = await createTestPublisher({
      publishers: [{ publisherId: publisher.id }],
    });
    otherDiffuseur = await createTestPublisher();
    organization = await createTestPublisherOrganization({ publisherId: publisher.id, clientId: "org-1" });
  });

  /**
   * GET /v0/diffusion-rule
   * - should return 401 if not authenticated
   * - should return empty rules list for each diffuseur when none exist
   * - should return rules grouped by diffuseur
   * - should ignore rules scoped to a different annonceur
   * - should not expose a diffuse field when field/value are missing
   * - should annotate each diffuseur with a diffuse boolean when filtering
   * - should match array fields by exact membership, not substring
   * - should return 400 when only one of field or value is provided
   */
  describe("GET /v0/diffusion-rule", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/v0/diffusion-rule");
      expect(response.status).toBe(401);
    });

    it("should return an entry per diffuseur with an empty rules list when none exist", async () => {
      const response = await request(app).get("/v0/diffusion-rule").set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.total).toBe(2);
      expect(response.body.data).toHaveLength(2);

      const data1 = response.body.data.find((entry: any) => entry.id === diffuseur1.id);
      const data2 = response.body.data.find((entry: any) => entry.id === diffuseur2.id);
      expect(data1).toMatchObject({ id: diffuseur1.id, name: diffuseur1.name, rules: [] });
      expect(data2).toMatchObject({ id: diffuseur2.id, name: diffuseur2.name, rules: [] });
    });

    it("should return rules grouped by diffuseur", async () => {
      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: diffuseur1.id,
        annonceurPublisherId: publisher.id,
        field: "publisherOrganization.clientId",
        fieldType: "string",
        operator: "is_not",
        value: "org-1",
      });
      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: diffuseur1.id,
        annonceurPublisherId: publisher.id,
        field: "publisherOrganization.clientId",
        fieldType: "string",
        operator: "is_not",
        value: "org-2",
      });

      const response = await request(app).get("/v0/diffusion-rule").set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      const data1 = response.body.data.find((entry: any) => entry.id === diffuseur1.id);
      const data2 = response.body.data.find((entry: any) => entry.id === diffuseur2.id);

      expect(data1.rules).toHaveLength(2);
      const values = data1.rules.map((rule: any) => rule.value).sort();
      expect(values).toEqual(["org-1", "org-2"]);
      data1.rules.forEach((rule: any) => {
        expect(rule).toMatchObject({
          field: "publisherOrganization.clientId",
          fieldType: "string",
          operator: "is_not",
        });
        expect(typeof rule.id).toBe("string");
      });

      expect(data2.rules).toEqual([]);
    });

    it("should ignore rules scoped to a different annonceur", async () => {
      const otherAnnonceur = await createTestPublisher();
      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: diffuseur1.id,
        annonceurPublisherId: otherAnnonceur.id,
        field: "publisherOrganization.clientId",
        fieldType: "string",
        operator: "is_not",
        value: "org-other",
      });

      const response = await request(app).get("/v0/diffusion-rule").set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      const data1 = response.body.data.find((entry: any) => entry.id === diffuseur1.id);
      expect(data1.rules).toEqual([]);
    });

    it("should not expose a diffuse field when field and value are not provided", async () => {
      const response = await request(app).get("/v0/diffusion-rule").set("x-api-key", apiKey);

      expect(response.status).toBe(200);
      response.body.data.forEach((entry: any) => {
        expect(entry).not.toHaveProperty("diffuse");
      });
    });

    it("should annotate each diffuseur with a diffuse boolean when filtering by field and value", async () => {
      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: diffuseur1.id,
        annonceurPublisherId: publisher.id,
        field: "publisherOrganization.parentOrganizations",
        fieldType: "string",
        operator: "does_not_contain",
        value: "Marine nationale",
      });

      const excluded = await request(app)
        .get("/v0/diffusion-rule")
        .query({ field: "publisherOrganization.parentOrganizations", value: "Marine nationale" })
        .set("x-api-key", apiKey);

      expect(excluded.status).toBe(200);
      const excluded1 = excluded.body.data.find((entry: any) => entry.id === diffuseur1.id);
      const excluded2 = excluded.body.data.find((entry: any) => entry.id === diffuseur2.id);
      expect(excluded1.diffuse).toBe(false);
      expect(excluded2.diffuse).toBe(true);

      const allowed = await request(app).get("/v0/diffusion-rule").query({ field: "publisherOrganization.parentOrganizations", value: "Armée de terre" }).set("x-api-key", apiKey);

      expect(allowed.status).toBe(200);
      const allowed1 = allowed.body.data.find((entry: any) => entry.id === diffuseur1.id);
      expect(allowed1.diffuse).toBe(true);
    });

    it("should match array fields by exact membership, not substring", async () => {
      await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: diffuseur1.id,
        annonceurPublisherId: publisher.id,
        field: "publisherOrganization.parentOrganizations",
        fieldType: "string",
        operator: "does_not_contain",
        value: "Marine",
      });

      // La valeur "Marine nationale" contient "Marine" comme sous-chaîne mais n'est pas un élément exact du tableau :
      // le filtrage réel des missions diffuserait donc cette valeur.
      const partial = await request(app)
        .get("/v0/diffusion-rule")
        .query({ field: "publisherOrganization.parentOrganizations", value: "Marine nationale" })
        .set("x-api-key", apiKey);
      expect(partial.status).toBe(200);
      expect(partial.body.data.find((entry: any) => entry.id === diffuseur1.id).diffuse).toBe(true);

      const exact = await request(app).get("/v0/diffusion-rule").query({ field: "publisherOrganization.parentOrganizations", value: "Marine" }).set("x-api-key", apiKey);
      expect(exact.status).toBe(200);
      expect(exact.body.data.find((entry: any) => entry.id === diffuseur1.id).diffuse).toBe(false);
    });

    it("should return 400 when only one of field or value is provided", async () => {
      const onlyField = await request(app).get("/v0/diffusion-rule").query({ field: "type" }).set("x-api-key", apiKey);
      expect(onlyField.status).toBe(400);
      expect(onlyField.body.code).toBe("INVALID_QUERY");

      const onlyValue = await request(app).get("/v0/diffusion-rule").query({ value: "benevolat" }).set("x-api-key", apiKey);
      expect(onlyValue.status).toBe(400);
      expect(onlyValue.body.code).toBe("INVALID_QUERY");
    });
  });

  /**
   * POST /v0/diffusion-rule
   * - should return 401 if not authenticated
   * - should return 400 for invalid body
   * - should return 403 when none of the publisherIds match the user's diffuseurs
   * - should create rules for allowed diffuseurs only
   * - should default fieldType to "string" when missing
   * - should be idempotent and return the existing rule when posted twice
   * - should return 409 when the same field and value is posted with a different operator
   */
  describe("POST /v0/diffusion-rule", () => {
    const validRule = {
      field: "publisherOrganization.clientId",
      fieldType: "string",
      operator: "is_not",
      value: "org-1",
    };

    it("should return 401 if not authenticated", async () => {
      const response = await request(app)
        .post("/v0/diffusion-rule")
        .send({ ...validRule, publisherIds: [diffuseur1.id] });
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid body", async () => {
      const response = await request(app).post("/v0/diffusion-rule").set("x-api-key", apiKey).send({ publisherIds: [], field: "", operator: "", value: "" });
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("INVALID_BODY");
    });

    it("should return 403 when none of the publisherIds belong to the user's diffuseurs", async () => {
      const response = await request(app)
        .post("/v0/diffusion-rule")
        .set("x-api-key", apiKey)
        .send({ ...validRule, publisherIds: [otherDiffuseur.id] });

      expect(response.status).toBe(403);
      expect(response.body.ok).toBe(false);
      expect(response.body.code).toBe("FORBIDDEN");
    });

    it("should create rules for allowed diffuseurs and ignore unrelated ones", async () => {
      const response = await request(app)
        .post("/v0/diffusion-rule")
        .set("x-api-key", apiKey)
        .send({ ...validRule, publisherIds: [diffuseur1.id, diffuseur2.id, otherDiffuseur.id] });

      expect(response.status).toBe(201);
      expect(response.body.ok).toBe(true);
      expect(response.body.total).toBe(2);
      expect(response.body.data).toHaveLength(2);

      const publisherIds = response.body.data.map((rule: any) => rule.publisherId).sort();
      expect(publisherIds).toEqual([diffuseur1.id, diffuseur2.id].sort());
      response.body.data.forEach((rule: any) => {
        expect(rule).toMatchObject({
          field: validRule.field,
          fieldType: validRule.fieldType,
          operator: validRule.operator,
          value: validRule.value,
        });
        expect(typeof rule.id).toBe("string");
      });

      const persisted = await publisherDiffusionRuleService.findRules({
        publisherIds: [diffuseur1.id, diffuseur2.id, otherDiffuseur.id],
        field: "publisherOrganizationId",
        value: organization.id,
      });
      expect(persisted.map((rule) => rule.publisherId).sort()).toEqual([diffuseur1.id, diffuseur2.id].sort());
    });

    it("should default fieldType to string when missing", async () => {
      const response = await request(app)
        .post("/v0/diffusion-rule")
        .set("x-api-key", apiKey)
        .send({ publisherIds: [diffuseur1.id], field: "publisherOrganization.parentOrganizations", operator: "does_not_contain", value: "Marine nationale" });

      expect(response.status).toBe(201);
      expect(response.body.data[0].fieldType).toBe("string");
    });

    it("should be idempotent and return the existing rule when posted twice", async () => {
      const first = await request(app)
        .post("/v0/diffusion-rule")
        .set("x-api-key", apiKey)
        .send({ ...validRule, publisherIds: [diffuseur1.id] });
      expect(first.status).toBe(201);

      const second = await request(app)
        .post("/v0/diffusion-rule")
        .set("x-api-key", apiKey)
        .send({ ...validRule, publisherIds: [diffuseur1.id] });

      expect(second.status).toBe(201);
      expect(second.body.ok).toBe(true);
      expect(second.body.data[0].id).toBe(first.body.data[0].id);

      const persisted = await publisherDiffusionRuleService.findRules({
        publisherId: diffuseur1.id,
        field: "publisherOrganizationId",
        value: organization.id,
      });
      expect(persisted).toHaveLength(1);
    });

    it("should return 409 when the same field and value is posted with a different operator", async () => {
      const first = await request(app)
        .post("/v0/diffusion-rule")
        .set("x-api-key", apiKey)
        .send({ ...validRule, operator: "is_not", publisherIds: [diffuseur1.id] });
      expect(first.status).toBe(201);

      const conflict = await request(app)
        .post("/v0/diffusion-rule")
        .set("x-api-key", apiKey)
        .send({ ...validRule, operator: "is", publisherIds: [diffuseur1.id] });

      expect(conflict.status).toBe(409);
      expect(conflict.body.ok).toBe(false);
      expect(conflict.body.code).toBe("RESSOURCE_ALREADY_EXIST");

      // La règle d'origine n'a pas été modifiée ni dupliquée.
      const persisted = await publisherDiffusionRuleService.findRules({
        publisherId: diffuseur1.id,
        field: "publisherOrganizationId",
        value: organization.id,
      });
      expect(persisted).toHaveLength(1);
      expect(persisted[0].operator).toBe("is_not");
    });
  });

  /**
   * DELETE /v0/diffusion-rule/:id
   * - should return 401 if not authenticated
   * - should return 404 when the rule does not exist
   * - should return 403 when the child rule belongs to a different annonceur
   * - should return 403 when the rule is a scope root rather than a child
   * - should delete a child rule scoped to the user
   */
  describe("DELETE /v0/diffusion-rule/:id", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await request(app).delete("/v0/diffusion-rule/some-id");
      expect(response.status).toBe(401);
    });

    it("should return 404 when the rule does not exist", async () => {
      const response = await request(app).delete("/v0/diffusion-rule/missing-id").set("x-api-key", apiKey);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe("NOT_FOUND");
    });

    it("should return 403 when the child rule belongs to a different annonceur", async () => {
      const otherAnnonceur = await createTestPublisher();
      const child = await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: diffuseur1.id,
        annonceurPublisherId: otherAnnonceur.id,
        field: "publisherOrganization.clientId",
        fieldType: "string",
        operator: "is_not",
        value: "org-other",
      });

      const response = await request(app).delete(`/v0/diffusion-rule/${child.id}`).set("x-api-key", apiKey);
      expect(response.status).toBe(403);
      expect(response.body.code).toBe("FORBIDDEN");

      const stillThere = await publisherDiffusionRuleService.findRuleById(child.id);
      expect(stillThere).not.toBeNull();
    });

    it("should return 403 when the rule is a scope root rather than a child", async () => {
      const root = await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuseur1.id, publisher.id);

      const response = await request(app).delete(`/v0/diffusion-rule/${root.id}`).set("x-api-key", apiKey);
      expect(response.status).toBe(403);
      expect(response.body.code).toBe("FORBIDDEN");

      const stillThere = await publisherDiffusionRuleService.findRuleById(root.id);
      expect(stillThere).not.toBeNull();
    });

    it("should delete a child rule scoped to the user and keep its scope root", async () => {
      const child = await publisherDiffusionRuleService.createScopedRule({
        diffuseurPublisherId: diffuseur1.id,
        annonceurPublisherId: publisher.id,
        field: "publisherOrganization.clientId",
        fieldType: "string",
        operator: "is_not",
        value: "org-1",
      });
      const root = await publisherDiffusionRuleService.findOrCreateScopeRoot(diffuseur1.id, publisher.id);

      const response = await request(app).delete(`/v0/diffusion-rule/${child.id}`).set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);

      expect(await publisherDiffusionRuleService.findRuleById(child.id)).toBeNull();
      expect(await publisherDiffusionRuleService.findRuleById(root.id)).not.toBeNull();
    });
  });
});
