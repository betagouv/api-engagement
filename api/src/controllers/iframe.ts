import cors from "cors";
import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, captureMessage } from "../error";
import { organizationRepository } from "../repositories/organization";
import { buildWhere, missionService } from "../services/mission";
import { publisherDiffusionExclusionService } from "../services/publisher-diffusion-exclusion";
import { widgetService } from "../services/widget";
import { WidgetRecord } from "../types";
import type { MissionRecord, MissionSearchFilters, MissionSelect } from "../types/mission";
import { capitalizeFirstLetter, getDistanceKm } from "../utils";
import { applyWidgetRules } from "../utils/widget";

const router = Router();

const MISSION_FIELDS: MissionSelect = {
  id: true,
  title: true,
  moderationStatuses: { select: { title: true } },
  domain: { select: { name: true, logo: true } },
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

    const diffusionExclusions = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(widget.fromPublisherId);
    const excludedIds = diffusionExclusions.map((e) => e.organizationClientId).filter((id): id is string => id !== null);
    const filters = buildMissionFilters(widget, query.data, [], { skip: query.data.from, limit: query.data.size });
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

    const diffusionExclusions = await publisherDiffusionExclusionService.findExclusionsForDiffuseurId(widget.fromPublisherId);
    const excludedIds = diffusionExclusions.map((e) => e.organizationClientId).filter((id): id is string => id !== null);

    // Reuse service-level aggregations to ensure we aggregate on the full dataset, not just paginated data
    const filters = buildMissionFilters(widget, query.data, [], { skip: 0, limit: 0 });
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

const fetchWidgetMissions = async (widget: WidgetRecord, filters: MissionSearchFilters): Promise<{ data: MissionRecord[]; total: number }> => {
  const sortByDistance = filters.lat !== undefined && filters.lon !== undefined;
  const jvaPublisherId = PUBLISHER_IDS.JEVEUXAIDER;
  if (!widget.jvaModeration) {
    return missionService.findMissions(filters, MISSION_FIELDS);
  }

  const jvaPublishers = widget.publishers.filter((p) => p === jvaPublisherId);
  const otherPublishers = widget.publishers.filter((p) => p !== jvaPublisherId);
  const pageLimit = filters.limit + filters.skip;
  const combined: MissionRecord[] = [];
  let total = 0;

  if (jvaPublishers.length) {
    const res = await missionService.findMissions({ ...filters, publisherIds: jvaPublishers, skip: 0, limit: pageLimit }, MISSION_FIELDS);
    combined.push(...res.data);
    total += res.total;
  }

  if (otherPublishers.length) {
    const res = await missionService.findMissions({ ...filters, publisherIds: otherPublishers, moderationAcceptedFor: jvaPublisherId, skip: 0, limit: pageLimit }, MISSION_FIELDS);
    combined.push(...res.data);
    total += res.total;
  }

  const sorted = sortWidgetMissions(combined, sortByDistance);
  const data = sorted.slice(filters.skip, filters.skip + filters.limit);

  return { data, total };
};

type Bucket = { key: string; doc_count: number };
type BucketGroups = {
  domains: Bucket[][];
  organizations: Bucket[][];
  departments: Bucket[][];
  remote: Bucket[][];
  countries: Bucket[][];
  minor: Bucket[][];
  accessibility: Bucket[][];
  schedule: Bucket[][];
  actions: Bucket[][];
  beneficiaries: Bucket[][];
};

const mergeBuckets = (lists: Bucket[][]) => {
  const map = new Map<string, number>();
  lists.forEach((list) => {
    list.forEach((row: Bucket) => map.set(row.key, (map.get(row.key) ?? 0) + row.doc_count));
  });
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, doc_count]) => ({ key, doc_count }));
};

const fetchWidgetAggregations = async (widget: WidgetRecord, filters: MissionSearchFilters, requestedAggs: string[]) => {
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

  const merged = results.reduce<BucketGroups>(
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
      if (res.actions) {
        acc.actions.push(res.actions);
      }
      if (res.beneficiaries) {
        acc.beneficiaries.push(res.beneficiaries);
      }
      return acc;
    },
    { domains: [], organizations: [], departments: [], remote: [], countries: [], minor: [], accessibility: [], schedule: [], actions: [], beneficiaries: [] }
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
  if (requestedAggs.includes("action")) {
    payload.action = mergeBuckets(merged.actions);
  }
  if (requestedAggs.includes("beneficiary")) {
    payload.beneficiary = mergeBuckets(merged.beneficiaries);
  }

  return payload;
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

const aggregateWidgetAggs = async (
  where: ReturnType<typeof buildWhere>,
  requestedAggs: string[]
): Promise<{
  domains?: Bucket[];
  organizations?: Bucket[];
  departments?: Bucket[];
  remote?: Bucket[];
  countries?: Bucket[];
  minor?: Bucket[];
  accessibility?: Bucket[];
  schedule?: Bucket[];
  actions?: Bucket[];
  beneficiaries?: Bucket[];
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

  const aggregateAddressField = async (field: "city" | "departmentName" | "country") => {
    const rows = await prismaCore.missionAddress.groupBy({
      // Count distinct missions per bucket (a mission can have multiple addresses)
      by: [field, "missionId"],
      where: { mission: where },
      _count: { _all: true },
    });

    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const key = String((row as any)[field] ?? "");
      if (!key) {
        return;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([key, doc_count]) => ({ key, doc_count }));
  };

  const aggregateDomainField = async () => {
    const rows = await prismaCore.mission.groupBy({
      by: ["domainId"],
      where,
      _count: { _all: true },
    });

    const domainIds = rows.map((row) => (row as any).domainId).filter((id): id is string => typeof id === "string" && id.length > 0);

    const domains = domainIds.length ? await prismaCore.domain.findMany({ where: { id: { in: domainIds } }, select: { id: true, name: true } }) : [];
    const nameById = new Map(domains.map((domain) => [domain.id, domain.name ?? ""]));

    return rows
      .map((row) => {
        const domainId = (row as any).domainId as string | null;
        return {
          key: domainId ? (nameById.get(domainId) ?? "") : "",
          doc_count: Number((row as any)._count?._all ?? 0),
        };
      })
      .filter((row) => row.key);
  };

  const aggregateMissionListField = async (field: "tasks" | "audience") => {
    const missions = await prismaCore.mission.findMany({
      where,
      select: { id: true, [field]: true } as any,
    });

    const counts = new Map<string, number>();
    missions.forEach((mission) => {
      const values = Array.isArray((mission as any)[field]) ? ((mission as any)[field] as string[]) : [];
      const unique = new Set(values.filter((v) => typeof v === "string" && v.length));
      unique.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    });

    return Array.from(counts.entries())
      .map(([key, doc_count]) => ({ key, doc_count }))
      .sort((a, b) => b.doc_count - a.doc_count);
  };

  const result: any = {};

  if (should("domain")) {
    result.domains = await aggregateDomainField();
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
    result.countries = await aggregateAddressField("country");
  }
  if (should("minor")) {
    result.minor = await aggregateMissionField("openToMinors");
  }
  if (should("schedule")) {
    result.schedule = await aggregateMissionField("schedule");
  }
  if (should("action")) {
    result.actions = await aggregateMissionListField("tasks");
  }
  if (should("beneficiary")) {
    result.beneficiaries = await aggregateMissionListField("audience");
  }
  if (should("accessibility")) {
    const reduced = await prismaCore.mission.count({ where: { ...where, reducedMobilityAccessible: true } });
    const transport = await prismaCore.mission.count({ where: { ...where, closeToTransport: true } });
    result.accessibility = [
      { key: "reducedMobilityAccessible", doc_count: reduced },
      { key: "closeToTransport", doc_count: transport },
    ];
  }

  return result;
};

export default router;
