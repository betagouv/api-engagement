import { randomBytes } from "crypto";

import { Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";
import { organizationRepository } from "../repositories/organization";
import {
  OrganizationCreateInput,
  OrganizationExportCandidate,
  OrganizationRecord,
  OrganizationSearchParams,
  OrganizationSearchResult,
  OrganizationUpdatePatch,
  OrganizationUpsertInput,
} from "../types/organization";
import { chunk } from "../utils/array";
import { normalizeOptionalString, normalizeSlug, normalizeStringArray } from "../utils/normalize";
import { isValidRNA, isValidSiret } from "../utils/organization";
import { slugify } from "../utils/string";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const generateOrganizationId = (): string => randomBytes(12).toString("hex");

const buildSearchWhere = (params: OrganizationSearchParams): Prisma.OrganizationWhereInput => {
  const and: Prisma.OrganizationWhereInput[] = [];

  if (params.department) {
    and.push({ addressDepartmentName: { equals: params.department, mode: "insensitive" } });
  }
  if (params.city) {
    and.push({ addressCity: { equals: params.city, mode: "insensitive" } });
  }
  if (params.rna) {
    and.push({ rna: params.rna });
  }
  if (params.siren) {
    and.push({ siren: params.siren });
  }
  if (params.siret) {
    and.push({ OR: [{ siret: params.siret }, { sirets: { has: params.siret } }] });
  }
  if (params.ids?.length) {
    and.push({ id: { in: params.ids } });
  }

  if (params.query) {
    const query = params.query.trim();
    if (query) {
      if (isValidRNA(query)) {
        and.push({ rna: query });
      } else if (isValidSiret(query)) {
        and.push({ OR: [{ siret: query }, { sirets: { has: query } }] });
      } else {
        const slug = slugify(query);
        const textConditions: Prisma.OrganizationWhereInput[] = [
          { title: { contains: query, mode: "insensitive" } },
          { shortTitle: { contains: query, mode: "insensitive" } },
          { rna: { contains: query, mode: "insensitive" } },
          { siret: { contains: query, mode: "insensitive" } },
          { siren: { contains: query, mode: "insensitive" } },
        ];
        if (slug) {
          textConditions.push({ names: { has: slug } });
        }
        and.push({ OR: textConditions });
      }
    }
  }

  if (!and.length) {
    return {};
  }
  return { AND: and };
};

const mapCreateInput = (input: OrganizationCreateInput): Prisma.OrganizationCreateInput => {
  const title = input.title?.trim();
  if (!title) {
    throw new Error("Organization title is required");
  }
  let names = normalizeStringArray(input.names ?? null, { slugifyItems: true });
  if (!names.length) {
    const fallback = slugify(title);
    names = fallback ? [fallback] : [];
  }
  const sirets = normalizeStringArray(input.sirets);
  const id = (input.id && input.id.trim()) || generateOrganizationId();

  return {
    id,
    title,
    rna: normalizeOptionalString(input.rna),
    siren: normalizeOptionalString(input.siren),
    siret: normalizeOptionalString(input.siret),
    sirets,
    rupMi: normalizeOptionalString(input.rupMi),
    gestion: normalizeOptionalString(input.gestion),
    status: normalizeOptionalString(input.status),
    createdAt: input.createdAt ?? undefined,
    updatedAt: input.updatedAt ?? undefined,
    lastDeclaredAt: input.lastDeclaredAt ?? undefined,
    publishedAt: input.publishedAt ?? undefined,
    dissolvedAt: input.dissolvedAt ?? undefined,
    nature: normalizeOptionalString(input.nature),
    groupement: normalizeOptionalString(input.groupement),
    names,
    shortTitle: normalizeOptionalString(input.shortTitle),
    titleSlug: normalizeSlug(title, input.titleSlug ?? null) ?? undefined,
    shortTitleSlug: normalizeSlug(input.shortTitle ?? null, input.shortTitleSlug ?? null) ?? undefined,
    object: normalizeOptionalString(input.object),
    socialObject1: normalizeOptionalString(input.socialObject1),
    socialObject2: normalizeOptionalString(input.socialObject2),
    addressComplement: normalizeOptionalString(input.addressComplement),
    addressNumber: normalizeOptionalString(input.addressNumber),
    addressRepetition: normalizeOptionalString(input.addressRepetition),
    addressType: normalizeOptionalString(input.addressType),
    addressStreet: normalizeOptionalString(input.addressStreet),
    addressDistribution: normalizeOptionalString(input.addressDistribution),
    addressInseeCode: normalizeOptionalString(input.addressInseeCode),
    addressPostalCode: normalizeOptionalString(input.addressPostalCode),
    addressDepartmentCode: normalizeOptionalString(input.addressDepartmentCode),
    addressDepartmentName: normalizeOptionalString(input.addressDepartmentName),
    addressRegion: normalizeOptionalString(input.addressRegion),
    addressCity: normalizeOptionalString(input.addressCity),
    managementDeclarant: normalizeOptionalString(input.managementDeclarant),
    managementComplement: normalizeOptionalString(input.managementComplement),
    managementStreet: normalizeOptionalString(input.managementStreet),
    managementDistribution: normalizeOptionalString(input.managementDistribution),
    managementPostalCode: normalizeOptionalString(input.managementPostalCode),
    managementCity: normalizeOptionalString(input.managementCity),
    managementCountry: normalizeOptionalString(input.managementCountry),
    directorCivility: normalizeOptionalString(input.directorCivility),
    website: normalizeOptionalString(input.website),
    observation: normalizeOptionalString(input.observation),
    syncAt: input.syncAt ?? undefined,
    source: normalizeOptionalString(input.source),
    isRUP: Boolean(input.isRUP),
    letudiantPublicId: normalizeOptionalString(input.letudiantPublicId),
    letudiantUpdatedAt: input.letudiantUpdatedAt ?? undefined,
    lastExportedToPgAt: input.lastExportedToPgAt ?? undefined,
  };
};

const mapUpdateInput = (patch: OrganizationUpdatePatch): Prisma.OrganizationUpdateInput => {
  const data: Prisma.OrganizationUpdateInput = {};

  if (patch.title !== undefined) {
    const title = normalizeOptionalString(patch.title);
    if (title) {
      data.title = title;
      data.titleSlug = normalizeSlug(title, patch.titleSlug ?? null);
    }
  }

  if (patch.names !== undefined) {
    let names = normalizeStringArray(patch.names, { slugifyItems: true });
    if (!names.length && patch.title) {
      const fallback = slugify(patch.title);
      names = fallback ? [fallback] : [];
    }
    data.names = names;
  }

  if (patch.shortTitle !== undefined) {
    const shortTitle = normalizeOptionalString(patch.shortTitle);
    data.shortTitle = shortTitle ?? null;
    data.shortTitleSlug = normalizeSlug(shortTitle ?? null, patch.shortTitleSlug ?? null);
  } else if (patch.shortTitleSlug !== undefined) {
    data.shortTitleSlug = normalizeOptionalString(patch.shortTitleSlug);
  }

  if (patch.rna !== undefined) {
    data.rna = normalizeOptionalString(patch.rna);
  }
  if (patch.siren !== undefined) {
    data.siren = normalizeOptionalString(patch.siren);
  }
  if (patch.siret !== undefined) {
    data.siret = normalizeOptionalString(patch.siret);
  }
  if (patch.sirets !== undefined) {
    data.sirets = normalizeStringArray(patch.sirets);
  }
  if (patch.rupMi !== undefined) {
    data.rupMi = normalizeOptionalString(patch.rupMi);
  }
  if (patch.gestion !== undefined) {
    data.gestion = normalizeOptionalString(patch.gestion);
  }
  if (patch.status !== undefined) {
    data.status = normalizeOptionalString(patch.status);
  }
  if (patch.lastDeclaredAt !== undefined) {
    data.lastDeclaredAt = patch.lastDeclaredAt ?? null;
  }
  if (patch.publishedAt !== undefined) {
    data.publishedAt = patch.publishedAt ?? null;
  }
  if (patch.dissolvedAt !== undefined) {
    data.dissolvedAt = patch.dissolvedAt ?? null;
  }
  if (patch.nature !== undefined) {
    data.nature = normalizeOptionalString(patch.nature);
  }
  if (patch.groupement !== undefined) {
    data.groupement = normalizeOptionalString(patch.groupement);
  }
  if (patch.object !== undefined) {
    data.object = normalizeOptionalString(patch.object);
  }
  if (patch.socialObject1 !== undefined) {
    data.socialObject1 = normalizeOptionalString(patch.socialObject1);
  }
  if (patch.socialObject2 !== undefined) {
    data.socialObject2 = normalizeOptionalString(patch.socialObject2);
  }
  if (patch.addressComplement !== undefined) {
    data.addressComplement = normalizeOptionalString(patch.addressComplement);
  }
  if (patch.addressNumber !== undefined) {
    data.addressNumber = normalizeOptionalString(patch.addressNumber);
  }
  if (patch.addressRepetition !== undefined) {
    data.addressRepetition = normalizeOptionalString(patch.addressRepetition);
  }
  if (patch.addressType !== undefined) {
    data.addressType = normalizeOptionalString(patch.addressType);
  }
  if (patch.addressStreet !== undefined) {
    data.addressStreet = normalizeOptionalString(patch.addressStreet);
  }
  if (patch.addressDistribution !== undefined) {
    data.addressDistribution = normalizeOptionalString(patch.addressDistribution);
  }
  if (patch.addressInseeCode !== undefined) {
    data.addressInseeCode = normalizeOptionalString(patch.addressInseeCode);
  }
  if (patch.addressPostalCode !== undefined) {
    data.addressPostalCode = normalizeOptionalString(patch.addressPostalCode);
  }
  if (patch.addressDepartmentCode !== undefined) {
    data.addressDepartmentCode = normalizeOptionalString(patch.addressDepartmentCode);
  }
  if (patch.addressDepartmentName !== undefined) {
    data.addressDepartmentName = normalizeOptionalString(patch.addressDepartmentName);
  }
  if (patch.addressRegion !== undefined) {
    data.addressRegion = normalizeOptionalString(patch.addressRegion);
  }
  if (patch.addressCity !== undefined) {
    data.addressCity = normalizeOptionalString(patch.addressCity);
  }
  if (patch.managementDeclarant !== undefined) {
    data.managementDeclarant = normalizeOptionalString(patch.managementDeclarant);
  }
  if (patch.managementComplement !== undefined) {
    data.managementComplement = normalizeOptionalString(patch.managementComplement);
  }
  if (patch.managementStreet !== undefined) {
    data.managementStreet = normalizeOptionalString(patch.managementStreet);
  }
  if (patch.managementDistribution !== undefined) {
    data.managementDistribution = normalizeOptionalString(patch.managementDistribution);
  }
  if (patch.managementPostalCode !== undefined) {
    data.managementPostalCode = normalizeOptionalString(patch.managementPostalCode);
  }
  if (patch.managementCity !== undefined) {
    data.managementCity = normalizeOptionalString(patch.managementCity);
  }
  if (patch.managementCountry !== undefined) {
    data.managementCountry = normalizeOptionalString(patch.managementCountry);
  }
  if (patch.directorCivility !== undefined) {
    data.directorCivility = normalizeOptionalString(patch.directorCivility);
  }
  if (patch.website !== undefined) {
    data.website = normalizeOptionalString(patch.website);
  }
  if (patch.observation !== undefined) {
    data.observation = normalizeOptionalString(patch.observation);
  }
  if (patch.syncAt !== undefined) {
    data.syncAt = patch.syncAt ?? null;
  }
  if (patch.source !== undefined) {
    data.source = normalizeOptionalString(patch.source);
  }
  if (patch.isRUP !== undefined) {
    data.isRUP = Boolean(patch.isRUP);
  }
  if (patch.letudiantPublicId !== undefined) {
    data.letudiantPublicId = normalizeOptionalString(patch.letudiantPublicId);
  }
  if (patch.letudiantUpdatedAt !== undefined) {
    data.letudiantUpdatedAt = patch.letudiantUpdatedAt ?? null;
  }
  if (patch.lastExportedToPgAt !== undefined) {
    data.lastExportedToPgAt = patch.lastExportedToPgAt ?? null;
  }
  if (patch.updatedAt instanceof Date) {
    data.updatedAt = patch.updatedAt;
  }

  return data;
};

export const organizationService = (() => {
  const findOrganizationsByFilters = async (params: OrganizationSearchParams = {}): Promise<OrganizationSearchResult> => {
    const where = buildSearchWhere(params);
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(params.offset ?? 0, 0);
    const includeTotal = params.includeTotal ?? "filtered";
    const orderByField = params.orderBy ?? "updatedAt";
    const orderDirection = params.orderDirection ?? (orderByField === "title" ? "asc" : "desc");
    const orderBy: Prisma.OrganizationOrderByWithRelationInput = orderByField === "title" ? { title: orderDirection } : { updatedAt: orderDirection };

    const [total, organizations] = await Promise.all([
      includeTotal === "none" ? Promise.resolve(0) : includeTotal === "all" ? organizationRepository.count() : organizationRepository.count({ where }),
      organizationRepository.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy,
      }),
    ]);

    return {
      total,
      results: organizations,
    };
  };

  const findOneOrganizationById = async (id: string): Promise<OrganizationRecord | null> => {
    if (!id) {
      return null;
    }
    return await organizationRepository.findUnique({ where: { id } });
  };

  const findOrganizationsByIds = async (ids: string[]): Promise<OrganizationRecord[]> => {
    if (!ids.length) {
      return [];
    }
    return await organizationRepository.findMany({
      where: { id: { in: ids } },
    });
  };

  const createOrganization = async (input: OrganizationCreateInput): Promise<OrganizationRecord> => {
    return await organizationRepository.create({
      data: mapCreateInput(input),
    });
  };

  const updateOrganization = async (id: string, patch: OrganizationUpdatePatch): Promise<OrganizationRecord> => {
    try {
      return await organizationRepository.update({
        where: { id },
        data: mapUpdateInput(patch),
      });
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2025") {
        throw new Error("Organization not found");
      }
      throw error;
    }
  };

  const findOneOrganizationByRna = async (rna: string): Promise<OrganizationRecord | null> => {
    if (!rna) {
      return null;
    }
    return await organizationRepository.findFirst({
      where: { rna },
    });
  };

  const findOneOrganizationBySiret = async (siret: string): Promise<OrganizationRecord | null> => {
    if (!siret) {
      return null;
    }
    return await organizationRepository.findFirst({
      where: { OR: [{ siret }, { sirets: { has: siret } }] },
    });
  };

  const findOneOrganizationBySiren = async (siren: string): Promise<OrganizationRecord | null> => {
    if (!siren) {
      return null;
    }
    return await organizationRepository.findFirst({
      where: { siren },
    });
  };

  const findOneOrganizationByName = async (name: string): Promise<OrganizationRecord | null> => {
    const slug = slugify(name ?? "");
    if (!slug) {
      return null;
    }
    const organizations = await organizationRepository.findMany({
      where: { names: { has: slug } },
      take: 2,
    });
    if (organizations.length === 1) {
      return organizations[0];
    }
    return null;
  };

  const bulkUpsertByRna = async (records: OrganizationUpsertInput[], options: { chunkSize?: number } = {}): Promise<void> => {
    if (!records.length) {
      return;
    }

    // Deduplicate by RNA to avoid multiple upserts with the same unique key inside a transaction
    const byRna = new Map<string, OrganizationUpsertInput>();
    for (const record of records) {
      const rna = normalizeOptionalString(record.rna);
      if (!rna) {
        continue;
      }
      byRna.set(rna, { ...record, rna });
    }
    if (!byRna.size) {
      return;
    }

    const chunkSize = options.chunkSize ?? 25;
    const chunkedRecords = chunk(Array.from(byRna.values()), chunkSize);
    for (const chunkRecords of chunkedRecords) {
      await prismaCore.$transaction(
        chunkRecords.map((record) =>
          prismaCore.organization.upsert({
            where: { rna: record.rna as string },
            create: mapCreateInput(record),
            update: mapUpdateInput(record),
          })
        )
      );
    }
  };

  const findOrganizationsByExportBacklog = async (limit: number, afterId?: string | null): Promise<OrganizationExportCandidate[]> => {
    return organizationRepository.findExportCandidateIds(limit, afterId);
  };

  const countOrganizationsByExportBacklog = async (): Promise<number> => {
    return organizationRepository.countExportCandidates();
  };

  const markExported = async (ids: string[], exportedAt: Date = new Date()): Promise<void> => {
    if (!ids.length) {
      return;
    }
    await organizationRepository.markExported(ids, exportedAt);
  };

  return {
    findOrganizationsByFilters,
    findOneOrganizationById,
    findOrganizationsByIds,
    createOrganization,
    updateOrganization,
    findOneOrganizationByRna,
    findOneOrganizationBySiret,
    findOneOrganizationBySiren,
    findOneOrganizationByName,
    bulkUpsertByRna,
    findOrganizationsByExportBacklog,
    countOrganizationsByExportBacklog,
    markExported,
  };
})();
