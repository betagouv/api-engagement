import { Prisma } from "../db/core";
import { publisherOrganizationRepository } from "../repositories/publisher-organization";
import {
  PublisherOrganizationFindManyOptions,
  PublisherOrganizationFindParams,
  PublisherOrganizationRecord,
  PublisherOrganizationUpdateInput,
} from "../types/publisher-organization";

const buildWhere = (params: PublisherOrganizationFindParams): Prisma.PublisherOrganizationWhereInput => {
  const where: Prisma.PublisherOrganizationWhereInput = {
    publisherId: params.publisherId,
  };
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
  count: async (params: PublisherOrganizationFindParams): Promise<number> => {
    const where = buildWhere(params);
    return publisherOrganizationRepository.count({ where });
  },
  findMany: async (params: PublisherOrganizationFindParams, options: PublisherOrganizationFindManyOptions = {}): Promise<PublisherOrganizationRecord[]> => {
    const where = buildWhere(params);
    return publisherOrganizationRepository.findMany({ where, take: options.take, skip: options.skip });
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
  update: async (id: string, params: PublisherOrganizationUpdateInput): Promise<PublisherOrganizationRecord> => {
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
    return publisherOrganizationRepository.update(id, data);
  },
};

export default publisherOrganizationService;
