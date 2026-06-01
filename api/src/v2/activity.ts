import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, NOT_FOUND } from "@/error";
import { publisherRateLimiter } from "@/middlewares/rate-limit";
import missionService from "@/services/mission";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { statEventService } from "@/services/stat-event";
import { StatEventRecord } from "@/types";
import { PublisherRequest } from "@/types/passport";
import type { PublisherRecord } from "@/types/publisher";

const router = Router();
router.use(passport.authenticate(["apikey", "api"], { session: false }));
router.use(publisherRateLimiter);

router.get("/:id", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);
    const query = zod
      .object({
        type: zod.enum(["apply", "account"]).optional(),
      })
      .safeParse(req.query);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: JSON.parse(params.error.message) });
    }
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: JSON.parse(query.error.message) });
    }

    const { statEvent, ambiguous } = await statEventService.findStatEventByIdOrClientEventId({
      id: params.data.id,
      toPublisherId: user.id,
      type: query.data.type as "apply" | "account" | undefined,
    });

    if (ambiguous) {
      return res.status(409).send({ ok: false, code: INVALID_PARAMS, message: "Ambiguous clientEventId, provide type" });
    }

    if (!statEvent) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Activity not found" });
    }

    return res.status(200).send({ ok: true, data: statEvent });
  } catch (error: any) {
    next(error);
  }
});

router.post("/", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;
    const body = zod
      .object({
        type: zod.enum(["apply", "account"]).default("apply"),
        clickId: zod.string().optional(),
        missionId: zod.string().optional(),
        missionClientId: zod.string().optional(),
        tag: zod.string().optional(),
      })
      .refine((data) => data.clickId || data.missionId || data.missionClientId, {
        message: "clickId, missionId or missionClientId is required",
      })
      .refine((data) => !data.clickId || !data.missionId, {
        message: "missionId cannot be used together with clickId",
      })
      .refine((data) => data.clickId || !data.missionId || !data.missionClientId, {
        message: "missionId and missionClientId cannot be used together without clickId",
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: JSON.parse(body.error.message) });
    }

    let click: StatEventRecord | null = null;
    if (body.data.clickId) {
      click = await statEventService.findOneStatEventById(body.data.clickId);
      if (!click) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Click not found" });
      }
    }

    const obj = {
      tag: body.data.tag || click?.tag || "",
      isBot: false,
      isHuman: true,

      host: req.get("host"),
      origin: req.get("origin"),
      referer: req.header("referer") || "not_defined",
      createdAt: new Date(),
      source: "publisher",
      sourceName: user.name,
      sourceId: user.id,
      type: body.data.type,
      status: "PENDING",
    } as StatEventRecord;

    if (click) {
      obj.clickId = click._id;
      obj.fromPublisherId = click.fromPublisherId;
      obj.toPublisherId = user.id;
    }

    if (click && body.data.missionClientId) {
      const mission = await missionService.findOneMissionBy({ clientId: body.data.missionClientId, publisherId: user.id });
      if (!mission) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
      }

      obj.missionId = mission.id;
    }

    if (!click && body.data.missionClientId) {
      const mission = await missionService.findOneMissionBy({ clientId: body.data.missionClientId, publisherId: user.id });
      if (!mission) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
      }

      obj.missionId = mission.id;
      obj.fromPublisherId = user.id;
      obj.toPublisherId = mission.publisherId;
    } else if (!click && body.data.missionId) {
      const mission = await missionService.findOneMissionBy({
        id: body.data.missionId,
        statusCode: "ACCEPTED",
        deletedAt: null,
      });
      if (!mission) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
      }

      const canAccessMission = await publisherDiffusionRuleService.canPublisherAccessMission({ publisherId: user.id, missionId: mission.id });
      if (!canAccessMission) {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Mission not accessible" });
      }

      obj.missionId = mission.id;
      obj.fromPublisherId = user.id;
      obj.toPublisherId = mission.publisherId;
    }

    const id = await statEventService.createStatEvent(obj);

    return res.status(200).send({ ok: true, data: { ...obj, _id: id } });
  } catch (error: any) {
    next(error);
  }
});

router.put("/:id", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    const body = zod
      .object({
        status: zod.enum(["PENDING", "VALIDATED", "CANCELED", "REFUSED", "CARRIED_OUT"]),
        type: zod.enum(["apply", "account"]).optional(),
      })
      .safeParse(req.body);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: JSON.parse(params.error.message) });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: JSON.parse(body.error.message) });
    }

    const { statEvent, ambiguous } = await statEventService.findStatEventByIdOrClientEventId({
      id: params.data.id,
      toPublisherId: user.id,
      type: body.data.type as "apply" | "account" | undefined,
    });
    if (ambiguous) {
      return res.status(409).send({ ok: false, code: INVALID_PARAMS, message: "Ambiguous clientEventId, provide type" });
    }
    if (!statEvent) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Activity not found" });
    }

    const obj = {
      status: body.data.status,
    };

    await statEventService.updateStatEvent(statEvent._id, obj);

    return res.status(200).send({ ok: true, data: { ...statEvent, ...obj } });
  } catch (error: any) {
    next(error);
  }
});

export default router;
