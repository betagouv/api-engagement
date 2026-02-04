import { Prisma } from "../db/core";
import { publisherOrganizationRepository } from "../repositories/publisher-organization";
import { PublisherOrganizationFindParams, PublisherOrganizationRecord } from "../types/publisher-organization";

const publisherOrganizationService = {
  findMany: async (params: PublisherOrganizationFindParams): Promise<PublisherOrganizationRecord[]> => {
    const where: Prisma.PublisherOrganizationWhereInput = {
      publisherId: params.publisherId,
    };
    if (params.organizationClientId) {
      where.organizationClientId = params.organizationClientId;
    }
    if (params.organizationClientIds) {
      where.organizationClientId = { in: params.organizationClientIds };
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
    return publisherOrganizationRepository.findMany({ where });
  },
  create: async (params: Omit<PublisherOrganizationRecord, "id" | "createdAt" | "updatedAt">): Promise<PublisherOrganizationRecord> => {
    const data: Prisma.PublisherOrganizationCreateInput = {
      name: params.name,
      rna: params.rna,
      rnaVerified: params.rnaVerified,
      siren: params.siren,
      sirenVerified: params.sirenVerified,
      siret: params.siret,
      siretVerified: params.siretVerified,
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
      organizationClientId: params.organizationClientId,
    };
    if (params.organizationIdVerified) {
      data.organizationVerified = { connect: { id: params.organizationIdVerified } };
    }
    return publisherOrganizationRepository.create(data);
  },
  update: async (id: string, params: Omit<PublisherOrganizationRecord, "id" | "createdAt" | "updatedAt">): Promise<PublisherOrganizationRecord> => {
    const data: Prisma.PublisherOrganizationUpdateInput = {
      name: params.name,
      rna: params.rna,
      rnaVerified: params.rnaVerified,
      siren: params.siren,
      sirenVerified: params.sirenVerified,
      siret: params.siret,
      siretVerified: params.siretVerified,
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
