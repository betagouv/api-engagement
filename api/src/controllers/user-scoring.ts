import { Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, NOT_FOUND } from "@/error";
import { UserScoringAnswerValidationError, userScoringService } from "@/services/user-scoring";

const router = Router();
router.use(passport.authenticate(["apikey", "api"], { session: false }));

const answerSchema = zod
  .object({
    taxonomy: zod.string().trim().min(1),
    value: zod.string().trim().min(1).optional(),
    params: zod.record(zod.string(), zod.unknown()).optional(),
  })
  .refine((answer) => (answer.value === undefined) !== (answer.params === undefined), {
    message: "Exactly one of value or params is required",
  });
const answersSchema = zod.array(answerSchema).min(1);
const distinctIdSchema = zod.string().trim().min(1);

const bodySchema = zod
  .object({
    answers: answersSchema,
    distinctId: distinctIdSchema.optional(),
    missionAlertEnabled: zod.boolean().default(false),
  })
  .strict();

const updateBodySchema = zod
  .object({
    answers: answersSchema.optional(),
    distinctId: distinctIdSchema,
    missionAlertEnabled: zod.boolean().optional(),
  })
  .strict()
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

    const data = await userScoringService.create(body.data);
    return res.status(201).send({ ok: true, data });
  } catch (error) {
    if (error instanceof UserScoringAnswerValidationError) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: error.message });
    }

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

    const data = await userScoringService.update({
      userScoringId: params.data.userScoringId,
      distinctId: body.data.distinctId,
      answers: body.data.answers,
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
    if (error instanceof UserScoringAnswerValidationError) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: error.message });
    }

    next(error);
  }
});

export default router;
