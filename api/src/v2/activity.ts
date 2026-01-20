import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, INVALID_PARAMS, NOT_FOUND } from "../error";
import missionService from "../services/mission";
import { statEventService } from "../services/stat-event";
import { StatEventRecord } from "../types";
import { PublisherRequest } from "../types/passport";
import type { PublisherRecord } from "../types/publisher";

const router = Router();

router.get("/:id", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: JSON.parse(params.error.message) });
    }

    const statEvent = await statEventService.findOneStatEventById(params.data.id);

    if (!statEvent) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Activity not found" });
    }

    return res.status(200).send({ ok: true, data: statEvent });
  } catch (error: any) {
    next(error);
  }
});


router.post("/", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;
    const body = zod
      .object({
        type: zod.enum(["apply", "account"]).default("apply"),
        clickId: zod.string(),
        missionClientId: zod.string().optional(),
        tag: zod.string().optional(),
      })
      .safeParse(req.body);


    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: JSON.parse(body.error.message) });
    }

    const click:StatEventRecord | null = await statEventService.findOneStatEventById(body.data.clickId);
    if (!click) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Click not found" });
    }

    const obj = {
      clickId: click._id,
      fromPublisherId: click.fromPublisherId,
      toPublisherId: user.id || null,

      tag: body.data.tag || click.tag || "",
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

    if (body.data.missionClientId) {
      const mission = await missionService.findOneMissionBy({ clientId: body.data.missionClientId, publisherId: user.id });
      if (!mission) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
      }

      obj.missionId = mission.id;
      obj.missionClientId = mission.clientId;
      obj.missionDomain = mission.domain || undefined;
      obj.missionTitle = mission.title;
      obj.missionPostalCode = mission.postalCode || undefined;
      obj.missionDepartmentName = mission.departmentName || undefined;
      obj.missionOrganizationName = mission.organizationName || undefined;
      obj.missionOrganizationId = mission.organizationId || undefined;
      obj.missionOrganizationClientId = mission.organizationClientId || undefined;
    }

    const id = await statEventService.createStatEvent(obj);

    return res.status(200).send({ ok: true, data: { ...obj, _id: id } });
  } catch (error: any) {
    next(error);
  }
});

router.put("/:id", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    const body = zod
      .object({
        status: zod.enum(["PENDING", "VALIDATED", "CANCELED", "REFUSED", "CARRIED_OUT"]),
      })
      .safeParse(req.body);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: JSON.parse(params.error.message) });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: JSON.parse(body.error.message) });
    }

    const stats = await statEventService.findOneStatEventById(params.data.id);
    if (!stats) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Activity not found" });
    }

    const obj = {
      status: body.data.status,
    };

    await statEventService.updateStatEvent(params.data.id, obj);

    return res.status(200).send({ ok: true, data: { ...stats, ...obj } });
  } catch (error: any) {
    next(error);
  }
});

export default router;
