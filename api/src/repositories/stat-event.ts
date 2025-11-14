import { Prisma, StatEvent } from "../db/core";
import { prismaCore } from "../db/postgres";

export const statEventRepository = {
  async findMany(params: Prisma.StatEventFindManyArgs = {}): Promise<StatEvent[]> {
    return prismaCore.statEvent.findMany(params);
  },

  async findFirst(params: Prisma.StatEventFindFirstArgs): Promise<StatEvent | null> {
    return prismaCore.statEvent.findFirst(params);
  },

  async findUnique(params: Prisma.StatEventFindUniqueArgs): Promise<StatEvent | null> {
    return prismaCore.statEvent.findUnique(params);
  },

  async count(params: Prisma.StatEventCountArgs = {}): Promise<number> {
    return prismaCore.statEvent.count(params);
  },

  async create(params: Prisma.StatEventCreateArgs): Promise<StatEvent> {
    return prismaCore.statEvent.create(params);
  },

  async update(params: Prisma.StatEventUpdateArgs): Promise<StatEvent> {
    return prismaCore.statEvent.update(params);
  },

  async updateMany(params: Prisma.StatEventUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prismaCore.statEvent.updateMany(params);
  },

  async groupBy<T extends Prisma.StatEventGroupByArgs>(params: Prisma.SelectSubset<T, Prisma.StatEventGroupByArgs>): Promise<Prisma.GetStatEventGroupByPayload<T>> {
    return prismaCore.statEvent.groupBy(params as any) as Prisma.GetStatEventGroupByPayload<T>;
  },

  async aggregateWarningBotBuckets(user: string): Promise<
    { bucket: "type" | "publisherTo" | "publisherFrom"; key: string; doc_count: number }[]
  > {
    const rows = await prismaCore.$queryRaw<
      { bucket: "type" | "publisherTo" | "publisherFrom"; key: string | null; doc_count: bigint }[]
    >(
      Prisma.sql`
        SELECT
          CASE
            WHEN GROUPING(type) = 0 THEN 'type'
            WHEN GROUPING(to_publisher_id) = 0 THEN 'publisherTo'
            ELSE 'publisherFrom'
          END AS bucket,
          COALESCE(type::text, to_publisher_id::text, from_publisher_id::text, '') AS key,
          COUNT(*)::bigint AS doc_count
        FROM "StatEvent"
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
};

export default statEventRepository;
