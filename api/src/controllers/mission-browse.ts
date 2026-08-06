import { NextFunction, Request, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "@/config";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, SERVICE_UNAVAILABLE, captureException } from "@/error";
import { corsPublic } from "@/middlewares/cors";
import { ipRateLimiter, plateformRateLimiter } from "@/middlewares/rate-limit";
import { MissionBrowseIndexUnavailableError, missionBrowseService, type MissionBrowseSearchFilters } from "@/services/mission-browse";
import { buildWidgetBaseFilter } from "@/services/mission-browse/widget-filters";
import { INDEXED_TAXONOMY_KEYS } from "@/services/search/collections/missions/fields";
import { widgetService } from "@/services/widget";
import type { MissionSearchFilters } from "@/types/mission";
import type { PublisherRequest } from "@/types/passport";
import type { PublisherRecord } from "@/types/publisher";
import type { WidgetRecord } from "@/types/widget";
import { getDistanceKm } from "@/utils";
import { normalizeToArray } from "@/utils/array";

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

const widgetBrowseQuerySchema = zod.object({
  accessibility: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  action: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  beneficiary: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  city: zod.string().optional(),
  country: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  department: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  domain: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  duration: zod.coerce.number().int().min(0).optional(),
  from: zod.coerce.number().int().min(0).default(0),
  lat: zod.coerce.number().min(-90).max(90).optional(),
  location: zod.string().optional(),
  lon: zod.coerce.number().min(-180).max(180).optional(),
  minor: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  organization: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  remote: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  schedule: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  search: zod.string().optional(),
  size: zod.coerce.number().int().positive().max(100).default(25),
  start: zod.coerce.date().optional(),
});

const resolveRemoteFilter = (remoteValues?: string[], widgetType?: string): Array<string> | undefined => {
  if (remoteValues?.includes("yes") && !remoteValues.includes("no")) {
    return ["full", "possible"];
  }
  if (remoteValues?.includes("no") && !remoteValues.includes("yes")) {
    return ["no", "local"];
  }
  if (!remoteValues && widgetType === "volontariat") {
    return ["no", "local"];
  }
};

const resolveLocationFilters = (widget: WidgetRecord, lon?: number, lat?: number): Pick<MissionSearchFilters, "lat" | "lon" | "distanceKm"> | undefined => {
  if (widget.location?.lat !== undefined && widget.location?.lon !== undefined) {
    return {
      lat: widget.location.lat,
      lon: widget.location.lon,
      distanceKm: getDistanceKm(widget.distance && widget.distance !== "Aucun" ? widget.distance : "50km"),
    };
  }
  if (lat !== undefined && lon !== undefined) {
    return { lat, lon, distanceKm: getDistanceKm("50km") };
  }
};

router.use(corsPublic);

router.get("/browse/widget/:id", ipRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = zod.object({ id: zod.string() }).safeParse(req.params);
    const query = widgetBrowseQuerySchema.safeParse(req.query);
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const widget = await widgetService.findOneWidgetById(params.data.id);
    if (!widget?.active || widget.deletedAt) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const location = resolveLocationFilters(widget, query.data.lon, query.data.lat);
    const filters: MissionBrowseSearchFilters = {
      search: query.data.search,
      organization: query.data.organization,
      department: query.data.department,
      domain: query.data.domain,
      remote: resolveRemoteFilter(normalizeToArray(query.data.remote), widget.type),
      country: query.data.country,
      schedule: query.data.schedule,
      action: query.data.action,
      beneficiary: query.data.beneficiary,
      minor: query.data.minor,
      accessibility: query.data.accessibility,
      start: query.data.start,
      duration: query.data.duration,
      ...location,
    };
    const result = await missionBrowseService.browse({
      ...filters,
      diffuseurPublisherId: widget.fromPublisherId,
      baseFilterBy: await buildWidgetBaseFilter(widget),
      widgetMode: true,
      moderatedBy: widget.jvaModeration ? PUBLISHER_IDS.JEVEUXAIDER : null,
      offset: query.data.from,
      page: Math.floor(query.data.from / query.data.size) + 1,
      pageSize: query.data.size,
    });

    return res.status(200).send({ ok: true, ...result, request: (req as Request & { requestId?: string }).requestId });
  } catch (error) {
    if (error instanceof MissionBrowseIndexUnavailableError) {
      captureException(error);
      return res.status(503).send({ ok: false, code: SERVICE_UNAVAILABLE, message: "Mission browse index is unavailable" });
    }
    next(error);
  }
});

router.use(passport.authenticate(["apikey", "api"], { session: false }));
router.use(plateformRateLimiter);

router.get("/browse", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const publisher = req.user as PublisherRecord;
    const query = browseQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }
    const result = await missionBrowseService.browse({ ...query.data, diffuseurPublisherId: publisher.id });
    return res.status(200).send({ ok: true, data: result });
  } catch (error) {
    if (error instanceof MissionBrowseIndexUnavailableError) {
      captureException(error);
      return res.status(503).send({ ok: false, code: SERVICE_UNAVAILABLE, message: "Mission browse index is unavailable" });
    }
    next(error);
  }
});

const missionIdSchema = zod.object({ id: zod.string() });
const missionDetailQuerySchema = zod.object({ addressId: zod.string().optional() });

router.get("/browse/:id", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const publisher = req.user as PublisherRecord;
    const params = missionIdSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: params.error });
    }
    const query = missionDetailQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }
    const result = await missionBrowseService.findById(params.data.id, publisher.id, query.data.addressId);
    if (!result) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Mission not found" });
    }
    return res.status(200).send({ ok: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
