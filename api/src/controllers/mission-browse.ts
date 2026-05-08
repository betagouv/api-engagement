import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { EMAIL_SEND_FAILED, FORBIDDEN, INVALID_BODY, INVALID_QUERY, NOT_FOUND, SERVICE_UNAVAILABLE, captureException } from "@/error";
import { MissionBrowseIndexUnavailableError, missionBrowseService } from "@/services/mission-browse";
import { sendMissionEmail } from "@/services/mission-email";
import { INDEXED_TAXONOMY_KEYS } from "@/services/search/collections/missions/fields";

const router = Router();

const stringOrStringArraySchema = zod.union([zod.string(), zod.array(zod.string())]);

const taxonomyQueryShape = Object.fromEntries(INDEXED_TAXONOMY_KEYS.map((key) => [key, stringOrStringArraySchema.optional()]));

const browseQuerySchema = zod.object({
  publisherId: zod.string().optional(),
  departmentCode: stringOrStringArraySchema.optional(),
  ...taxonomyQueryShape,
  page: zod.coerce.number().int().positive().default(1),
  pageSize: zod.coerce.number().int().positive().max(100).default(20),
});

const distinctIdSchema = zod.string().trim().min(1);
const emailSchema = zod.preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), zod.email());

const missionEmailBodySchema = zod
  .object({
    email: emailSchema,
    distinctId: distinctIdSchema.optional(),
    userScoringId: zod.string().uuid().optional(),
    missionIds: zod.array(zod.string().uuid()).min(1).max(5).optional(),
  })
  .strict()
  .refine((body) => body.userScoringId !== undefined || body.missionIds !== undefined, {
    message: "userScoringId or missionIds is required",
  })
  .refine((body) => body.userScoringId === undefined || body.distinctId !== undefined, {
    message: "distinctId is required when userScoringId is provided",
    path: ["distinctId"],
  });

router.get("/browse", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = browseQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }
    const result = await missionBrowseService.browse(query.data);
    return res.status(200).send({ ok: true, ...result });
  } catch (error) {
    if (error instanceof MissionBrowseIndexUnavailableError) {
      captureException(error);
      return res.status(503).send({ ok: false, code: SERVICE_UNAVAILABLE, message: "Mission browse index is unavailable" });
    }
    next(error);
  }
});

router.post("/email", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = missionEmailBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const result = await sendMissionEmail(body.data);
    const data = {
      ...(body.data.userScoringId ? { user_scoring_id: body.data.userScoringId } : {}),
    };

    if (result.status === "not_found") {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "User scoring not found" });
    }

    if (result.status === "forbidden") {
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Invalid distinctId" });
    }

    if (result.status === "failed") {
      return res.status(502).send({ ok: false, code: EMAIL_SEND_FAILED, message: "Email send failed", data: { ...data, email_sent: false } });
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

    return res.status(200).send({ ok: true, data: { ...data, email_sent: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
