import { NextFunction, Response, Router } from "express";
import passport from "passport";
import { v4 as uuidv4 } from "uuid";
import zod from "zod";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { captureMessage, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import MissionModel from "../models/mission";
import PublisherModel from "../models/publisher";
import RequestModel from "../models/request";
import { Stats } from "../types";
import { PublisherRequest } from "../types/passport";

const router = Router();

router.use(async (req: PublisherRequest, res: Response, next: NextFunction) => {
  res.on("finish", async () => {
    if (!req.route) {
      return;
    }
    const request = new RequestModel({
      method: req.method,
      key: req.headers["x-api-key"] || req.headers["apikey"],
      header: req.headers,
      route: `/v2/activity${req.route.path}`,
      query: req.query,
      params: req.params,
      body: req.body,
      status: res.statusCode,
      code: res.locals.code,
      message: res.locals.message,
      total: res.locals.total,
    });
    await request.save();
  });
  next();
});

router.get(
  "/:id",
  passport.authenticate(["apikey", "api"], { session: false }),
  async (req: PublisherRequest, res: Response, next: NextFunction) => {
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

      const response = await esClient.get({ index: STATS_INDEX, id: params.data.id });
      const data = { _id: response.body._id, ...response.body._source };

      res.locals = { total: 1 };
      return res.status(200).send({ ok: true, data });
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.locals = { code: NOT_FOUND };
        return res.status(404).send({ ok: false, code: NOT_FOUND });
      }
      next(error);
    }
  }
);

const findMissionTemp = async (missionId: string) => {
  if (!missionId.match(/[^0-9a-fA-F]/) && missionId.length === 24) {
    const mission = await MissionModel.findById(missionId);
    if (mission) {
      return mission;
    }
  }

  const mission = await MissionModel.findOne({ _old_ids: { $in: [missionId] } });
  if (mission) {
    captureMessage("[Temp] Mission found with _old_ids", `mission ${missionId}`);
    return mission;
  }

  const response2 = await esClient.search({
    index: STATS_INDEX,
    body: { query: { term: { "missionId.keyword": missionId } }, size: 1 },
  });
  if (response2.body.hits.total.value > 0) {
    const stats = {
      _id: response2.body.hits.hits[0]._id,
      ...response2.body.hits.hits[0]._source,
    } as Stats;
    const mission = await MissionModel.findOne({
      clientId: stats.missionClientId?.toString(),
      publisherId: stats.toPublisherId,
    });
    if (mission) {
      captureMessage("[Temp] Mission found with click", `mission ${missionId}`);
      return mission;
    }
  }
  return null;
};

router.post(
  "/:missionId/:publisherId/click",
  async (req: PublisherRequest, res: Response, next: NextFunction) => {
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

      const mission = await findMissionTemp(params.data.missionId);
      if (!mission) {
        captureMessage("[V2] Mission not found", `mission ${params.data.missionId}`);
        res.locals = { code: NOT_FOUND };
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
      }

      const publisher = await PublisherModel.findById(params.data.publisherId);
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

        fromPublisherId: publisher._id.toString(),
        fromPublisherName: publisher.name,

        tag: query.data.tag || "",

        host: req.get("host"),
        origin: req.get("origin"),
        referer: req.header("referer") || "not_defined",
        createdAt: new Date(),
        source: "publisher",
        sourceName: publisher.name,
        sourceId: publisher._id.toString(),
        type: "click",
      } as Stats;

      const id = uuidv4();
      await esClient.index({ index: STATS_INDEX, id, body: obj });

      return res.status(200).send({ ok: true, data: { ...obj, _id: id } });
    } catch (error: any) {
      next(error);
    }
  }
);

router.post(
  "/:missionId/apply",
  passport.authenticate(["apikey", "api"], { session: false }),
  async (req: PublisherRequest, res: Response, next: NextFunction) => {
    try {
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

      const mission = await findMissionTemp(params.data.missionId);
      if (!mission) {
        captureMessage("[V2] Mission not found", `mission ${params.data.missionId}`);
        res.locals = { code: NOT_FOUND };
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
      }

      let clickId;
      if (query.data.clickId) {
        try {
          const response = await esClient.get({ index: STATS_INDEX, id: query.data.clickId });
          clickId = { _id: response.body._id, ...response.body._source };
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

        fromPublisherId: req.user._id.toString(),
        fromPublisherName: req.user.name,

        tag: query.data.tag || clickId?.tag || "",

        host: req.get("host"),
        origin: req.get("origin"),
        referer: req.header("referer") || "not_defined",
        createdAt: new Date(),
        source: "publisher",
        sourceName: req.user.name,
        sourceId: req.user._id.toString(),
        type: "apply",
        status: "PENDING",
      } as Stats;

      const id = uuidv4();
      await esClient.index({ index: STATS_INDEX, id, body: obj });

      return res.status(200).send({ ok: true, data: { ...obj, _id: id } });
    } catch (error: any) {
      next(error);
    }
  }
);

router.put(
  "/:activityId",
  passport.authenticate(["apikey", "api"], { session: false }),
  async (req: PublisherRequest, res: Response, next: NextFunction) => {
    try {
      const params = zod
        .object({
          activityId: zod.string(),
        })
        .safeParse(req.params);

      const body = zod
        .object({
          status: zod.enum([
            "PENDING",
            "VALIDATED",
            "CANCEL",
            "CANCELED",
            "REFUSED",
            "CARRIED_OUT",
          ]),
        })
        .passthrough()
        .safeParse(req.body);

      if (!params.success) {
        res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
        return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
      }
      if (!body.success) {
        res.locals = { code: INVALID_BODY, message: JSON.stringify(body.error) };
        return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: body.error });
      }

      const response = await esClient.get({ index: STATS_INDEX, id: params.data.activityId });
      const stats = { _id: response.body._id, ...response.body._source };

      const obj = {
        status: body.data.status,
      };

      await esClient.update({ index: STATS_INDEX, id: params.data.activityId, body: { doc: obj } });

      return res.status(200).send({ ok: true, data: { ...stats, ...obj } });
    } catch (error: any) {
      if (error.statusCode === 404) {
        res.locals = { code: NOT_FOUND };
        return res.status(404).send({ ok: false, code: NOT_FOUND });
      }
      next(error);
    }
  }
);

export default router;
