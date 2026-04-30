import { Router } from "express";
import zod from "zod";

import { isValidTaxonomyValueKey } from "@engagement/taxonomy";

import { INVALID_BODY } from "@/error";
import { userScoringService } from "@/services/user-scoring";

const router = Router();

const bodySchema = zod.object({
  answers: zod.array(zod.object({ taxonomy_value_key: zod.string() })).min(1),
  geo: zod
    .object({
      lat: zod.number().min(-90).max(90),
      lon: zod.number().min(-180).max(180),
      radius_km: zod.number().positive().optional(),
    })
    .optional(),
  distinctId: zod.string().optional(),
  missionAlertEnabled: zod.boolean().default(false),
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

export default router;
