import cors from "cors";
import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, captureMessage } from "../error";
import WidgetModel from "../models/widget";
import { missionService } from "../services/mission";
import { publisherDiffusionExclusionService } from "../services/publisher-diffusion-exclusion";
import { Widget } from "../types";
import type { MissionRecord, MissionSearchFilters } from "../types/mission";
import { capitalizeFirstLetter, getDistanceKm, isValidObjectId } from "../utils";

const router = Router();

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
      if (query.data.id && query.data.id.length > 24) {
        query.data.id = query.data.id.slice(0, 24);
      }
      if (!isValidObjectId(query.data.id)) {
        return res.status(400).send({ ok: false, code: INVALID_QUERY, message: "Invalid id" });
      }

      const widget = await WidgetModel.findById(query.data.id);
      if (!widget) {
        return res.status(404).send({ ok: false, code: NOT_FOUND });
      }
      return res.status(200).send({ ok: true, data: widget });
    } else {
      const widget = await WidgetModel.findOne({ name: query.data.name });
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
        id: zod.string().regex(/^[0-9a-fA-F]{24}$/),
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

    const widget = await WidgetModel.findById(params.data.id);
    if (!widget) {
      captureMessage(`[Iframe Widget] Widget not found`, JSON.stringify(params.data, null, 2));
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const diffusionExclusions = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(widget.fromPublisherId);
    const excludedIds = diffusionExclusions.map((e) => e.organizationClientId).filter((id): id is string => id !== null);
    const filters = buildMissionFilters(widget, query.data, excludedIds, { skip: query.data.from, limit: query.data.size });

    const { data, total } = await fetchWidgetMissions(widget, filters);
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
        id: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .safeParse(req.params);

    const query = zod
      .object({
        aggs: zod.array(zod.string()).default(["domain", "organization", "department", "schedule", "remote", "action", "beneficiary", "country", "minor", "accessibility"]),
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

    const widget = await WidgetModel.findById(params.data.id);
    if (!widget) {
      captureMessage(`[Iframe Widget] Widget not found`, JSON.stringify(params.data, null, 2));
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const diffusionExclusions = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(widget.fromPublisherId);
    const excludedIds = diffusionExclusions.map((e) => e.organizationClientId).filter((id): id is string => id !== null);

    const aggLimit = Math.max(query.data.size + query.data.from, 1000);
    const filters = buildMissionFilters(widget, query.data, excludedIds, { skip: 0, limit: aggLimit });
    const { data } = await fetchWidgetMissions(widget, filters);

    const aggsData = buildAggregations(data, query.data.aggs);

    return res.status(200).send({ ok: true, data: aggsData });
  } catch (error) {
    next(error);
  }
});

const normalizeToArray = (value?: string | string[]): string[] | undefined => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string" && value.length) {
    return [value];
  }
};

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

const resolveLocationFilters = (widget: Widget, lon?: number, lat?: number): Pick<MissionSearchFilters, "lat" | "lon" | "distanceKm"> | undefined => {
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

const applyWidgetRules = (filters: MissionSearchFilters, rules: Widget["rules"]) => {
  rules.forEach((rule) => {
    if (rule.operator !== "is" || !rule.value) {
      return;
    }
    if (rule.field === "domain") {
      filters.domain = [...(filters.domain ?? []), rule.value];
    }
    if (rule.field === "departmentName") {
      filters.departmentName = [...(filters.departmentName ?? []), rule.value];
    }
    if (rule.field === "type") {
      filters.type = [...(filters.type ?? []), rule.value];
    }
    if (rule.field === "remote") {
      filters.remote = [...(filters.remote ?? []), rule.value];
    }
    if (rule.field === "openToMinors") {
      filters.openToMinors = rule.value as any;
    }
    if (rule.field === "organizationClientId") {
      filters.organizationClientId = [...(filters.organizationClientId ?? []), rule.value];
    }
    if (rule.field === "clientId") {
      filters.clientId = [...(filters.clientId ?? []), rule.value];
    }
    if (rule.field === "country") {
      filters.country = [...(filters.country ?? []), rule.value];
    }
    if (rule.field === "city") {
      filters.city = [...(filters.city ?? []), rule.value];
    }
  });
};

const buildMissionFilters = (
  widget: Widget,
  query: { [key: string]: any },
  excludedOrganizationClientIds: string[],
  pagination: { skip: number; limit: number }
): MissionSearchFilters => {
  const filters: MissionSearchFilters = {
    publisherIds: widget.publishers,
    excludeOrganizationClientIds: excludedOrganizationClientIds.length ? excludedOrganizationClientIds : undefined,
    skip: pagination.skip,
    limit: pagination.limit,
  };

  applyWidgetRules(filters, widget.rules || []);

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
      filters.openToMinors = "yes";
    } else if (minorValues.includes("no") && !minorValues.includes("yes")) {
      filters.openToMinors = "no";
    }
  }

  const accessibilityValues = normalizeToArray(query.accessibility);
  if (accessibilityValues?.includes("reducedMobilityAccessible")) {
    filters.reducedMobilityAccessible = "yes";
  }
  if (accessibilityValues?.includes("closeToTransport")) {
    filters.closeToTransport = "yes";
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

const sortWidgetMissions = (missions: MissionRecord[], sortByDistance: boolean) => {
  return [...missions].sort((a, b) => {
    if (sortByDistance) {
      const distA = (a as any).distanceKm ?? Number.MAX_SAFE_INTEGER;
      const distB = (b as any).distanceKm ?? Number.MAX_SAFE_INTEGER;
      if (distA !== distB) {
        return distA - distB;
      }
    }
    const startA = a.startAt ? new Date(a.startAt).getTime() : 0;
    const startB = b.startAt ? new Date(b.startAt).getTime() : 0;
    if (startA !== startB) {
      return startB - startA;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

const fetchWidgetMissions = async (widget: Widget, filters: MissionSearchFilters): Promise<{ data: MissionRecord[]; total: number }> => {
  const sortByDistance = filters.lat !== undefined && filters.lon !== undefined;
  const jvaPublisherId = PUBLISHER_IDS.JEVEUXAIDER;
  if (!widget.jvaModeration) {
    return missionService.findMissions(filters);
  }

  const jvaPublishers = widget.publishers.filter((p) => p === jvaPublisherId);
  const otherPublishers = widget.publishers.filter((p) => p !== jvaPublisherId);
  const pageLimit = filters.limit + filters.skip;
  const combined: MissionRecord[] = [];
  let total = 0;

  if (jvaPublishers.length) {
    const res = await missionService.findMissions({ ...filters, publisherIds: jvaPublishers, skip: 0, limit: pageLimit });
    combined.push(...res.data);
    total += res.total;
  }

  if (otherPublishers.length) {
    const res = await missionService.findMissions({ ...filters, publisherIds: otherPublishers, moderationAcceptedFor: jvaPublisherId, skip: 0, limit: pageLimit });
    combined.push(...res.data);
    total += res.total;
  }

  const sorted = sortWidgetMissions(combined, sortByDistance);
  const data = sorted.slice(filters.skip, filters.skip + filters.limit);

  return { data, total };
};

const toWidgetMission = (mission: MissionRecord, widget: Widget) => {
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

const countBuckets = (missions: MissionRecord[], getter: (mission: MissionRecord) => string | null | undefined) => {
  const map = new Map<string, number>();
  missions.forEach((mission) => {
    const key = getter(mission);
    if (key) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  });
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, doc_count: count }));
};

const countBucketsFromArray = (missions: MissionRecord[], getter: (mission: MissionRecord) => string[] | undefined) => {
  const map = new Map<string, number>();
  missions.forEach((mission) => {
    getter(mission)?.forEach((value) => {
      if (value) {
        map.set(value, (map.get(value) ?? 0) + 1);
      }
    });
  });
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, doc_count: count }));
};

const buildAggregations = (missions: MissionRecord[], requestedAggs: string[]) => {
  const data: { [key: string]: any } = {};
  requestedAggs.forEach((key) => {
    switch (key) {
      case "remote":
        data[key] = countBuckets(missions, (m) => m.remote);
        break;
      case "domain":
        data[key] = countBuckets(missions, (m) => m.domain);
        break;
      case "organization":
        data[key] = countBuckets(missions, (m) => m.organizationName);
        break;
      case "department":
        data[key] = countBuckets(missions, (m) => m.departmentName);
        break;
      case "schedule":
        data[key] = countBuckets(missions, (m) => m.schedule);
        break;
      case "action":
        data[key] = countBucketsFromArray(missions, (m) => (m as any).organizationActions || []);
        break;
      case "beneficiary":
        data[key] = countBucketsFromArray(missions, (m) => (m as any).organizationBeneficiaries || []);
        break;
      case "country":
        data[key] = countBuckets(missions, (m) => m.country);
        break;
      case "minor":
        data[key] = countBuckets(missions, (m) => m.openToMinors);
        break;
      case "accessibility":
        data[key] = [
          { key: "reducedMobilityAccessible", doc_count: missions.filter((m) => m.reducedMobilityAccessible === "yes").length },
          { key: "closeToTransport", doc_count: missions.filter((m) => m.closeToTransport === "yes").length },
        ];
        break;
      default:
        data[key] = [];
    }
  });
  return data;
};

export default router;
