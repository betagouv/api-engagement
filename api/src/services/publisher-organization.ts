import { Prisma, PublisherOrganization } from "@/db/core";
import { publisherOrganizationRepository } from "@/repositories/publisher-organization";
import {
  OrgArrayColumn,
  PublisherOrganizationFindManyOptions,
  PublisherOrganizationFindParams,
  PublisherOrganizationRecord,
  PublisherOrganizationUpdateInput,
  PublisherOrganizationWithRelations,
} from "@/types/publisher-organization";

const buildWhere = (params: PublisherOrganizationFindParams): Prisma.PublisherOrganizationWhereInput => {
  const where: Prisma.PublisherOrganizationWhereInput = {
    publisherId: params.publisherId,
  };
  if (params.id) {
    where.id = params.id;
  }
  if (params.ids) {
    where.id = { in: params.ids };
  }
  if (params.clientId) {
    where.clientId = params.clientId;
  }
  if (params.clientIds) {
    where.clientId = { in: params.clientIds };
  }
  if (params.name) {
    where.name = params.name;
  }
  if (params.rna) {
    where.rna = params.rna;
  }
  if (params.siren) {
    where.siren = params.siren;
  }
  if (params.siret) {
    where.siret = params.siret;
  }
  if (params.url) {
    where.url = params.url;
  }
  if (params.verifiedAt) {
    where.verifiedAt = params.verifiedAt;
  }

  return where;
};

const publisherOrganizationService = {
  findOneByClientIdAndPublisher: async (clientId: string, publisherId: string): Promise<PublisherOrganizationRecord | null> => {
    return publisherOrganizationRepository.findUnique({
      where: { publisherId_clientId: { clientId, publisherId } },
    });
  },
  findUniqueOrCreate: async (clientId: string, publisherId: string, data?: Partial<PublisherOrganizationRecord>): Promise<PublisherOrganizationRecord> => {
    const publisherOrganization = await publisherOrganizationRepository.findUnique({ where: { publisherId_clientId: { clientId, publisherId } } });
    if (publisherOrganization) {
      return publisherOrganization;
    }
    return publisherOrganizationRepository.create({ publisher: { connect: { id: publisherId } }, clientId, ...data });
  },
  count: async (params: PublisherOrganizationFindParams): Promise<number> => {
    const where = buildWhere(params);
    return publisherOrganizationRepository.count({ where });
  },
  findMany: async (params: PublisherOrganizationFindParams, options: PublisherOrganizationFindManyOptions = {}): Promise<PublisherOrganizationRecord[]> => {
    const where = buildWhere(params);
    return publisherOrganizationRepository.findMany({ where, take: options.take, skip: options.skip, select: options.select ?? undefined });
  },
  create: async (params: Omit<PublisherOrganizationRecord, "id" | "createdAt" | "updatedAt">): Promise<PublisherOrganizationRecord> => {
    const data: Prisma.PublisherOrganizationCreateInput = {
      name: params.name,
      rna: params.rna,
      siren: params.siren,
      siret: params.siret,
      url: params.url,
      logo: params.logo,
      description: params.description,
      legalStatus: params.legalStatus,
      type: params.type,
      actions: params.actions,
      fullAddress: params.fullAddress,
      postalCode: params.postalCode,
      city: params.city,
      beneficiaries: params.beneficiaries,
      parentOrganizations: params.parentOrganizations,
      verifiedAt: params.verifiedAt,
      publisher: { connect: { id: params.publisherId } },
      clientId: params.clientId,
    };
    if (params.organizationIdVerified) {
      data.organizationVerified = { connect: { id: params.organizationIdVerified } };
    }
    return publisherOrganizationRepository.create(data);
  },
  update: async (id: string, params: PublisherOrganizationUpdateInput): Promise<PublisherOrganizationWithRelations> => {
    const data: Prisma.PublisherOrganizationUpdateInput = {
      name: params.name,
      rna: params.rna,
      siren: params.siren,
      siret: params.siret,
      url: params.url,
      logo: params.logo,
      description: params.description,
      legalStatus: params.legalStatus,
      type: params.type,
      actions: params.actions,
      fullAddress: params.fullAddress,
      postalCode: params.postalCode,
      city: params.city,
      beneficiaries: params.beneficiaries,
      parentOrganizations: params.parentOrganizations,
      verifiedAt: params.verifiedAt,
      verificationStatus: params.verificationStatus,
    };
    if (params.organizationIdVerified) {
      data.organizationVerified = { connect: { id: params.organizationIdVerified } };
    }
    if (params.publisherId) {
      data.publisher = { connect: { id: params.publisherId } };
    }
    return publisherOrganizationRepository.update(id, data, {
      include: { organizationVerified: { select: { id: true, rna: true, siren: true } } },
    }) as Promise<PublisherOrganizationWithRelations>;
  },
  groupBy: async (by: (keyof PublisherOrganization)[], where: Prisma.PublisherOrganizationWhereInput) => {
    return publisherOrganizationRepository.groupBy(by, where);
  },
  /**
   * Returns the IDs of organizations whose names match `value` in an array column, case-insensitively.
   * Used for filtering widget rules (array fields associated with the organization).
   */
  findIdsMatchingArrayValue: async (column: OrgArrayColumn, value: string): Promise<string[]> => {
    return publisherOrganizationRepository.findIdsByArrayValueInsensitive(column, value);
  },
  autocompleteParentOrganizations: async (publisherIds: string[], search: string): Promise<Array<{ key: string; doc_count: number }>> => {
    const rows = await publisherOrganizationRepository.aggregateParentOrganizations(publisherIds, search);

    return rows.map((row) => ({ key: row.value, doc_count: row.count }));
  },
};

export default publisherOrganizationService;
