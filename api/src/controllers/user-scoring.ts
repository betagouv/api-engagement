import { Router } from "express";
import zod from "zod";

import { INVALID_BODY } from "@/error";
import { UserScoringValidationError, userScoringService } from "@/services/user-scoring";

const router = Router();

const bodySchema = zod.object({
  answers: zod
    .array(zod.object({ taxonomy_value_key: zod.string().min(1) }))
    .min(1),
  geo: zod
    .object({
      lat: zod.number().min(-90).max(90),
      lon: zod.number().min(-180).max(180),
      radius_km: zod.number().positive().optional(),
    })
    .optional(),
});

router.post("/", async (req, res, next) => {
  try {
    const body = bodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const data = await userScoringService.create(body.data);
    return res.status(201).send({ ok: true, data });
  } catch (error) {
    if (error instanceof UserScoringValidationError) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: error.message });
    }
    next(error);
  }
});

export default router;
