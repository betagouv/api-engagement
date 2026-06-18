import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "@/error";
import { publisherRateLimiter } from "@/middlewares/rate-limit";
import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import publisherOrganizationService from "@/services/publisher-organization";
import { PublisherRequest } from "@/types/passport";
import type { PublisherRecord } from "@/types/publisher";

const router = Router();
router.use(passport.authenticate(["apikey", "api"], { session: false }));
router.use(publisherRateLimiter);

const listQuerySchema = zod
  .object({
    field: zod.string().min(1).optional(),
    value: zod.string().min(1).optional(),
  })
  .refine((data) => (data.field === undefined) === (data.value === undefined), {
    message: "field and value must be provided together",
  });

const ALLOWED_RULE_FIELDS = ["publisherOrganization.clientId", "publisherOrganization.parentOrganizations"] as const;

const ruleBodySchema = zod.object({
  publisherIds: zod.array(zod.string()).min(1),
  field: zod.enum(ALLOWED_RULE_FIELDS),
  fieldType: zod.string().optional().nullable(),
  operator: zod.string().min(1),
  value: zod.string().min(1),
});

router.get("/", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

    const query = listQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const { field, value } = query.data;

    const diffuseurs = await publisherService.findPublishers({ diffuseurOf: user.id });
    const diffuseurIds = diffuseurs.map((diffuseur) => diffuseur.id);

    const roots = await publisherDiffusionRuleService.findRules({
      publisherIds: diffuseurIds,
      combinedWithId: null,
      field: "publisherId",
      value: user.id,
      includeCombinedRules: true,
    });

    const rulesByDiffuseur = new Map<string, typeof roots>();
    roots.forEach((rule) => {
      const list = rulesByDiffuseur.get(rule.publisherId) ?? [];
      list.push(rule);
      rulesByDiffuseur.set(rule.publisherId, list);
    });

    // Les règles sont stockées sur publisherOrganizationId ; on les réexpose sur le clientId de l'annonceur
    // pour conserver le contrat d'API (publisherOrganization.clientId).
    const organizationIds = roots.flatMap((root) => (root.combinedRules ?? []).filter((rule) => rule.field === "publisherOrganizationId").map((rule) => rule.value));
    const organizations = organizationIds.length ? await publisherOrganizationService.findMany({ publisherId: user.id, ids: organizationIds }) : [];
    const clientIdByOrganizationId = new Map(organizations.map((organization) => [organization.id, organization.clientId]));

    const toPublicRule = (rule: (typeof roots)[number]) => {
      const clientId = clientIdByOrganizationId.get(rule.value);
      if (rule.field === "publisherOrganizationId" && clientId !== undefined) {
        return { ...rule, field: "publisherOrganization.clientId", value: clientId };
      }
      return rule;
    };

    const data = diffuseurs.map((diffuseur) => {
      const combinedRules = (rulesByDiffuseur.get(diffuseur.id)?.[0].combinedRules ?? []).map(toPublicRule);
      const base = {
        id: diffuseur.id,
        name: diffuseur.name,
        logo: diffuseur.logo,
        rules: combinedRules.map((rule) => ({
          id: rule.id,
          field: rule.field,
          fieldType: rule.fieldType,
          operator: rule.operator,
          value: rule.value,
        })),
      };

      if (field !== undefined && value !== undefined) {
        return { ...base, diffuse: publisherDiffusionRuleService.isValueDiffused({ rules: combinedRules, field, value }) };
      }

      return base;
    });

    return res.status(200).send({ ok: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

    const body = ruleBodySchema.safeParse(req.body);
    if (!body.success) {
      res.locals = { code: INVALID_BODY, message: JSON.stringify(body.error) };
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const allowedDiffuseurs = await publisherService.findPublishers({ diffuseurOf: user.id });
    const allowedIds = new Set(allowedDiffuseurs.map((diffuseur) => diffuseur.id));
    const diffuseurIds = body.data.publisherIds.filter((id) => allowedIds.has(id));

    if (!diffuseurIds.length) {
      res.locals = { code: FORBIDDEN, message: "No diffuseur match the request" };
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: "No diffuseur match the request" });
    }

    // On stocke une règle sur l'id de l'organisation plutôt que sur son clientId : le clientId reçu est résolu
    // vers l'organisation de l'annonceur (clé unique publisherId + clientId) pour obtenir publisherOrganizationId.
    let field: string = body.data.field;
    let value = body.data.value;
    if (body.data.field === "publisherOrganization.clientId") {
      const organization = await publisherOrganizationService.findOneByClientIdAndPublisher(value, user.id);
      if (!organization) {
        res.locals = { code: NOT_FOUND, message: "Publisher organization not found" };
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher organization not found" });
      }
      field = "publisherOrganizationId";
      value = organization.id;
    }

    const created = await Promise.all(
      diffuseurIds.map((diffuseurId) =>
        publisherDiffusionRuleService.createScopedRule({
          diffuseurPublisherId: diffuseurId,
          annonceurPublisherId: user.id,
          field,
          fieldType: body.data.fieldType ?? "string",
          operator: body.data.operator,
          value,
        })
      )
    );

    return res.status(201).send({
      ok: true,
      data: created.map((rule) => ({
        id: rule.id,
        publisherId: rule.publisherId,
        // On réexpose le champ tel que reçu (publisherOrganization.clientId) plutôt que le publisherOrganizationId stocké.
        field: body.data.field,
        fieldType: rule.fieldType,
        operator: rule.operator,
        value: body.data.value,
      })),
      total: created.length,
    });
  } catch (error) {
    if ((error as { code?: string })?.code === RESSOURCE_ALREADY_EXIST) {
      const message = (error as Error).message;
      res.locals = { code: RESSOURCE_ALREADY_EXIST, message };
      return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, message });
    }
    next(error);
  }
});

router.delete("/:id", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

    const params = zod.object({ id: zod.string() }).safeParse(req.params);
    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const rule = await publisherDiffusionRuleService.findRuleById(params.data.id);
    if (!rule) {
      res.locals = { code: NOT_FOUND, message: "Rule not found" };
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Rule not found" });
    }

    const isScopedToUser = rule.combinedWith?.field === "publisherId" && rule.combinedWith?.value === user.id;
    if (!isScopedToUser) {
      res.locals = { code: FORBIDDEN, message: "Rule not scoped to user" };
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Rule not scoped to user" });
    }

    await publisherDiffusionRuleService.deleteRule(rule.id);

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
