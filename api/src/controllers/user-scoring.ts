import { Router } from "express";
import zod from "zod";

import { EMAIL_SEND_FAILED, FORBIDDEN, INVALID_BODY, INVALID_PARAMS, NOT_FOUND } from "@/error";
import { userScoringService } from "@/services/user-scoring";

const router = Router();

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
const emailSchema = zod.preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), zod.email());

const bodySchema = zod.object({
  answers: answersSchema,
  distinctId: distinctIdSchema.optional(),
  missionAlertEnabled: zod.boolean().default(false),
}).strict();

const updateBodySchema = zod
  .object({
    answers: answersSchema.optional(),
    distinctId: distinctIdSchema,
    email: emailSchema.optional(),
    missionId: zod.string().uuid().optional(),
    geo: zod
      .object({
        lat: zod.number().min(-90).max(90),
        lon: zod.number().min(-180).max(180),
        radius_km: zod.number().positive().optional(),
      })
      .optional(),
    missionAlertEnabled: zod.boolean().optional(),
  })
  .refine((body) => body.answers !== undefined || body.geo !== undefined || body.missionAlertEnabled !== undefined || body.email !== undefined, {
    message: "answers, geo, email or missionAlertEnabled is required",
  })
  .refine((body) => body.missionId === undefined || body.email !== undefined, {
    message: "email is required when missionId is provided",
    path: ["email"],
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
      answers: validAnswers,
      email: body.data.email,
      missionId: body.data.missionId,
      missionAlertEnabled: body.data.missionAlertEnabled,
    });

    if (data.status === "not_found") {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "User scoring not found" });
    }

    if (data.status === "forbidden") {
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Invalid distinctId" });
    }

    if (data.status === "email_failed") {
      return res.status(502).send({ ok: false, code: EMAIL_SEND_FAILED, message: "Email send failed", data: data.data });
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
