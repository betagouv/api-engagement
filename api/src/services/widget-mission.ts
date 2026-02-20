import { PUBLISHER_IDS } from "../config";
import { Prisma } from "../db/core";
import { prisma } from "../db/postgres";
import { missionRepository } from "../repositories/mission";
import { organizationRepository } from "../repositories/organization";
import type { WidgetRecord } from "../types";
import type { MissionRecord, MissionSearchFilters, MissionSelect } from "../types/mission";
import { buildWhere, missionService } from "./mission";

type Bucket = { key: string; doc_count: number };

type PublisherOrganizationTuple = {
  publisherId: string;
  organizationClientId: string;
};

const buildWidgetWhere = (widget: WidgetRecord, filters: MissionSearchFilters): Prisma.MissionWhereInput => {
  if (!widget.jvaModeration) {
    return buildWhere(filters);
  }

  const jvaPublishers = widget.publishers.filter((publisherId) => publisherId === PUBLISHER_IDS.JEVEUXAIDER);
  const otherPublishers = widget.publishers.filter((publisherId) => publisherId !== PUBLISHER_IDS.JEVEUXAIDER);
  const baseWhere = buildWhere({ ...filters, publisherIds: [], moderationAcceptedFor: undefined });
  const orConditions: Prisma.MissionWhereInput[] = [];

  if (jvaPublishers.length) {
    orConditions.push({ publisherId: { in: jvaPublishers } });
  }
  if (otherPublishers.length) {
    orConditions.push({
      publisherId: { in: otherPublishers },
      moderationStatuses: { some: { publisherId: PUBLISHER_IDS.JEVEUXAIDER, status: "ACCEPTED" } },
    });
  }

  return orConditions.length ? { AND: [baseWhere, { OR: orConditions }] } : baseWhere;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);

/**
 * Builds a mission condition from `(publisherId, organizationClientId)` tuples.
 * Returns either one condition or an `OR` of conditions; empty input matches nothing.
 */
const buildMissionConditionFromPublisherOrganizationTuples = (tuples: PublisherOrganizationTuple[]): Prisma.MissionWhereInput => {
  if (!tuples.length) {
    return { publisherId: { in: [] } };
  }

  const byPublisher = new Map<string, Set<string>>();
  tuples.forEach(({ publisherId, organizationClientId }) => {
    if (!byPublisher.has(publisherId)) {
      byPublisher.set(publisherId, new Set());
    }
    byPublisher.get(publisherId)?.add(organizationClientId);
  });

  const conditions = Array.from(byPublisher.entries()).map(([publisherId, organizationClientIds]) => ({
    publisherId,
    organizationClientId: { in: Array.from(organizationClientIds) },
  }));

  return conditions.length === 1 ? conditions[0] : { OR: conditions };
};

/**
 * Replaces `publisherOrganization.is` filters with equivalent mission predicates.
 * This avoids replaying expensive relational OR/ILIKE branches on every query.
 */
const inlinePublisherOrganizationFilters = async (where: Prisma.MissionWhereInput): Promise<Prisma.MissionWhereInput> => {
  // Request-scoped memoization: identical `publisherOrganization.is` conditions
  // are resolved once, then reused during the same where-tree traversal.
  const cache = new Map<string, Prisma.MissionWhereInput>();

  const resolvePublisherOrganizationCondition = async (condition: Prisma.PublisherOrganizationWhereInput): Promise<Prisma.MissionWhereInput> => {
    const cacheKey = JSON.stringify(condition);
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const tuples = await prisma.publisherOrganization.findMany({
      where: condition,
      select: { publisherId: true, organizationClientId: true },
    });
    // Convert relational matches into mission-level tuple filters.
    const missionCondition = buildMissionConditionFromPublisherOrganizationTuples(tuples);
    cache.set(cacheKey, missionCondition);
    return missionCondition;
  };

  const transform = async (node: unknown): Promise<unknown> => {
    if (Array.isArray(node)) {
      return await Promise.all(node.map((item) => transform(item)));
    }
    if (!isPlainObject(node)) {
      return node;
    }

    const maybePublisherOrganization = node.publisherOrganization;
    if (isPlainObject(maybePublisherOrganization) && isPlainObject(maybePublisherOrganization.is)) {
      const missionCondition = await resolvePublisherOrganizationCondition(maybePublisherOrganization.is as Prisma.PublisherOrganizationWhereInput);
      const restEntries = Object.entries(node).filter(([key]) => key !== "publisherOrganization");

      if (!restEntries.length) {
        return missionCondition;
      }

      const transformedRest = Object.fromEntries(await Promise.all(restEntries.map(async ([key, value]) => [key, await transform(value)] as const)));

      return { AND: [transformedRest, missionCondition] };
    }

    return Object.fromEntries(await Promise.all(Object.entries(node).map(async ([key, value]) => [key, await transform(value)] as const)));
  };

  return (await transform(where)) as Prisma.MissionWhereInput;
};

const aggregateWidgetAggs = async (
  where: Prisma.MissionWhereInput,
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
    const rows = await prisma.mission.groupBy({
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
    const rows = await prisma.missionAddress.groupBy({
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
    const rows = await prisma.mission.groupBy({
      by: ["domainId"],
      where,
      _count: { _all: true },
    });

    const domainIds = rows.map((row) => (row as any).domainId).filter((id): id is string => typeof id === "string" && id.length > 0);
    const domains = domainIds.length ? await prisma.domain.findMany({ where: { id: { in: domainIds } }, select: { id: true, name: true } }) : [];
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
    // Resolve filtered mission ids once, then aggregate on that fixed id set.
    const missions = await prisma.mission.findMany({
      where,
      select: { id: true },
      // Limit to prevent memory issues on extremely large datasets
      // For most widgets, this should cover all missions. If more than 50k missions,
      // aggregations will be based on a representative sample
      take: 50000,
    });

    if (missions.length === 0) {
      return [];
    }

    const missionIds = missions.map((m) => m.id);

    // Aggregate with UNNEST from ids instead of rebuilding full text conditions.
    const rows = await missionRepository.aggregateArrayField(missionIds, field);

    return rows.map((row) => ({
      key: row.value,
      doc_count: row.count,
    }));
  };

  const formatOrganization = async () => {
    const orgRows = await aggregateMissionField("organizationId");
    const orgIds = orgRows.map((row) => row.key);
    const orgs = orgIds.length ? await organizationRepository.findMany({ where: { id: { in: orgIds } }, select: { id: true, title: true } }) : [];
    const orgById = new Map(orgs.map((org) => [org.id, org.title ?? ""]));

    return orgRows.map((row) => ({ key: orgById.get(row.key) ?? "", doc_count: row.doc_count })).filter((row) => row.key);
  };

  const result: any = {};
  const promises = new Map<string, Promise<Bucket[]>>();

  if (should("domain")) {
    promises.set("domains", aggregateDomainField());
  }
  if (should("organization")) {
    promises.set("organizations", formatOrganization());
  }
  if (should("department")) {
    promises.set("departments", aggregateAddressField("departmentName"));
  }
  if (should("remote")) {
    promises.set("remote", aggregateMissionField("remote"));
  }
  if (should("country")) {
    promises.set("countries", aggregateAddressField("country"));
  }
  if (should("minor")) {
    promises.set("minor", aggregateMissionField("openToMinors"));
  }
  if (should("schedule")) {
    promises.set("schedule", aggregateMissionField("schedule"));
  }
  if (should("action")) {
    promises.set("actions", aggregateMissionListField("tasks"));
  }
  if (should("beneficiary")) {
    promises.set("beneficiaries", aggregateMissionListField("audience"));
  }
  if (should("accessibility")) {
    const reduced = await prisma.mission.count({ where: { ...where, reducedMobilityAccessible: true } });
    const transport = await prisma.mission.count({ where: { ...where, closeToTransport: true } });
    result.accessibility = [
      { key: "reducedMobilityAccessible", doc_count: reduced },
      { key: "closeToTransport", doc_count: transport },
    ];
  }

  const entries = Array.from(promises.entries());
  const values = await Promise.all(entries.map(([, promise]) => promise));
  entries.forEach(([key], index) => {
    result[key] = values[index];
  });

  return result;
};

const sortBuckets = (buckets?: Bucket[]) => (buckets ?? []).sort((a, b) => b.doc_count - a.doc_count);

export const widgetMissionService = {
  async fetchWidgetMissions(widget: WidgetRecord, filters: MissionSearchFilters, select: MissionSelect | null = null): Promise<{ data: MissionRecord[]; total: number }> {
    const rawWhere = buildWidgetWhere(widget, filters);
    const where = await inlinePublisherOrganizationFilters(rawWhere);
    const [data, total] = await Promise.all([
      missionService.findMissionsBy(where, {
        select,
        orderBy: [{ startAt: Prisma.SortOrder.desc }, { createdAt: Prisma.SortOrder.desc }],
        skip: filters.skip,
        limit: filters.limit,
        moderatedBy: widget.jvaModeration ? PUBLISHER_IDS.JEVEUXAIDER : null,
      }),
      missionService.countBy(where),
    ]);

    return { data, total };
  },

  async fetchWidgetAggregations(widget: WidgetRecord, filters: MissionSearchFilters, requestedAggs: string[]) {
    const rawWhere = buildWidgetWhere(widget, { ...filters, skip: 0, limit: 0 });
    const where = await inlinePublisherOrganizationFilters(rawWhere);
    const result = await aggregateWidgetAggs(where, requestedAggs);

    const payload: any = {};
    if (requestedAggs.includes("domain")) {
      payload.domain = sortBuckets(result.domains);
    }
    if (requestedAggs.includes("organization")) {
      payload.organization = sortBuckets(result.organizations);
    }
    if (requestedAggs.includes("department")) {
      payload.department = sortBuckets(result.departments);
    }
    if (requestedAggs.includes("remote")) {
      payload.remote = sortBuckets(result.remote);
    }
    if (requestedAggs.includes("country")) {
      payload.country = sortBuckets(result.countries);
    }
    if (requestedAggs.includes("minor")) {
      payload.minor = sortBuckets(result.minor);
    }
    if (requestedAggs.includes("accessibility")) {
      payload.accessibility = sortBuckets(result.accessibility);
    }
    if (requestedAggs.includes("schedule")) {
      payload.schedule = sortBuckets(result.schedule);
    }
    if (requestedAggs.includes("action")) {
      payload.action = sortBuckets(result.actions);
    }
    if (requestedAggs.includes("beneficiary")) {
      payload.beneficiary = sortBuckets(result.beneficiaries);
    }

    return payload;
  },
};
