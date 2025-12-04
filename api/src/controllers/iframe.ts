import cors from "cors";
import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { prismaCore } from "../db/postgres";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, captureMessage } from "../error";
import WidgetModel from "../models/widget";
import { organizationRepository } from "../repositories/organization";
import { buildWhere, missionService } from "../services/mission";
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
        aggs: zod
          .array(zod.enum(["domain", "organization", "department", "schedule", "remote", "country", "minor", "accessibility"]))
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

    const widget = await WidgetModel.findById(params.data.id);
    if (!widget) {
      captureMessage(`[Iframe Widget] Widget not found`, JSON.stringify(params.data, null, 2));
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const diffusionExclusions = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(widget.fromPublisherId);
    const excludedIds = diffusionExclusions.map((e) => e.organizationClientId).filter((id): id is string => id !== null);

    // Reuse service-level aggregations to ensure we aggregate on the full dataset, not just paginated data
    const filters = buildMissionFilters(widget, query.data, excludedIds, { skip: 0, limit: 0 });
    const aggs = await fetchWidgetAggregations(widget, filters, query.data.aggs);
    return res.status(200).send({ ok: true, data: aggs });
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

const mergeBuckets = (lists: Array<{ key: string; doc_count: number }>) => {
  const map = new Map<string, number>();
  lists.forEach((list) => {
    list.forEach((row) => map.set(row.key, (map.get(row.key) ?? 0) + row.doc_count));
  });
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, doc_count]) => ({ key, doc_count }));
};

const fetchWidgetAggregations = async (widget: Widget, filters: MissionSearchFilters, requestedAggs: string[]) => {
  const jvaPublisherId = PUBLISHER_IDS.JEVEUXAIDER;
  const filterSets: MissionSearchFilters[] = [];

  if (!widget.jvaModeration) {
    filterSets.push(filters);
  } else {
    const jvaPublishers = widget.publishers.filter((p) => p === jvaPublisherId);
    const otherPublishers = widget.publishers.filter((p) => p !== jvaPublisherId);
    if (jvaPublishers.length) {
      filterSets.push({ ...filters, publisherIds: jvaPublishers });
    }
    if (otherPublishers.length) {
      filterSets.push({ ...filters, publisherIds: otherPublishers, moderationAcceptedFor: jvaPublisherId });
    }
  }

  const results = await Promise.all(
    filterSets.map(async (f) => {
      const where = buildWhere({ ...f, skip: 0, limit: 0 });
      return aggregateWidgetAggs(where, requestedAggs);
    })
  );

  const merged = results.reduce(
    (acc, res) => {
      if (res.domains) {
        acc.domains.push(res.domains);
      }
      if (res.organizations) {
        acc.organizations.push(res.organizations);
      }
      if (res.departments) {
        acc.departments.push(res.departments);
      }
      if (res.remote) {
        acc.remote.push(res.remote);
      }
      if (res.countries) {
        acc.countries.push(res.countries);
      }
      if (res.minor) {
        acc.minor.push(res.minor);
      }
      if (res.accessibility) {
        acc.accessibility.push(res.accessibility);
      }
      if (res.schedule) {
        acc.schedule.push(res.schedule);
      }
      return acc;
    },
    { domains: [], organizations: [], departments: [], remote: [], countries: [], minor: [], accessibility: [], schedule: [] } as Record<
      string,
      Array<{ key: string; doc_count: number }>
    >
  );

  const payload: any = {};
  if (requestedAggs.includes("domain")) {
    payload.domain = mergeBuckets(merged.domains);
  }
  if (requestedAggs.includes("organization")) {
    payload.organization = mergeBuckets(merged.organizations);
  }
  if (requestedAggs.includes("department")) {
    payload.department = mergeBuckets(merged.departments);
  }
  if (requestedAggs.includes("remote")) {
    payload.remote = mergeBuckets(merged.remote);
  }
  if (requestedAggs.includes("country")) {
    payload.country = mergeBuckets(merged.countries);
  }
  if (requestedAggs.includes("minor")) {
    payload.minor = mergeBuckets(merged.minor);
  }
  if (requestedAggs.includes("accessibility")) {
    payload.accessibility = mergeBuckets(merged.accessibility);
  }
  if (requestedAggs.includes("schedule")) {
    payload.schedule = mergeBuckets(merged.schedule);
  }

  return payload;
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

const aggregateWidgetAggs = async (
  where: ReturnType<typeof buildWhere>,
  requestedAggs: string[]
): Promise<{
  domains?: { key: string; doc_count: number }[];
  organizations?: { key: string; doc_count: number }[];
  departments?: { key: string; doc_count: number }[];
  remote?: { key: string; doc_count: number }[];
  countries?: { key: string; doc_count: number }[];
  minor?: { key: string; doc_count: number }[];
  accessibility?: { key: string; doc_count: number }[];
  schedule?: { key: string; doc_count: number }[];
}> => {
  const should = (key: string) => requestedAggs.includes(key);

  const aggregateMissionField = async (field: Prisma.MissionScalarFieldEnum) => {
    const rows = await prismaCore.mission.groupBy({
      by: [field],
      where,
      _count: { _all: true },
    });
    return rows
      .map((row) => ({
        key: String((row as any)[field] ?? ""),
        doc_count: Number((row as any)._count?._all ?? 0),
      }))
      .filter((row) => row.key);
  };

  const aggregateAddressField = async (field: "city" | "departmentName") => {
    const rows = await prismaCore.missionAddress.groupBy({
      by: [field],
      where: { mission: where },
      _count: { _all: true },
    });
    return rows
      .map((row) => ({
        key: String((row as any)[field] ?? ""),
        doc_count: Number((row as any)._count?._all ?? 0),
      }))
      .filter((row) => row.key);
  };

  const result: any = {};

  if (should("domain")) {
    result.domains = await aggregateMissionField("domain");
  }
  if (should("organization")) {
    const orgRows = await aggregateMissionField("organizationId");
    const orgIds = orgRows.map((row) => row.key);
    const orgs = orgIds.length ? await organizationRepository.findMany({ where: { id: { in: orgIds } }, select: { id: true, title: true } }) : [];
    const orgById = new Map(orgs.map((org) => [org.id, org.title ?? ""]));
    result.organizations = orgRows.map((row) => ({ key: orgById.get(row.key) ?? "", doc_count: row.doc_count })).filter((row) => row.key);
  }
  if (should("department")) {
    result.departments = await aggregateAddressField("departmentName");
  }
  if (should("remote")) {
    result.remote = await aggregateMissionField("remote");
  }
  if (should("country")) {
    result.countries = await aggregateMissionField("country");
  }
  if (should("minor")) {
    result.minor = await aggregateMissionField("openToMinors");
  }
  if (should("schedule")) {
    result.schedule = await aggregateMissionField("schedule");
  }
  if (should("accessibility")) {
    const reduced = await prismaCore.mission.count({ where: { ...where, reducedMobilityAccessible: "yes" as any } });
    const transport = await prismaCore.mission.count({ where: { ...where, closeToTransport: "yes" as any } });
    result.accessibility = [
      { key: "reducedMobilityAccessible", doc_count: reduced },
      { key: "closeToTransport", doc_count: transport },
    ];
  }

  return result;
};

export default router;
