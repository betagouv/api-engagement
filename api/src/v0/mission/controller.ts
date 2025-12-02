import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "../../config";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../../error";
import { missionService } from "../../services/mission";
import { publisherDiffusionExclusionService } from "../../services/publisher-diffusion-exclusion";
import type { MissionRecord, MissionRemote, MissionSearchFilters } from "../../types/mission";
import { PublisherRequest } from "../../types/passport";
import type { PublisherRecord } from "../../types/publisher";
import { getDistanceFromLatLonInKm, getDistanceKm } from "../../utils";
import { NO_PARTNER, NO_PARTNER_MESSAGE } from "./constants";
import { buildData } from "./transformer";
import { findMissionById, normalizeQueryArray, parseDateFilter } from "./utils";

export const missionQuerySchema = zod.object({
  activity: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  city: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  clientId: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  country: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  createdAt: zod.string().optional(),
  departmentName: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  distance: zod.string().optional(),
  domain: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  keywords: zod.string().optional(),
  limit: zod.coerce.number().min(0).max(10000).default(25),
  lat: zod.coerce.number().optional(),
  lon: zod.coerce.number().optional(),
  openToMinors: zod.string().optional(), // TODO: put enum
  organizationRNA: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  organizationStatusJuridique: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  publisher: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  remote: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  reducedMobilityAccessible: zod.string().optional(), // TODO: put enum
  skip: zod.coerce.number().min(0).default(0),
  snu: zod
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  startAt: zod.string().optional(),
  type: zod.union([zod.string(), zod.array(zod.string())]).optional(),
});

const router = Router();

router.get("/", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

    const query = missionQuerySchema.safeParse(req.query);

    if (!query.success) {
      res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    if (!user.publishers || !user.publishers.length) {
      res.locals = { code: NO_PARTNER, message: NO_PARTNER_MESSAGE };
      return res.status(400).send({ ok: false, code: NO_PARTNER, message: NO_PARTNER_MESSAGE });
    }

    if (req.query.size && query.data.limit === 10000) {
      query.data.limit = parseInt(req.query.size as string, 10);
    }
    if (req.query.from && query.data.skip === 0) {
      query.data.skip = parseInt(req.query.from as string, 10);
    }

    const diffusionExclusions = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(user.id);
    const excludedIds = diffusionExclusions.map((e) => e.organizationClientId).filter((id): id is string => id !== null);

    const normalizePublisherIds = (publisher: string | string[] | undefined): string[] => {
      const values = normalizeQueryArray(publisher);
      if (!values) {
        return user.publishers.map((p) => p.diffuseurPublisherId);
      }
      return values.filter((publisherId: string) => user.publishers.some((p) => p.diffuseurPublisherId === publisherId));
    };

    const publisherIds = normalizePublisherIds(query.data.publisher);
    if (!publisherIds.length) {
      res.locals = { code: NO_PARTNER, message: NO_PARTNER_MESSAGE };
      return res.status(400).send({ ok: false, code: NO_PARTNER, message: NO_PARTNER_MESSAGE });
    }

    const filters: MissionSearchFilters = {
      publisherIds,
      excludeOrganizationClientIds: excludedIds.length ? excludedIds : undefined,
      moderationAcceptedFor: user.moderator ? user.id : undefined,
      activity: normalizeQueryArray(query.data.activity),
      city: normalizeQueryArray(query.data.city),
      clientId: normalizeQueryArray(query.data.clientId),
      country: normalizeQueryArray(query.data.country),
      createdAt: parseDateFilter(query.data.createdAt),
      departmentName: normalizeQueryArray(query.data.departmentName),
      domain: normalizeQueryArray(query.data.domain),
      keywords: query.data.keywords ?? undefined,
      organizationRNA: normalizeQueryArray(query.data.organizationRNA),
      organizationStatusJuridique: normalizeQueryArray(query.data.organizationStatusJuridique),
      openToMinors: query.data.openToMinors,
      reducedMobilityAccessible: query.data.reducedMobilityAccessible,
      remote: normalizeQueryArray(query.data.remote) as MissionRemote[] | undefined,
      snu: query.data.snu,
      startAt: parseDateFilter(query.data.startAt),
      type: normalizeQueryArray(query.data.type),
      limit: query.data.limit,
      skip: query.data.skip,
    };

    if (user.id === PUBLISHER_IDS.BOUYGUES_TELECOM) {
      filters.excludeOrganizationName = "APF France handicap - Délégations de Haute-Saône et du Territoire de Belfort";
    }

    if (query.data.lat && query.data.lon) {
      const rawDistance = query.data.distance && (query.data.distance === "0" || query.data.distance === "0km") ? "10km" : query.data.distance || "50km";
      filters.lat = query.data.lat;
      filters.lon = query.data.lon;
      filters.distanceKm = getDistanceKm(rawDistance);
    }

    const { data, total } = await missionService.findMissions(filters);

    res.locals = { total };
    return res.status(200).send({
      ok: true,
      total,
      data: data.map((e: MissionRecord) => buildData(e, user.id, user.moderator)),
      limit: query.data.limit,
      skip: query.data.skip,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/search", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

    const query = missionQuerySchema
      .extend({
        text: zod.string().optional(), // Legacy text param, not documented anymore
      })
      .safeParse(req.query);

    if (!query.success) {
      res.locals = { code: INVALID_QUERY, message: JSON.stringify(query.error) };
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    if (!user.publishers || !user.publishers.length) {
      res.locals = { code: NO_PARTNER, message: NO_PARTNER_MESSAGE };
      return res.status(400).send({ ok: false, code: NO_PARTNER, message: NO_PARTNER_MESSAGE });
    }

    if (req.query.size && query.data.limit === 10000) {
      query.data.limit = parseInt(req.query.size as string, 10);
    }
    if (req.query.from && query.data.skip === 0) {
      query.data.skip = parseInt(req.query.from as string, 10);
    }

    const diffusionExclusions = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(user.id);
    const excludedIds = diffusionExclusions.map((e) => e.organizationClientId).filter((id): id is string => id !== null);

    const normalizePublisherIds = (publisher: string | string[] | undefined): string[] => {
      const values = normalizeQueryArray(publisher);
      if (!values) {
        return user.publishers.map((p) => p.diffuseurPublisherId);
      }
      return values.filter((publisherId: string) => user.publishers.some((p) => p.diffuseurPublisherId === publisherId));
    };

    const publisherIds = normalizePublisherIds(query.data.publisher);
    if (!publisherIds.length) {
      res.locals = { code: NO_PARTNER, message: NO_PARTNER_MESSAGE };
      return res.status(400).send({ ok: false, code: NO_PARTNER, message: NO_PARTNER_MESSAGE });
    }

    const filters: MissionSearchFilters = {
      publisherIds,
      excludeOrganizationClientIds: excludedIds.length ? excludedIds : undefined,
      moderationAcceptedFor: user.moderator ? user.id : undefined,
      activity: normalizeQueryArray(query.data.activity),
      city: normalizeQueryArray(query.data.city),
      clientId: normalizeQueryArray(query.data.clientId),
      organizationClientId: normalizeQueryArray(query.data.clientId),
      country: normalizeQueryArray(query.data.country),
      createdAt: parseDateFilter(query.data.createdAt),
      departmentName: normalizeQueryArray(query.data.departmentName),
      domain: normalizeQueryArray(query.data.domain),
      keywords: query.data.keywords || query.data.text || undefined,
      organizationRNA: normalizeQueryArray(query.data.organizationRNA),
      organizationStatusJuridique: normalizeQueryArray(query.data.organizationStatusJuridique),
      openToMinors: query.data.openToMinors,
      reducedMobilityAccessible: query.data.reducedMobilityAccessible,
      remote: normalizeQueryArray(query.data.remote) as MissionRemote[] | undefined,
      startAt: parseDateFilter(query.data.startAt),
      type: normalizeQueryArray(query.data.type),
      snu: query.data.snu,
      limit: query.data.limit,
      skip: query.data.skip,
    };

    if (query.data.lat && query.data.lon) {
      const rawDistance = query.data.distance && (query.data.distance === "0" || query.data.distance === "0km") ? "10km" : query.data.distance || "50km";
      filters.lat = query.data.lat;
      filters.lon = query.data.lon;
      filters.distanceKm = getDistanceKm(rawDistance);
    }

    const { data, total, facets } = await missionService.findMissionsWithFacets(filters);

    res.locals = { total };
    return res.status(200).send({
      ok: true,
      total,
      hits: data.map((e: MissionRecord) => ({
        ...buildData(e, user.id, user.moderator),
        _distance: getDistanceFromLatLonInKm(query.data.lat, query.data.lon, e.addresses[0]?.location?.lat, e.addresses[0]?.location?.lon),
      })),
      facets: {
        departmentName: facets.departmentName.map((bucket) => ({
          key: bucket.key,
          doc_count: bucket.count,
        })),
        activities: facets.activity.map((bucket) => ({
          key: bucket.key,
          doc_count: bucket.count,
        })),
        domains: facets.domain.map((bucket) => ({
          key: bucket.key,
          doc_count: bucket.count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const mission = await findMissionById(params.data.id);
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    res.locals = { total: 1 };
    return res.status(200).send({ ok: true, data: buildData(mission, user.id, user.moderator) });
  } catch (error: any) {
    next(error);
  }
});

export default router;
