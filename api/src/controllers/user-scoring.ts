import { Router } from "express";
import zod from "zod";

import { isValidTaxonomyValueKey } from "@engagement/taxonomy";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, NOT_FOUND } from "@/error";
import { userScoringService } from "@/services/user-scoring";

const router = Router();

const answersSchema = zod.array(zod.object({ taxonomy_value_key: zod.string() })).min(1);
const distinctIdSchema = zod.string().trim().min(1);

const bodySchema = zod.object({
  answers: answersSchema,
  geo: zod
    .object({
      lat: zod.number().min(-90).max(90),
      lon: zod.number().min(-180).max(180),
      radius_km: zod.number().positive().optional(),
    })
    .optional(),
  distinctId: distinctIdSchema.optional(),
  missionAlertEnabled: zod.boolean().default(false),
});

const updateBodySchema = zod
  .object({
    answers: answersSchema.optional(),
    distinctId: distinctIdSchema,
    missionAlertEnabled: zod.boolean().optional(),
  })
  .refine((body) => body.answers !== undefined || body.missionAlertEnabled !== undefined, {
    message: "answers or missionAlertEnabled is required",
  });

const userScoringParamsSchema = zod.object({
  userScoringId: zod.string().uuid(),
});

router.post("/", async (req, res, next) => {
  try {
    const body = bodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    // Silently discard unknown or malformed keys — only valid taxonomy values are persisted.
    // Return 400 only if *all* answers are invalid (nothing to score).
    const validAnswers = body.data.answers.filter((a) => isValidTaxonomyValueKey(a.taxonomy_value_key));
    if (validAnswers.length === 0) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "No valid taxonomy_value_key provided" });
    }

    const data = await userScoringService.create({ ...body.data, answers: validAnswers });
    return res.status(201).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.put("/:userScoringId", async (req, res, next) => {
  try {
    const params = userScoringParamsSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const body = updateBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const validAnswers = body.data.answers?.filter((a) => isValidTaxonomyValueKey(a.taxonomy_value_key));
    if (body.data.answers && validAnswers?.length === 0) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "No valid taxonomy_value_key provided" });
    }

    const data = await userScoringService.update({
      userScoringId: params.data.userScoringId,
      distinctId: body.data.distinctId,
      answers: validAnswers,
      missionAlertEnabled: body.data.missionAlertEnabled,
    });

    if (data.status === "not_found") {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "User scoring not found" });
    }

    if (data.status === "forbidden") {
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Invalid distinctId" });
    }

    return res.status(200).send({ ok: true, data: data.data });
  } catch (error) {
    next(error);
  }
});

export default router;
