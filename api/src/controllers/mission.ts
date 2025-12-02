import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import { missionService } from "../services/mission";
import { publisherService } from "../services/publisher";
import type { UserRequest } from "../types/passport";
import type { MissionRecord } from "../types/mission";
import { EARTH_RADIUS, diacriticSensitiveRegex, getDistanceKm } from "../utils";

const router = Router();

const searchSchema = zod.object({
  status: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  comment: zod.string().optional(),
  type: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  publisherId: zod.string().optional(),
  domain: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  organization: zod.string().optional(),
  activity: zod.string().optional(),
  city: zod.string().optional(),
  department: zod.string().optional(),
  search: zod.string().optional(),
  availableFrom: zod.coerce.date().optional(),
  availableTo: zod.coerce.date().optional(),
  size: zod.coerce.number().int().min(0).default(25),
  from: zod.coerce.number().int().min(0).default(0),
  sort: zod.string().optional(),
  publishers: zod.array(zod.string()).optional(),
  jvaModeration: zod.boolean().optional(),
  lat: zod.coerce.number().min(-90).max(90).optional(),
  lon: zod.coerce.number().min(-180).max(180).optional(),
  location: zod.string().optional(),
  distance: zod.string().optional(),
  rules: zod
    .array(
      zod.object({
        field: zod.string(),
        operator: zod.string(),
        value: zod.string(),
        combinator: zod.string(),
      })
    )
    .optional(),
  leboncoinStatus: zod.string().optional(),
});

const autocompleteSchema = zod.object({
  publishers: zod.array(zod.string()).optional(),
  field: zod.string(),
  search: zod.string(),
});

const findFilters = (user: UserRequest["user"], body: zod.infer<typeof searchSchema>) => {
  const publisherIds = (() => {
    if (body.publisherId) {
      if (user.role !== "admin" && !user.publishers.includes(body.publisherId)) {
        throw new Error("FORBIDDEN");
      }
      return [body.publisherId];
    }
    if (body.publishers?.length) {
      if (user.role !== "admin") {
        const allowed = body.publishers.filter((id) => user.publishers.includes(id));
        if (!allowed.length) throw new Error("FORBIDDEN");
        return allowed;
      }
      return body.publishers;
    }
    if (user.role !== "admin") return user.publishers;
    return [];
  })();

  const asArray = (value?: string | string[]) => {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  };

  const filters: any = {
    publisherIds,
    limit: body.size,
    skip: body.from,
    domain: asArray(body.domain),
    activity: asArray(body.activity),
    city: asArray(body.city),
    departmentName: asArray(body.department),
    type: asArray(body.type),
  };

  if (body.status) {
    filters.statusCode = Array.isArray(body.status) ? (body.status[0] as any) : (body.status as any);
  }
  if (body.comment) filters.statusComment = body.comment;
  if (body.organization) filters.organizationName = body.organization;
  if (body.search) {
    const text = diacriticSensitiveRegex(body.search);
    filters.keywords = text;
  }
  if (body.lat && body.lon) {
    const distance = getDistanceKm(body.distance && body.distance !== "Aucun" ? body.distance : "25km");
    filters.lat = body.lat;
    filters.lon = body.lon;
    filters.distanceKm = distance;
  }
  if (body.leboncoinStatus) filters.leboncoinStatus = body.leboncoinStatus;
  if (body.jvaModeration) {
    filters.moderationAcceptedFor = PUBLISHER_IDS.JEVEUXAIDER;
    filters.publisherIds = Array.from(new Set([...(filters.publisherIds ?? []), PUBLISHER_IDS.JEVEUXAIDER]));
  }

  // Soft delete handling: if no availableFrom/To provided, exclude deleted missions
  if (body.availableTo) {
    filters.createdAt = { ...(filters.createdAt ?? {}), lt: body.availableTo };
  }
  return filters;
};

const computeFacets = (missions: MissionRecord[]) => {
  const count = (getter: (m: MissionRecord) => string | null | undefined) => {
    const map = new Map<string, number>();
    missions.forEach((m) => {
      const key = getter(m);
      if (!key) return;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, doc_count: count }));
  };

  return {
    status: count((m) => m.statusCode || undefined),
    comments: count((m) => m.statusComment || undefined),
    type: count((m) => m.type || undefined),
    domains: count((m) => m.domain || undefined),
    organizations: count((m) => m.organizationName || undefined),
    activities: count((m) => m.activity || undefined),
    cities: count((m) => m.city || undefined),
    departments: count((m) => m.departmentName || undefined),
    partners: count((m) => m.publisherId || undefined).map((row) => ({
      _id: row.key,
      count: row.doc_count,
      name: undefined as string | undefined,
      mission_type: undefined as string | undefined,
    })),
    leboncoinStatus: count((m) => m.leboncoinStatus || undefined),
  };
};

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = searchSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    let filters;
    try {
      filters = findFilters(req.user, body.data);
    } catch (error: any) {
      if (error.message === "FORBIDDEN") {
        return res.status(403).send({ ok: false, code: FORBIDDEN });
      }
      throw error;
    }

    const { data, total } = await missionService.findMissions(filters);
    const aggs = computeFacets(data);

    // partners facet needs publisher names; enrich from service
    aggs.partners = await Promise.all(
      aggs.partners.map(async (p) => {
        const publisher = await publisherService.findOnePublisherById(p._id);
        return {
          ...p,
          name: publisher?.name,
          mission_type: publisher?.missionType === "volontariat_service_civique" ? "volontariat" : "benevolat",
        };
      })
    );

    return res.status(200).send({ ok: true, data, total, aggs });
  } catch (error) {
    next(error);
  }
});

router.get("/autocomplete", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = autocompleteSchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const missions = await missionService.findMissions({
      publisherIds: query.data.publishers ?? [],
      limit: 1000,
      skip: 0,
      domain: undefined,
    });

    const values = new Map<string, number>();
    missions.data.forEach((mission) => {
      const fieldValue = (mission as any)[query.data.field];
      if (Array.isArray(fieldValue)) {
        fieldValue.forEach((val) => {
          if (typeof val === "string" && new RegExp(query.data.search, "i").test(val)) {
            values.set(val, (values.get(val) ?? 0) + 1);
          }
        });
      } else if (typeof fieldValue === "string" && new RegExp(query.data.search, "i").test(fieldValue)) {
        values.set(fieldValue, (values.get(fieldValue) ?? 0) + 1);
      }
    });

    const data = Array.from(values.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1000)
      .map(([key, count]) => ({ key, doc_count: count }));

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const data = await missionService.findOneMission(params.data.id);
    if (!data) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    next(error);
  }
});

router.delete("/:id", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    await missionService.update(params.data.id, { deletedAt: new Date() });
    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
