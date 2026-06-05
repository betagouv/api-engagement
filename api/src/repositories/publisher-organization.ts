import { Prisma, PublisherOrganization } from "@/db/core";
import { prisma } from "@/db/postgres";
import { PublisherOrganizationWithRelations } from "@/types/publisher-organization";

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
   * `column` est restreint à une union typée (pas d'interpolation libre → pas d'injection).
   */
  async findIdsByArrayValueInsensitive(column: "parent_organizations" | "actions", value: string): Promise<string[]> {
    const columnSql = column === "actions" ? Prisma.sql`"actions"` : Prisma.sql`"parent_organizations"`;
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "publisher_organization"
      WHERE EXISTS (SELECT 1 FROM unnest(${columnSql}) AS elem WHERE lower(elem) = lower(${value}))
    `;
    return rows.map((row) => row.id);
  },
};
export default publisherOrganizationRepository;
