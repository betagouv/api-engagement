import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { captureMessage, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import { missionService } from "../services/mission";
import { publisherService } from "../services/publisher";
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
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const statEvent = await statEventService.findOneStatEventById(params.data.id);

    if (!statEvent) {
      res.locals = { code: NOT_FOUND };
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    res.locals = { total: 1 };
    return res.status(200).send({ ok: true, data: statEvent });
  } catch (error: any) {
    next(error);
  }
});

router.post("/:missionId/:publisherId/click", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        tag: zod.string().optional(),
      })
      .safeParse(req.query);

    const params = zod
      .object({
        missionId: zod.string(),
        publisherId: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    if (!query.success) {
      res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const mission = await missionService.findMissionByAnyId(params.data.missionId);
    if (!mission) {
      captureMessage("[V2] Mission not found", `mission ${params.data.missionId}`);
      res.locals = { code: NOT_FOUND };
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
    }

    const publisher = await publisherService.findOnePublisherById(params.data.publisherId);
    if (!publisher) {
      res.locals = { code: NOT_FOUND };
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    const obj = {
      missionId: mission._id.toString(),
      missionClientId: mission.clientId || "",
      missionDomain: mission.domain || "",
      missionTitle: mission.title || "",
      missionPostalCode: mission.postalCode || "",
      missionDepartmentName: mission.departmentName || "",
      missionOrganizationName: mission.organizationName || "",
      missionOrganizationId: mission.organizationId || "",

      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,

      fromPublisherId: publisher.id,
      fromPublisherName: publisher.name,

      tag: query.data.tag || "",

      host: req.get("host"),
      origin: req.get("origin"),
      referer: req.header("referer") || "not_defined",
      createdAt: new Date(),
      source: "publisher",
      sourceName: publisher.name,
      sourceId: publisher.id,
      type: "click",
    } as StatEventRecord;

    const id = await statEventService.createStatEvent(obj);

    return res.status(200).send({ ok: true, data: { ...obj, _id: id } });
  } catch (error: any) {
    next(error);
  }
});

router.post("/:missionId/apply", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;
    const query = zod
      .object({
        tag: zod.string().optional(),
        clickId: zod.string().optional(),
      })
      .safeParse(req.query);

    const params = zod
      .object({
        missionId: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    if (!query.success) {
      res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const mission = await missionService.findMissionByAnyId(params.data.missionId);
    if (!mission) {
      captureMessage("[V2] Mission not found", `mission ${params.data.missionId}`);
      res.locals = { code: NOT_FOUND };
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
    }

    let clickId;
    if (query.data.clickId) {
      try {
        const response = await statEventService.findOneStatEventById(query.data.clickId);
        if (response) {
          clickId = response;
        }
      } catch (error) {}
    }

    const obj = {
      clickId: clickId?._id,

      missionId: mission._id.toString(),
      missionClientId: mission.clientId || "",
      missionDomain: mission.domain || "",
      missionTitle: mission.title || "",
      missionPostalCode: mission.postalCode || "",
      missionDepartmentName: mission.departmentName || "",
      missionOrganizationName: mission.organizationName || "",
      missionOrganizationId: mission.organizationId || "",

      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,

      fromPublisherId: user.id,
      fromPublisherName: user.name,

      tag: query.data.tag || clickId?.tag || "",

      host: req.get("host"),
      origin: req.get("origin"),
      referer: req.header("referer") || "not_defined",
      createdAt: new Date(),
      source: "publisher",
      sourceName: user.name,
      sourceId: user.id,
      type: "apply",
      status: "PENDING",
    } as StatEventRecord;

    const id = await statEventService.createStatEvent(obj);

    return res.status(200).send({ ok: true, data: { ...obj, _id: id } });
  } catch (error: any) {
    next(error);
  }
});

router.put("/:activityId", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        activityId: zod.string(),
      })
      .safeParse(req.params);

    const body = zod
      .object({
        status: zod.enum(["PENDING", "VALIDATED", "CANCEL", "CANCELED", "REFUSED", "CARRIED_OUT"]),
      })
      .safeParse(req.body);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    if (!body.success) {
      res.locals = { code: INVALID_BODY, message: JSON.stringify(body.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: body.error });
    }

    const stats = await statEventService.findOneStatEventById(params.data.activityId);

    if (!stats) {
      res.locals = { code: NOT_FOUND };
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const obj = {
      status: body.data.status,
    };

    await statEventService.updateStatEvent(params.data.activityId, obj);

    return res.status(200).send({ ok: true, data: { ...stats, ...obj } });
  } catch (error: any) {
    next(error);
  }
});

export default router;
