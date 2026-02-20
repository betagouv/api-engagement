import { Import, Prisma } from "../db/core";
import { prisma } from "../db/postgres";

export const importRepository = {
  async findMany(params: Prisma.ImportFindManyArgs = {}): Promise<Import[]> {
    return prisma.import.findMany(params);
  },
  async createMany(params: Prisma.ImportCreateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.import.createMany(params);
  },
  async findExistingIds(ids: string[]): Promise<string[]> {
    if (!ids.length) {
      return [];
    }
    const rows = await prisma.import.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },
  async getLastImportSummary(): Promise<{ total: number; success: number; last: Date | null }> {
    type SummaryRow = { total: bigint | number | string | null; success: bigint | number | string | null; last: Date | null };
    const [row] = await prisma.$queryRaw<SummaryRow[]>`
      WITH last_imports AS (
        SELECT DISTINCT ON ("publisher_id")
          "publisher_id",
          "status",
          "started_at"
        FROM "import"
        ORDER BY "publisher_id", "started_at" DESC NULLS LAST, "id" DESC
      )
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE "status" = 'SUCCESS')::bigint AS success,
        MAX("started_at") AS last
      FROM last_imports;
    `;
    return {
      total: row?.total ? Number(row.total) : 0,
      success: row?.success ? Number(row.success) : 0,
      last: row?.last ?? null,
    };
  },

  async findFirst(params: Prisma.ImportFindFirstArgs): Promise<Import | null> {
    return prisma.import.findFirst(params);
  },

  async findUnique(params: Prisma.ImportFindUniqueArgs): Promise<Import | null> {
    return prisma.import.findUnique(params);
  },

  async count(params: Prisma.ImportCountArgs = {}): Promise<number> {
    return prisma.import.count(params);
  },

  async create(params: Prisma.ImportCreateArgs): Promise<Import> {
    return prisma.import.create(params);
  },

  async update(params: Prisma.ImportUpdateArgs): Promise<Import> {
    return prisma.import.update(params);
  },

  async updateMany(params: Prisma.ImportUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.import.updateMany(params);
  },

  async delete(params: Prisma.ImportDeleteArgs): Promise<Import> {
    return prisma.import.delete(params);
  },

  async deleteMany(params: Prisma.ImportDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.import.deleteMany(params);
  },
};
