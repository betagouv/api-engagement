import { PUBLISHER_IDS } from "../config";
import { Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";
import { missionRepository } from "../repositories/mission";
import { organizationRepository } from "../repositories/organization";
import type { WidgetRecord } from "../types";
import type { MissionRecord, MissionSearchFilters, MissionSelect } from "../types/mission";
import { buildWhere, missionService } from "./mission";

type Bucket = { key: string; doc_count: number };

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
    // Step 1: Get filtered mission IDs (only IDs, not full missions)
    const missions = await prismaCore.mission.findMany({
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

    // Step 2: Use repository method to aggregate array fields efficiently with UNNEST
    const rows = await missionRepository.aggregateArrayField(missionIds, field);

    return rows.map((row) => ({
      key: row.value,
      doc_count: row.count,
    }));
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

const sortBuckets = (buckets?: Bucket[]) => (buckets ?? []).sort((a, b) => b.doc_count - a.doc_count);

export const widgetMissionService = {
  async fetchWidgetMissions(widget: WidgetRecord, filters: MissionSearchFilters, select: MissionSelect | null = null): Promise<{ data: MissionRecord[]; total: number }> {
    const where = buildWidgetWhere(widget, filters);
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
    const where = buildWidgetWhere(widget, { ...filters, skip: 0, limit: 0 });
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
