import { Prisma, PublisherOrganization } from "@/db/core";
import { prisma } from "@/db/postgres";
import { ORG_ARRAY_COLUMNS, OrgArrayColumn, PublisherOrganizationWithRelations } from "@/types/publisher-organization";

export const publisherOrganizationRepository = {
  async findUnique(params: Prisma.PublisherOrganizationFindUniqueArgs): Promise<PublisherOrganization | null> {
    return prisma.publisherOrganization.findUnique(params);
  },

  async findMany(params: Prisma.PublisherOrganizationFindManyArgs = {}): Promise<PublisherOrganization[]> {
    return prisma.publisherOrganization.findMany(params);
  },

  async findFirst(params: Prisma.PublisherOrganizationFindFirstArgs): Promise<PublisherOrganization | null> {
    return prisma.publisherOrganization.findFirst(params);
  },

  async create(params: Prisma.PublisherOrganizationCreateInput): Promise<PublisherOrganization> {
    return prisma.publisherOrganization.create({
      data: params,
    });
  },

  async update(id: string, params: Prisma.PublisherOrganizationUpdateInput, options = {}): Promise<PublisherOrganization | PublisherOrganizationWithRelations> {
    return prisma.publisherOrganization.update({
      where: { id },
      data: params,
      ...options,
    });
  },

  groupBy<K extends keyof PublisherOrganization>(by: K[], where: Prisma.PublisherOrganizationWhereInput) {
    return prisma.publisherOrganization.groupBy({
      by: by as any,
      where,
      _count: true,
    });
  },

  async count(params: Prisma.PublisherOrganizationCountArgs = {}): Promise<number> {
    return prisma.publisherOrganization.count(params);
  },

  /**
   * Retourne les ids des organisations dont la colonne array `column` contient un élément
   * égal à `value`, de manière insensible à la casse.
   * Prisma ne supportant pas `mode: "insensitive"` sur les opérateurs array, on passe par du SQL brut.
   * `column` est validée contre l'allowlist `ORG_ARRAY_COLUMNS` avant d'être utilisée comme
   * identifiant SQL (guillemets échappés) → aucune injection possible.
   */
  async findIdsByArrayValueInsensitive(column: OrgArrayColumn, value: string): Promise<string[]> {
    if (!ORG_ARRAY_COLUMNS.includes(column)) {
      throw new Error(`Unsupported array column: ${column}`);
    }
    const columnSql = Prisma.raw(`"${column.replaceAll('"', '""')}"`);
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "publisher_organization"
      WHERE EXISTS (SELECT 1 FROM unnest(${columnSql}) AS elem WHERE lower(elem) = lower(${value}))
    `;
    return rows.map((row) => row.id);
  },

  async aggregateParentOrganizations(publisherIds: string[], search: string): Promise<Array<{ value: string; count: number }>> {
    const publisherFilter = publisherIds.length ? Prisma.sql`WHERE publisher_id IN (${Prisma.join(publisherIds)})` : Prisma.empty;
    const rows = await prisma.$queryRaw<Array<{ value: string; doc_count: bigint }>>(
      Prisma.sql`
        SELECT value, COUNT(*) as doc_count
        FROM (
          SELECT UNNEST(parent_organizations) as value
          FROM publisher_organization
          ${publisherFilter}
        ) t
        WHERE value IS NOT NULL AND value != '' AND value ILIKE ${`%${search}%`}
        GROUP BY value
        ORDER BY doc_count DESC
        LIMIT 1000
      `
    );

    return rows.map((row) => ({ value: row.value, count: Number(row.doc_count) }));
  },
};
export default publisherOrganizationRepository;
