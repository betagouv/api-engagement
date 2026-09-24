import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "@/error";
import { publisherRateLimiter } from "@/middlewares/rate-limit";
import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { SUPPORTED_CHILD_FIELDS } from "@/services/publisher-diffusion-rule/config";
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

// Garde-fou : seuls les opérateurs déclarés dans le registre `SUPPORTED_CHILD_FIELDS` sont acceptés,
// une règle hors registre casserait le filtrage des missions (match / missions-browse).
const ruleBodySchema = zod
  .object({
    // Borne alignée sur REINDEX_PUBLISH_BATCH_SIZE (mission-diffusion-rebuild/handler.ts) : chaque
    // diffuseur déclenche un rebuild complet de son snapshot, pas de fan-out illimité par requête.
    publisherIds: zod.array(zod.string()).min(1).max(50),
    field: zod.enum(ALLOWED_RULE_FIELDS),
    fieldType: zod.enum(["string"]).optional().nullable(),
    operator: zod.string().min(1),
    value: zod.string().min(1),
  })
  .refine(
    (data) => {
      const config = SUPPORTED_CHILD_FIELDS[data.field];
      return config.operators.is.includes(data.operator) || config.operators.isNot.includes(data.operator);
    },
    { message: "operator not supported for this field" }
  );

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

    const data = diffuseurs.map((diffuseur) => {
      const combinedRules = rulesByDiffuseur.get(diffuseur.id)?.[0].combinedRules ?? [];
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
    const diffuseurIds = [...new Set(body.data.publisherIds.filter((id) => allowedIds.has(id)))];

    if (!diffuseurIds.length) {
      res.locals = { code: FORBIDDEN, message: "No diffuseur match the request" };
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: "No diffuseur match the request" });
    }

    // allSettled (pas Promise.all) : si un diffuseur du batch échoue, on attend quand même que les
    // autres finissent (création + enqueue) avant de répondre, sinon la réponse HTTP peut partir avant
    // que leurs écritures ne soient committées (Promise.all ne fait qu'attendre la PREMIÈRE promesse
    // réglée en cas de rejet, sans attendre les autres).
    const settled = await Promise.allSettled(
      diffuseurIds.map(async (diffuseurId) => {
        const rule = await publisherDiffusionRuleService.createScopedRule({
          diffuseurPublisherId: diffuseurId,
          annonceurPublisherId: user.id,
          field: body.data.field,
          fieldType: body.data.fieldType ?? "string",
          operator: body.data.operator,
          value: body.data.value,
        });

        // Enqueue dès la création réussie de CE diffuseur : si un autre diffuseur du même batch échoue,
        // la règle déjà committée ici ne doit pas rester avec un snapshot mission_diffusion stale.
        await publisherService.enqueuePublisherDiffusion(diffuseurId);

        return rule;
      })
    );

    const created = [];
    for (const result of settled) {
      if (result.status === "rejected") {
        throw result.reason;
      }
      created.push(result.value);
    }

    return res.status(201).send({
      ok: true,
      data: created.map((rule) => ({
        id: rule.id,
        publisherId: rule.publisherId,
        field: rule.field,
        fieldType: rule.fieldType,
        operator: rule.operator,
        value: rule.value,
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
    await publisherService.enqueuePublisherDiffusion(rule.publisherId);

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
