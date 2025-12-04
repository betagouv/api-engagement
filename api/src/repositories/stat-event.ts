import { Prisma, StatEvent } from "../db/core";
import { prismaCore } from "../db/postgres";

const defaultInclude = Prisma.validator<Prisma.StatEventInclude>()({
  fromPublisher: {
    select: { id: true, name: true },
  },
  toPublisher: {
    select: { id: true, name: true },
  },
  mission: {
    include: {
      organization: {
        select: {
          id: true,
          title: true,
        },
      },
      addresses: true,
    },
  },
});

export const statEventRepository = {
  async findMany(params: Prisma.StatEventFindManyArgs = {}): Promise<StatEvent[]> {
    return prismaCore.statEvent.findMany({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<StatEvent[]>;
  },

  async findFirst(params: Prisma.StatEventFindFirstArgs): Promise<StatEvent | null> {
    return prismaCore.statEvent.findFirst({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<StatEvent | null>;
  },

  async findUnique(params: Prisma.StatEventFindUniqueArgs): Promise<StatEvent | null> {
    return prismaCore.statEvent.findUnique({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<StatEvent | null>;
  },

  async count(params: Prisma.StatEventCountArgs = {}): Promise<number> {
    return prismaCore.statEvent.count(params);
  },

  async create(params: Prisma.StatEventCreateArgs): Promise<StatEvent> {
    return prismaCore.statEvent.create({
      ...params,
      include: params.include ?? defaultInclude,
    });
  },

  async update(params: Prisma.StatEventUpdateArgs): Promise<StatEvent> {
    return prismaCore.statEvent.update({
      ...params,
      include: params.include ?? defaultInclude,
    });
  },

  async updateMany(params: Prisma.StatEventUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.statEvent.updateMany(params);
  },

  async groupBy<T extends Prisma.StatEventGroupByArgs>(params: Prisma.SelectSubset<T, Prisma.StatEventGroupByArgs>): Promise<Prisma.GetStatEventGroupByPayload<T>> {
    return prismaCore.statEvent.groupBy(params as any) as Prisma.GetStatEventGroupByPayload<T>;
  },

  async aggregateWarningBotBuckets(user: string): Promise<{ bucket: "type" | "publisherTo" | "publisherFrom"; key: string; doc_count: number }[]> {
    const rows = await prismaCore.$queryRaw<{ bucket: "type" | "publisherTo" | "publisherFrom"; key: string | null; doc_count: bigint }[]>(
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
    if (!publisherIds.length) return [];

    const rows = await prismaCore.$queryRaw<Array<{ from_publisher_id: string; count: bigint }>>(
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
};

export default statEventRepository;
