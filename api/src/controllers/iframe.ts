import cors from "cors";
import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, captureMessage } from "../error";
import { widgetService } from "../services/widget";
import { widgetMissionService } from "../services/widget-mission";
import { WidgetRecord } from "../types";
import type { MissionRecord, MissionSearchFilters, MissionSelect } from "../types/mission";
import { capitalizeFirstLetter, getDistanceKm } from "../utils";
import { normalizeToArray } from "../utils/array";
import { applyWidgetRules } from "../utils/widget";

const router = Router();

const MISSION_FIELDS: MissionSelect = {
  id: true,
  title: true,
  moderationStatuses: { select: { title: true } },
  domain: { select: { name: true } },
  domainLogo: true,
  publisherOrganization: { select: { organizationName: true } },
  organizationName: true,
  remote: true,
  addresses: { select: { city: true, country: true, postalCode: true } },
  places: true,
  tags: true,
};

router.get("/widget", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        id: zod.string().optional(),
        name: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    if (!query.data.id && !query.data.name) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: "Missing id or name" });
    }

    if (query.data.id) {
      const widget = await widgetService.findOneWidgetById(query.data.id);
      if (!widget) {
        return res.status(404).send({ ok: false, code: NOT_FOUND });
      }
      return res.status(200).send({ ok: true, data: widget });
    } else {
      const widget = await widgetService.findOneWidgetByName(query.data.name || "");
      if (!widget) {
        return res.status(404).send({ ok: false, code: NOT_FOUND });
      }
      return res.status(200).send({ ok: true, data: widget });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/:id/search", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    const query = zod
      .object({
        accessibility: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        action: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        beneficiary: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        city: zod.string().optional(), // Not used, only for stats
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
        size: zod.coerce.number().int().min(0).default(25),
        start: zod.coerce.date().optional(),
      })
      .safeParse(req.query);

    if (!params.success) {
      captureMessage(`[Iframe Widget] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!query.success) {
      captureMessage(`[Iframe Widget] Invalid query`, JSON.stringify(query.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const widget = await widgetService.findOneWidgetById(params.data.id);
    if (!widget) {
      captureMessage(`[Iframe Widget] Widget not found`, JSON.stringify(params.data, null, 2));
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const filters = buildMissionFilters(widget, query.data, [], { skip: query.data.from, limit: query.data.size });
    const { data, total } = await widgetMissionService.fetchWidgetMissions(widget, filters, MISSION_FIELDS);
    const mappedData = data.map((mission) => toWidgetMission(mission, widget));

    return res.status(200).send({ ok: true, data: mappedData, total });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/aggs", cors({ origin: "*" }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    const query = zod
      .object({
        aggs: zod
          .array(zod.enum(["domain", "organization", "department", "schedule", "remote", "country", "minor", "accessibility", "action", "beneficiary"]))
          .default(["domain", "organization", "department", "remote", "country"]),
        domain: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        organization: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        department: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        schedule: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        remote: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        action: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        beneficiary: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        country: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        minor: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        accessibility: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        duration: zod.coerce.number().int().min(0).optional(),
        start: zod.coerce.date().optional(),
        search: zod.string().optional(),
        lat: zod.coerce.number().min(-90).max(90).optional(),
        lon: zod.coerce.number().min(-180).max(180).optional(),
        location: zod.string().optional(),
        size: zod.coerce.number().int().min(0).default(25),
        from: zod.coerce.number().int().min(0).default(0),
      })
      .safeParse(req.query);

    if (!params.success) {
      captureMessage(`[Iframe Widget] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!query.success) {
      captureMessage(`[Iframe Widget] Invalid query`, JSON.stringify(query.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const widget = await widgetService.findOneWidgetById(params.data.id);
    if (!widget) {
      captureMessage(`[Iframe Widget] Widget not found`, JSON.stringify(params.data, null, 2));
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const filters = buildMissionFilters(widget, query.data, [], { skip: 0, limit: 0 });
    const aggs = await widgetMissionService.fetchWidgetAggregations(widget, filters, query.data.aggs);
    return res.status(200).send({ ok: true, data: aggs });
  } catch (error) {
    next(error);
  }
});

const resolveRemoteFilter = (remoteValues?: string[], widgetType?: string): Array<string> | undefined => {
  if (remoteValues?.includes("yes") && !remoteValues.includes("no")) {
    return ["full", "possible"];
  }
  if (remoteValues?.includes("no") && !remoteValues.includes("yes")) {
    return ["no"];
  }
  if (!remoteValues && widgetType === "volontariat") {
    return ["no"];
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
    return {
      lat,
      lon,
      distanceKm: getDistanceKm("50km"),
    };
  }
  return undefined;
};

const buildMissionFilters = (
  widget: WidgetRecord,
  query: { [key: string]: any },
  excludedOrganizationClientIds: string[],
  pagination: { skip: number; limit: number }
): MissionSearchFilters => {
  const filters: MissionSearchFilters = {
    directFilters: applyWidgetRules(widget.rules || []),
    publisherIds: widget.publishers,
    excludeOrganizationClientIds: excludedOrganizationClientIds.length ? excludedOrganizationClientIds : undefined,
    skip: pagination.skip,
    limit: pagination.limit,
  };

  const domainValues = normalizeToArray(query.domain);
  if (domainValues?.length) {
    const definedDomains = domainValues.filter((d) => d !== "none");
    if (definedDomains.length) {
      filters.domain = definedDomains;
    }
    if (domainValues.includes("none")) {
      filters.domainIncludeMissing = true;
    }
  }

  const departmentValues = normalizeToArray(query.department);
  if (departmentValues?.length) {
    const definedDepartments = departmentValues.filter((d) => d !== "none");
    if (definedDepartments.length) {
      filters.departmentName = definedDepartments;
    }
    if (departmentValues.includes("none")) {
      filters.departmentNameIncludeMissing = true;
    }
  }

  const organizationNames = normalizeToArray(query.organization);
  if (organizationNames?.length) {
    filters.organizationName = organizationNames;
  }

  const actions = normalizeToArray(query.action);
  if (actions?.length) {
    filters.action = actions;
  }

  const beneficiaries = normalizeToArray(query.beneficiary);
  if (beneficiaries?.length) {
    filters.beneficiary = beneficiaries;
  }

  const schedules = normalizeToArray(query.schedule);
  if (schedules?.length) {
    filters.schedule = schedules;
  }

  const countries = normalizeToArray(query.country);
  if (countries?.length) {
    if (countries.includes("NOT_FR") && !countries.includes("FR")) {
      filters.countryNot = ["FR"];
    } else if (countries.includes("FR")) {
      filters.country = ["FR"];
    }
  }

  if (query.start) {
    filters.startAt = { gt: new Date(query.start) };
  }
  if (query.duration !== undefined) {
    filters.durationLte = query.duration;
  }

  const minorValues = normalizeToArray(query.minor);
  if (minorValues?.length) {
    if (minorValues.includes("yes") && !minorValues.includes("no")) {
      filters.openToMinors = true;
    } else if (minorValues.includes("no") && !minorValues.includes("yes")) {
      filters.openToMinors = false;
    }
  }

  const accessibilityValues = normalizeToArray(query.accessibility);
  if (accessibilityValues?.includes("reducedMobilityAccessible")) {
    filters.reducedMobilityAccessible = true;
  }
  if (accessibilityValues?.includes("closeToTransport")) {
    filters.closeToTransport = true;
  }

  const remoteValues = normalizeToArray(query.remote);
  const remoteFilter = resolveRemoteFilter(remoteValues, widget.type);
  if (remoteFilter) {
    filters.remote = remoteFilter;
  }

  const locationFilters = resolveLocationFilters(widget, query.lon, query.lat);
  if (locationFilters) {
    filters.lat = locationFilters.lat;
    filters.lon = locationFilters.lon;
    filters.distanceKm = locationFilters.distanceKm;
  }

  if (query.search) {
    filters.keywords = query.search;
  }

  return filters;
};

const toWidgetMission = (mission: MissionRecord, widget: WidgetRecord) => {
  const moderationTitle = (mission as any)[`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_title`];

  return {
    _id: mission.id,
    title: moderationTitle && widget.jvaModeration ? moderationTitle : mission.title,
    domain: mission.domain,
    domainLogo: mission.domainLogo,
    organizationName: mission.organizationName,
    remote: mission.remote,
    city: mission.city ? capitalizeFirstLetter(mission.city) : mission.city,
    country: mission.country,
    postalCode: mission.postalCode,
    places: mission.places,
    tags: mission.tags,
    addresses: mission.addresses?.map((addr) => ({
      ...addr,
      city: addr.city ? capitalizeFirstLetter(addr.city) : addr.city,
    })),
  };
};

export default router;
