import { Prisma, StatEvent } from "../db/core";
import { prisma } from "../db/postgres";

const defaultInclude = {
  fromPublisher: {
    select: { id: true, name: true },
  },
  toPublisher: {
    select: { id: true, name: true },
  },
} satisfies Prisma.StatEventInclude;

export const statEventRepository = {
  async findMany(params: Prisma.StatEventFindManyArgs = {}): Promise<StatEvent[]> {
    return prisma.statEvent.findMany({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<StatEvent[]>;
  },

  async findFirst(params: Prisma.StatEventFindFirstArgs): Promise<StatEvent | null> {
    return prisma.statEvent.findFirst({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<StatEvent | null>;
  },

  async findUnique(params: Prisma.StatEventFindUniqueArgs): Promise<StatEvent | null> {
    return prisma.statEvent.findUnique({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<StatEvent | null>;
  },

  async count(params: Prisma.StatEventCountArgs = {}): Promise<number> {
    return prisma.statEvent.count(params);
  },

  async create(params: Prisma.StatEventCreateArgs): Promise<StatEvent> {
    return prisma.statEvent.create({
      ...params,
      include: params.include ?? defaultInclude,
    });
  },

  async update(params: Prisma.StatEventUpdateArgs): Promise<StatEvent> {
    return prisma.statEvent.update({
      ...params,
      include: params.include ?? defaultInclude,
    });
  },

  async updateMany(params: Prisma.StatEventUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.statEvent.updateMany(params);
  },

  async groupBy(params: Prisma.StatEventGroupByArgs) {
    return prisma.statEvent.groupBy(params as any);
  },

  async aggregateWarningBotBuckets(user: string): Promise<{ bucket: "type" | "publisherTo" | "publisherFrom"; key: string; doc_count: number }[]> {
    const rows = await prisma.$queryRaw<{ bucket: "type" | "publisherTo" | "publisherFrom"; key: string | null; doc_count: bigint }[]>(
      Prisma.sql`
        SELECT
          CASE
            WHEN GROUPING(type) = 0 THEN 'type'
            WHEN GROUPING(to_publisher_id) = 0 THEN 'publisherTo'
            ELSE 'publisherFrom'
          END AS bucket,
          COALESCE(type::text, to_publisher_id::text, from_publisher_id::text, '') AS key,
          COUNT(*)::bigint AS doc_count
        FROM "stat_event"
        WHERE "user" = ${user}
        GROUP BY GROUPING SETS ((type), (to_publisher_id), (from_publisher_id))
      `
    );

    return rows.map((row) => ({
      bucket: row.bucket,
      key: row.key ?? "",
      doc_count: Number(row.doc_count ?? 0n),
    }));
  },

  async aggregateClicksByPublisherForOrganization({
    publisherIds,
    organizationClientId,
    from,
  }: {
    publisherIds: string[];
    organizationClientId: string;
    from: Date;
  }): Promise<Array<{ fromPublisherId: string; count: number }>> {
    if (!publisherIds.length) {
      return [];
    }

    const rows = await prisma.$queryRaw<Array<{ from_publisher_id: string; count: bigint }>>(
      Prisma.sql`
        SELECT se.from_publisher_id, COUNT(*)::bigint AS count
        FROM "stat_event" se
        JOIN "mission" m ON m.id = se.mission_id
        WHERE se.type = 'click'::"StatEventType"
          AND se.is_bot IS NOT TRUE
          AND m.organization_client_id = ${organizationClientId}
          AND se.from_publisher_id IN (${Prisma.join(publisherIds)})
          AND se.created_at >= ${from}
        GROUP BY se.from_publisher_id
      `
    );

    return rows.map((row) => ({ fromPublisherId: row.from_publisher_id, count: Number(row.count ?? 0n) }));
  },

  async aggregateMissionStatsSummary(missionId: string): Promise<
    Array<{
      fromPublisherId: string | null;
      clickCount: number;
      applyCount: number;
    }>
  > {
    // Single query with PostgreSQL FILTER clause to reduce pool usage by 50%
    // More efficient than 2 separate groupBy queries
    const rows = await prisma.$queryRaw<
      Array<{
        from_publisher_id: string | null;
        click_count: bigint;
        apply_count: bigint;
      }>
    >(
      Prisma.sql`
        SELECT
          from_publisher_id,
          COUNT(*) FILTER (WHERE type = 'click') AS click_count,
          COUNT(*) FILTER (WHERE type = 'apply') AS apply_count
        FROM "stat_event"
        WHERE mission_id = ${missionId}
          AND is_bot = false
          AND type IN ('click', 'apply')
        GROUP BY from_publisher_id
      `
    );

    return rows.map((row) => ({
      fromPublisherId: row.from_publisher_id,
      clickCount: Number(row.click_count),
      applyCount: Number(row.apply_count),
    }));
  },
};

export default statEventRepository;
