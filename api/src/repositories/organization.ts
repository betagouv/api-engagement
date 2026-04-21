import { Organization, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

type OrganizationV0SearchArgs = {
  rna?: string | null;
  siret?: string | null;
  queryRna?: string | null;
  querySiret?: string | null;
  querySiren?: string | null;
  queryText?: string | null;
  queryTs?: string | null;
  skip: number;
  take: number;
};

const organizationTextSearchExpression = Prisma.sql`to_tsvector('simple', COALESCE(o."search_text", ''))`;

export const organizationRepository = {
  async findMany(params: Prisma.OrganizationFindManyArgs = {}): Promise<Organization[]> {
    return prisma.organization.findMany(params);
  },

  async findManyForV0Search(args: OrganizationV0SearchArgs): Promise<Organization[]> {
    const conditions: Prisma.Sql[] = [];

    if (args.rna) {
      conditions.push(Prisma.sql`o."rna" = ${args.rna}`);
    }

    if (args.siret) {
      conditions.push(Prisma.sql`(o."siret" = ${args.siret} OR ${args.siret} = ANY(o."sirets"))`);
    }

    if (args.queryRna) {
      conditions.push(Prisma.sql`o."rna" = ${args.queryRna}`);
    } else if (args.querySiret) {
      conditions.push(Prisma.sql`(o."siret" = ${args.querySiret} OR ${args.querySiret} = ANY(o."sirets"))`);
    } else if (args.querySiren) {
      conditions.push(Prisma.sql`o."siren" = ${args.querySiren}`);
    } else if (args.queryTs) {
      conditions.push(Prisma.sql`${organizationTextSearchExpression} @@ to_tsquery('simple', ${args.queryTs})`);
    } else if (args.queryText) {
      conditions.push(Prisma.sql`o."search_text" LIKE ${`%${args.queryText}%`}`);
    }

    const whereClause = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, Prisma.sql` AND `)}` : Prisma.empty;
    const idRows = await prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT o."id"
        FROM "organization" o
        ${whereClause}
        ORDER BY o."updated_at" DESC
        LIMIT ${args.take}
        OFFSET ${args.skip}
      `
    );

    const ids = idRows.map((row) => row.id);
    if (!ids.length) {
      return [];
    }

    const organizations = await prisma.organization.findMany({
      where: { id: { in: ids } },
    });
    const organizationById = new Map(organizations.map((organization) => [organization.id, organization]));

    return ids.map((id) => organizationById.get(id)).filter((organization): organization is Organization => Boolean(organization));
  },

  async findFirst(params: Prisma.OrganizationFindFirstArgs): Promise<Organization | null> {
    return prisma.organization.findFirst(params);
  },

  async findUnique(params: Prisma.OrganizationFindUniqueArgs): Promise<Organization | null> {
    return prisma.organization.findUnique(params);
  },

  async count(params: Prisma.OrganizationCountArgs = {}): Promise<number> {
    return prisma.organization.count(params);
  },

  async create(params: Prisma.OrganizationCreateArgs): Promise<Organization> {
    return prisma.organization.create(params);
  },

  async createMany(params: Prisma.OrganizationCreateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.organization.createMany(params);
  },

  async upsert(params: Prisma.OrganizationUpsertArgs): Promise<Organization> {
    return prisma.organization.upsert(params);
  },

  async update(params: Prisma.OrganizationUpdateArgs): Promise<Organization> {
    return prisma.organization.update(params);
  },

  async updateMany(params: Prisma.OrganizationUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.organization.updateMany(params);
  },

  async deleteMany(params: Prisma.OrganizationDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.organization.deleteMany(params);
  },

  async countExportCandidates(): Promise<number> {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "organization"
      WHERE "last_exported_to_pg_at" IS NULL
         OR "last_exported_to_pg_at" < "updated_at"
    `;
    return Number(rows[0]?.count ?? 0);
  },

  async findExportCandidateIds(limit: number, afterId?: string | null): Promise<Array<{ id: string; updatedAt: Date }>> {
    return prisma.$queryRaw<Array<{ id: string; updated_at: Date }>>`
      SELECT "id", "updated_at"
      FROM "organization"
      WHERE ("last_exported_to_pg_at" IS NULL OR "last_exported_to_pg_at" < "updated_at")
        AND (${afterId ?? null}::text IS NULL OR "id" > ${afterId})
      ORDER BY "id"
      LIMIT ${limit}
    `.then((rows) => rows.map((row) => ({ id: row.id, updatedAt: row.updated_at })));
  },

  async markExported(ids: string[], exportedAt: Date): Promise<number> {
    if (!ids.length) {
      return 0;
    }
    const result = await prisma.$executeRaw`
      UPDATE "organization"
      SET "last_exported_to_pg_at" = ${exportedAt}
      WHERE "id" IN (${Prisma.join(ids)})
    `;
    return Number(result);
  },
};
