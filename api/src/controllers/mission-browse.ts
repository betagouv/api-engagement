import { NextFunction, RequestHandler, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "@/config";
import { INVALID_QUERY, NOT_FOUND, SERVICE_UNAVAILABLE, captureException } from "@/error";
import { ipRateLimiter, plateformRateLimiter } from "@/middlewares/rate-limit";
import { MissionBrowseIndexUnavailableError, missionBrowseService, type MissionBrowseWidgetFilters } from "@/services/mission-browse";
import { buildWidgetBaseFilter } from "@/services/mission-browse/widget-filters";
import { INDEXED_TAXONOMY_KEYS } from "@/services/search/collections/missions/fields";
import { widgetService } from "@/services/widget";
import type { PublisherRequest } from "@/types/passport";
import type { PublisherRecord } from "@/types/publisher";
import type { WidgetRecord } from "@/types/widget";
import { getDistanceKm } from "@/utils";

const router = Router();

const optionalPublisherAuthentication: RequestHandler = (req, res, next) =>
  passport.authenticate(["apikey", "api"], { session: false }, (error: unknown, user?: PublisherRecord) => {
    if (error) {
      return next(error);
    }
    req.user = user;
    next();
  })(req, res, next);

const contextualRateLimiter: RequestHandler = (req, res, next) => (req.user ? plateformRateLimiter : ipRateLimiter)(req, res, next);
const stringOrStringArraySchema = zod.union([zod.string(), zod.array(zod.string())]);
const taxonomyQueryShape = Object.fromEntries(INDEXED_TAXONOMY_KEYS.map((key) => [key, stringOrStringArraySchema.optional()]));

const browseQuerySchema = zod
  .object({
    widgetId: zod.string().optional(),
    widgetName: zod.string().optional(),
    publisherId: stringOrStringArraySchema.optional(),
    departmentCode: stringOrStringArraySchema.optional(),
    ...taxonomyQueryShape,
    search: zod.string().optional(),
    organization: stringOrStringArraySchema.optional(),
    department: stringOrStringArraySchema.optional(),
    domain: stringOrStringArraySchema.optional(),
    remote: stringOrStringArraySchema.optional(),
    country: stringOrStringArraySchema.optional(),
    schedule: stringOrStringArraySchema.optional(),
    action: stringOrStringArraySchema.optional(),
    beneficiary: stringOrStringArraySchema.optional(),
    minor: stringOrStringArraySchema.optional(),
    accessibility: stringOrStringArraySchema.optional(),
    start: zod.coerce.date().optional(),
    duration: zod.coerce.number().int().min(0).optional(),
    lat: zod.coerce.number().min(-90).max(90).optional(),
    lon: zod.coerce.number().min(-180).max(180).optional(),
    page: zod.coerce.number().int().positive().default(1),
    pageSize: zod.coerce.number().int().positive().max(100).default(20),
  })
  .refine((query) => !(query.widgetId && query.widgetName), { message: "widgetId and widgetName are mutually exclusive" });

const findPublicWidget = async (id?: string, name?: string): Promise<WidgetRecord | null> => {
  const widget = id ? await widgetService.findOneWidgetById(id) : name ? await widgetService.findOneWidgetByName(name) : null;
  return widget?.active && !widget.deletedAt ? widget : null;
};

const resolveRemote = (remote: string | string[] | undefined, widget: WidgetRecord): string[] | undefined => {
  const values = remote === undefined ? undefined : Array.isArray(remote) ? remote : [remote];
  if (values?.includes("yes") && !values.includes("no")) {
    return ["full", "possible"];
  }
  if (values?.includes("no") && !values.includes("yes")) {
    return ["no", "local"];
  }
  if (values) {
    return undefined;
  }
  if (!values && widget.type === "volontariat") {
    return ["no", "local"];
  }
  return undefined;
};

const resolveWidgetFilters = (query: zod.infer<typeof browseQuerySchema>, widget: WidgetRecord): MissionBrowseWidgetFilters => {
  const widgetLocation = widget.location;
  const lat = widgetLocation?.lat ?? query.lat;
  const lon = widgetLocation?.lon ?? query.lon;
  const distanceKm =
    lat !== undefined && lon !== undefined ? getDistanceKm(widgetLocation ? (widget.distance && widget.distance !== "Aucun" ? widget.distance : "50km") : "50km") : undefined;

  return {
    search: query.search,
    organization: query.organization,
    department: query.department,
    domain: query.domain,
    remote: resolveRemote(query.remote, widget),
    country: query.country,
    schedule: query.schedule,
    action: query.action,
    beneficiary: query.beneficiary,
    minor: query.minor,
    accessibility: query.accessibility,
    start: query.start,
    duration: query.duration,
    lat,
    lon,
    distanceKm,
  };
};

router.get("/browse", optionalPublisherAuthentication, contextualRateLimiter, async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    if ("fromPublisherId" in req.query) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: "fromPublisherId is not accepted" });
    }
    const query = browseQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const widgetMode = Boolean(query.data.widgetId || query.data.widgetName);
    if (widgetMode && req.user) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: "Authentication and widget context are mutually exclusive" });
    }
    if (widgetMode && query.data.publisherId) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: "publisherId is determined by the widget" });
    }
    if (!widgetMode && !req.user) {
      return res.status(401).send({ ok: false, message: "Authentication or widget context is required" });
    }

    const { widgetId, widgetName, ...browseFilters } = query.data;

    if (widgetMode) {
      const widget = await findPublicWidget(widgetId, widgetName);
      if (!widget) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Widget not found" });
      }
      const baseFilterBy = await buildWidgetBaseFilter(widget);
      const result = await missionBrowseService.browse({
        ...browseFilters,
        ...resolveWidgetFilters(query.data, widget),
        diffuseurPublisherId: widget.fromPublisherId,
        baseFilterBy,
        widgetMode: true,
        moderatedBy: widget.jvaModeration ? PUBLISHER_IDS.JEVEUXAIDER : null,
      });
      return res.status(200).send({ ok: true, data: result, request: (req as PublisherRequest & { requestId?: string }).requestId });
    }

    const publisher = req.user as PublisherRecord;
    const result = await missionBrowseService.browse({ ...browseFilters, diffuseurPublisherId: publisher.id });
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

router.get("/browse/:id", passport.authenticate(["apikey", "api"], { session: false }), plateformRateLimiter, async (req: PublisherRequest, res: Response, next: NextFunction) => {
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
