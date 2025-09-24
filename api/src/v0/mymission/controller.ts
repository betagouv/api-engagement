import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { JVA_MODERATION_COMMENTS_LABELS } from "../../constants/moderation";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../../error";
import MissionModel from "../../models/mission";
import RequestModel from "../../models/request";
import { Mission, Publisher } from "../../types";
import { PublisherRequest } from "../../types/passport";
import { getMissionStatsSummary, getMissionStatsWithDetails } from "./stats";

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
      route: `/v0/mymission${req.route.path}`,
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

router.get("/", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as Publisher;
    const query = zod
      .object({
        limit: zod.coerce.number().int().max(10000).default(50),
        skip: zod.coerce.number().int().default(0),
      })
      .safeParse(req.query);

    if (!query.success) {
      res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const where = { deleted: false, publisherId: user._id.toString() };

    const total = await MissionModel.countDocuments(where);
    const data = await MissionModel.find(where)
      .sort({ createdAt: -1 })
      .skip(query.data.skip)
      .limit(query.data.limit)
      .lean();

    res.locals = { total };
    return res.status(200).send({
      ok: true,
      total,
      limit: query.data.limit,
      skip: query.data.skip,
      data: data.map(buildData),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:clientId", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as Publisher;
    const params = zod
      .object({
        clientId: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const mission = await MissionModel.findOne({
      clientId: params.data.clientId,
      publisherId: user._id.toString(),
    }).lean();
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const stats = await getMissionStatsWithDetails(mission._id.toString());
    res.locals = { total: 1 };
    return res.status(200).send({ ok: true, data: { ...buildData(mission), stats } });
  } catch (error: any) {
    next(error);
  }
});

router.get("/:clientId/stats", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as Publisher;
    const params = zod
      .object({
        clientId: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const mission = await MissionModel.findOne({
      clientId: params.data.clientId,
      publisherId: user._id.toString(),
    }).lean();
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const data = await getMissionStatsSummary(mission._id.toString());
    res.locals = { total: 1 };
    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    if (error.statusCode === 404) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    next(error);
  }
});

const buildData = (data: Mission) => {
  const address = data.addresses[0];
  const moderationComment = JVA_MODERATION_COMMENTS_LABELS[data.moderation_5f5931496c7ea514150a818f_comment || ""] || data.moderation_5f5931496c7ea514150a818f_comment;
  return {
    _id: data._id,
    id: data._id,
    clientId: data.clientId,
    publisherId: data.publisherId,
    activity: data.activity,
    address: address ? address.street : undefined,
    city: address ? address.city : undefined,
    country: address ? address.country : undefined,
    departmentCode: address ? address.departmentCode : undefined,
    departmentName: address ? address.departmentName : undefined,
    region: address ? address.region : undefined,
    location: address ? address.location : undefined,
    postalCode: address ? address.postalCode : undefined,
    addresses: data.addresses,
    applicationUrl: data.applicationUrl,
    associationLogo: data.associationLogo,
    associationAddress: data.associationAddress,
    associationCity: data.associationCity,
    associationDepartmentCode: data.associationDepartmentCode,
    associationDepartmentName: data.associationDepartmentName,
    associationId: data.associationId,
    associationName: data.associationName,
    associationRNA: data.associationRNA,
    associationPostalCode: data.associationPostalCode,
    associationRegion: data.associationRegion,
    associationReseaux: data.associationReseaux,
    associationSiren: data.associationSiren,
    associationSources: data.associationSources,
    audience: data.audience,
    closeToTransport: data.closeToTransport,
    createdAt: data.createdAt,
    deleted: data.deleted,
    deletedAt: data.deletedAt,
    description: data.description,
    descriptionHtml: data.descriptionHtml,
    domain: data.domain,
    domainLogo: data.domainLogo,
    duration: data.duration,
    endAt: data.endAt,
    lastSyncAt: data.lastSyncAt,
    metadata: data.metadata,
    moderation_5f5931496c7ea514150a818f_comment: moderationComment,
    moderation_5f5931496c7ea514150a818f_status: data.moderation_5f5931496c7ea514150a818f_status,
    moderation_5f5931496c7ea514150a818f_date: data.moderation_5f5931496c7ea514150a818f_date,
    moderation_5f5931496c7ea514150a818f_title: data.moderation_5f5931496c7ea514150a818f_title,
    openToMinors: data.openToMinors,
    organizationActions: data.organizationActions,
    organizationBeneficiaries: data.organizationBeneficiaries,
    organizationCity: data.organizationCity,
    organizationClientId: data.organizationClientId,
    organizationDescription: data.organizationDescription,
    organizationFullAddress: data.organizationFullAddress,
    organizationId: data.organizationId,
    organizationLogo: data.organizationLogo,
    organizationName: data.organizationName,
    organizationPostCode: data.organizationPostCode,
    organizationRNA: data.organizationRNA,
    organizationReseaux: data.organizationReseaux,
    organizationSiren: data.organizationSiren,
    organizationStatusJuridique: data.organizationStatusJuridique,
    organizationType: data.organizationType,
    organizationUrl: data.organizationUrl,
    places: data.places,
    postedAt: data.postedAt,
    priority: data.priority,
    publisherLogo: data.publisherLogo,
    publisherName: data.publisherName,
    publisherUrl: data.publisherUrl,
    reducedMobilityAccessible: data.reducedMobilityAccessible,
    remote: data.remote,
    schedule: data.schedule,
    snu: data.snu,
    snuPlaces: data.snuPlaces,
    softSkills: data.softSkills,
    romeSkills: data.romeSkills,
    requirements: data.requirements,
    startAt: data.startAt,
    statusCode: data.statusCode,
    statusComment: data.statusComment,
    statusCommentHistoric: data.statusCommentHistoric,
    tags: data.tags,
    tasks: data.tasks,
    title: data.title,
    type: data.type,
    updatedAt: data.updatedAt,
  };
};

export default router;
