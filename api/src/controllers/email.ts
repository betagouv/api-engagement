import { NextFunction, Request, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { EMAIL_SEND_FAILED, FORBIDDEN, INVALID_BODY, NOT_FOUND } from "@/error";
import { plateformRateLimiter } from "@/middlewares/rate-limit";
import { sendMissionEmail } from "@/services/mission-email";
import type { SendMissionEmailResponse } from "@engagement/dto";

const router = Router();
router.use(passport.authenticate(["apikey", "api"], { session: false }));
router.use(plateformRateLimiter);

const distinctIdSchema = zod.string().trim().min(1);
const emailSchema = zod.preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), zod.email());

const missionEmailBodySchema = zod
  .object({
    email: emailSchema,
    publisherId: zod.string().trim().min(1),
    distinctId: distinctIdSchema.optional(),
    userScoringId: zod.uuid().optional(),
    missionIds: zod.array(zod.string().trim().min(1)).min(1).max(5).optional(),
  })
  .strict()
  .refine((body) => body.userScoringId !== undefined || body.missionIds !== undefined, {
    message: "userScoringId or missionIds is required",
  })
  .refine((body) => body.userScoringId === undefined || body.distinctId !== undefined, {
    message: "distinctId is required when userScoringId is provided",
    path: ["distinctId"],
  });

router.post("/mission", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = missionEmailBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const result = await sendMissionEmail(body.data);
    const data: Pick<SendMissionEmailResponse, "user_scoring_id"> = {
      ...(body.data.userScoringId ? { user_scoring_id: body.data.userScoringId } : {}),
    };

    if (result.status === "not_found") {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "User scoring not found" });
    }

    if (result.status === "forbidden") {
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Invalid distinctId" });
    }

    if (result.status === "failed") {
      return res.status(502).send({ ok: false, code: EMAIL_SEND_FAILED, message: "Email send failed", data: { ...data, email_sent: false } satisfies SendMissionEmailResponse });
    }

    if (result.status === "skipped") {
      return res.status(200).send({
        ok: true,
        data: {
          ...data,
          email_sent: false,
          email_skip_reason: result.reason,
        },
      });
    }

    return res.status(200).send({ ok: true, data: { ...data, email_sent: true } satisfies SendMissionEmailResponse });
  } catch (error) {
    next(error);
  }
});

export default router;
