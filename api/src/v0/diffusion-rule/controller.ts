import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, NOT_FOUND } from "@/error";
import { publisherRateLimiter } from "@/middlewares/rate-limit";
import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { PublisherRequest } from "@/types/passport";
import type { PublisherRecord } from "@/types/publisher";

const router = Router();
router.use(passport.authenticate(["apikey", "api"], { session: false }));
router.use(publisherRateLimiter);

const ruleBodySchema = zod.object({
  publisherIds: zod.array(zod.string()).min(1),
  field: zod.string().min(1),
  fieldType: zod.string().optional().nullable(),
  operator: zod.string().min(1),
  value: zod.string().min(1),
});

router.get("/", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

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
      return {
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

    const created = await Promise.all(
      diffuseurIds.map((diffuseurId) =>
        publisherDiffusionRuleService.createScopedRule({
          diffuseurPublisherId: diffuseurId,
          annonceurPublisherId: user.id,
          field: body.data.field,
          fieldType: body.data.fieldType ?? "string",
          operator: body.data.operator,
          value: body.data.value,
        })
      )
    );

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

    const isScopedToUser = rule.combinedWithId === null && rule.field === "publisherId" && rule.value === user.id;
    if (!isScopedToUser) {
      res.locals = { code: NOT_FOUND, message: "Rule not found" };
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Rule not found" });
    }

    await publisherDiffusionRuleService.deleteRule(rule.id);

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
