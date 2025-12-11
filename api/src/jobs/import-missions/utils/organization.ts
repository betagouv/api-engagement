import { DEPARTMENTS } from "../../../constants/departments";
import { captureException } from "../../../error";
import apiDatasubvention from "../../../services/api-datasubvention";
import { organizationService } from "../../../services/organization";
import { OrganizationCreateInput, OrganizationRecord, OrganizationUpdatePatch } from "../../../types/organization";
import { isValidRNA, isValidSiret } from "../../../utils/organization";
import type { ImportedMission } from "../types";

export const ORGANIZATION_VERIFICATION_STATUS = {
  RNA_MATCHED_WITH_DATA_DB: "RNA_MATCHED_WITH_DATA_DB",
  RNA_MATCHED_WITH_DATA_SUBVENTION: "RNA_MATCHED_WITH_DATA_SUBVENTION",
  RNA_NOT_MATCHED: "RNA_NOT_MATCHED",
  SIRET_MATCHED_WITH_DATA_DB: "SIRET_MATCHED_WITH_DATA_DB",
  SIRET_MATCHED_WITH_DATA_SUBVENTION: "SIRET_MATCHED_WITH_DATA_SUBVENTION",
  SIRET_NOT_MATCHED: "SIRET_NOT_MATCHED",
  NAME_EXACT_MATCHED_WITH_DB: "NAME_EXACT_MATCHED_WITH_DB",
  NAME_APPROXIMATE_MATCHED_WITH_DB: "NAME_APPROXIMATE_MATCHED_WITH_DB",
  NAME_NOT_MATCHED: "NAME_NOT_MATCHED",
  NO_DATA: "NO_DATA",
};

export const isVerified = (mission: Partial<ImportedMission>): boolean => {
  return [
    ORGANIZATION_VERIFICATION_STATUS.RNA_MATCHED_WITH_DATA_DB,
    ORGANIZATION_VERIFICATION_STATUS.RNA_MATCHED_WITH_DATA_SUBVENTION,
    ORGANIZATION_VERIFICATION_STATUS.SIRET_MATCHED_WITH_DATA_DB,
    ORGANIZATION_VERIFICATION_STATUS.SIRET_MATCHED_WITH_DATA_SUBVENTION,
    ORGANIZATION_VERIFICATION_STATUS.NAME_EXACT_MATCHED_WITH_DB,
    ORGANIZATION_VERIFICATION_STATUS.NAME_APPROXIMATE_MATCHED_WITH_DB,
    ORGANIZATION_VERIFICATION_STATUS.NO_DATA,
  ].includes(mission.organizationVerificationStatus || "");
};

export const getDepartement = (postalCode: string): { code: string; name: string; region: string } | null => {
  if (!postalCode) {
    return null;
  }
  const code = postalCode.slice(0, 2);
  if (!code || !DEPARTMENTS[code]) {
    return null;
  }
  return { code, name: DEPARTMENTS[code][0], region: DEPARTMENTS[code][1] };
};

export const verifyOrganization = async (missions: ImportedMission[]) => {
  console.log(`[Organization] Starting organization verification for ${missions.length} missions`);

  const result = [] as ImportedMission[];
  if (!missions.length) {
    return result;
  }

  try {
    const foundRNAs: Record<string, OrganizationRecord | "not_found"> = {};
    const foundSirets: Record<string, OrganizationRecord | "not_found"> = {};
    const foundNames: Record<string, OrganizationRecord | "not_found"> = {};

    let alreadyVerified = 0;
    let toVerify = 0;
    let rnaFound = 0;
    let rnaNotFound = 0;
    let siretFound = 0;
    let siretNotFound = 0;
    let nameFound = 0;
    let nameNotFound = 0;
    let noData = 0;

    for (const mission of missions) {
      if (isVerified(mission)) {
        alreadyVerified++;
        continue;
      }
      toVerify++;

      // remove all non alphanumeric characters and convert to uppercase
      const identifier = (mission.organizationRNA || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (identifier && isValidRNA(identifier)) {
        const cachedRna = foundRNAs[identifier];
        if (cachedRna === "not_found") {
          mission.organizationVerificationStatus = ORGANIZATION_VERIFICATION_STATUS.RNA_NOT_MATCHED;
          rnaNotFound++;
          continue;
        }
        if (cachedRna) {
          updateMissionOrganization(mission, cachedRna, ORGANIZATION_VERIFICATION_STATUS.RNA_MATCHED_WITH_DATA_DB);
          rnaFound++;
          continue;
        }
        const res = await findByRNA(identifier);
        if (!res) {
          foundRNAs[identifier] = "not_found";
          rnaNotFound++;
          continue;
        }
        foundRNAs[identifier] = res;
        updateMissionOrganization(mission, res, ORGANIZATION_VERIFICATION_STATUS.RNA_MATCHED_WITH_DATA_DB);
        rnaFound++;
        continue;
      }
      if (identifier && isValidSiret(identifier)) {
        const cachedSiret = foundSirets[identifier];
        if (cachedSiret === "not_found") {
          mission.organizationVerificationStatus = ORGANIZATION_VERIFICATION_STATUS.SIRET_NOT_MATCHED;
          siretNotFound++;
          continue;
        }
        if (cachedSiret) {
          updateMissionOrganization(mission, cachedSiret, ORGANIZATION_VERIFICATION_STATUS.SIRET_MATCHED_WITH_DATA_DB);
          siretFound++;
          continue;
        }
        const res = await findBySiret(identifier);
        if (!res) {
          foundSirets[identifier] = "not_found";
          siretNotFound++;
          continue;
        }
        foundSirets[identifier] = res;
        updateMissionOrganization(mission, res, ORGANIZATION_VERIFICATION_STATUS.SIRET_MATCHED_WITH_DATA_DB);
        siretFound++;
        continue;
      }
      if (mission.organizationName) {
        const name = mission.organizationName || "";
        const cachedName = foundNames[name];
        if (cachedName === "not_found") {
          mission.organizationVerificationStatus = ORGANIZATION_VERIFICATION_STATUS.NAME_NOT_MATCHED;
          nameNotFound++;
          continue;
        }
        if (cachedName) {
          updateMissionOrganization(mission, cachedName, ORGANIZATION_VERIFICATION_STATUS.NAME_EXACT_MATCHED_WITH_DB);
          nameFound++;
          continue;
        }
        const res = await findByName(name);
        if (!res) {
          foundNames[name] = "not_found";
          nameNotFound++;
          continue;
        }
        foundNames[name] = res;
        updateMissionOrganization(mission, res, ORGANIZATION_VERIFICATION_STATUS.NAME_EXACT_MATCHED_WITH_DB);
        nameFound++;
        continue;
      }
      noData++;
    }

    console.log(`[Organization] Already verified ${alreadyVerified} missions, to verify ${toVerify} missions (${noData} with no data)`);
    console.log(`[Organization] Found ${rnaFound + siretFound + nameFound} / ${toVerify} organizations (${rnaFound} RNAs, ${siretFound} SIRETs, ${nameFound} names)`);
    console.log(`[Organization] Not found ${rnaNotFound} RNAs, ${siretNotFound} SIRETs, ${nameNotFound} names`);

    // Fallback: create a minimal organization record from mission data when nothing could be matched
    for (const mission of missions) {
      const hasOrganization = Boolean(mission.organizationId);
      const hasIdentifiers = Boolean(mission.organizationRNA || mission.organizationSiren || mission.organizationSiret);
      if (hasOrganization || !mission.organizationName) {
        continue;
      }

      const org = await organizationService.createOrganization({
        title: mission.organizationName,
        rna: mission.organizationRNA || undefined,
        siren: mission.organizationSiren || undefined,
        siret: mission.organizationSiret || undefined,
        addressCity: mission.organizationCity || undefined,
        addressPostalCode: mission.organizationPostCode || undefined,
        addressDepartmentName: mission.organizationDepartmentName || undefined,
        addressDepartmentCode: mission.organizationDepartmentCode || undefined,
        status: mission.organizationStatusJuridique || mission.organizationType || undefined,
      });

      mission.organizationId = org.id;
      mission.organizationVerificationStatus = hasIdentifiers ? ORGANIZATION_VERIFICATION_STATUS.NO_DATA : ORGANIZATION_VERIFICATION_STATUS.NAME_NOT_MATCHED;
    }
  } catch (error) {
    captureException(error, `[Organization] Failure during rna enrichment`);
  }
};

const updateMissionOrganization = async (mission: ImportedMission, organization: OrganizationRecord, status: string) => {
  mission.organizationId = organization.id;
  mission.organizationNameVerified = organization.title;
  mission.organizationRNAVerified = organization.rna;
  mission.organizationSirenVerified = organization.siren || "";
  mission.organizationSiretVerified = organization.siret || "";
  mission.organizationAddressVerified =
    `${organization.addressNumber || ""} ${organization.addressRepetition || ""} ${organization.addressType || ""} ${organization.addressStreet || ""}`
      .replaceAll(/\s+/g, " ")
      .trim();
  mission.organizationCityVerified = organization.addressCity || "";
  mission.organizationPostalCodeVerified = organization.addressPostalCode || "";
  mission.organizationDepartmentCodeVerified = organization.addressDepartmentCode || "";
  mission.organizationDepartmentNameVerified = organization.addressDepartmentName || "";
  mission.organizationRegionVerified = organization.addressRegion || "";
  mission.organisationIsRUP = organization.isRUP || false;
  mission.organizationVerificationStatus = status;
};

const isBlank = (value?: string | null) => value === null || value === undefined || value === "";

const mergeOrganizationData = async (existing: OrganizationRecord, incoming: OrganizationCreateInput): Promise<OrganizationRecord> => {
  const patch: OrganizationUpdatePatch = {};
  const assignIfMissing = (field: keyof OrganizationRecord & keyof OrganizationCreateInput) => {
    const next = incoming[field];
    if (next === undefined || next === null || next === "") {
      return;
    }
    const current = existing[field];
    if (isBlank(current as string | null)) {
      (patch as Record<string, unknown>)[field] = next;
    }
  };

  assignIfMissing("siren");
  assignIfMissing("title");
  assignIfMissing("addressNumber");
  assignIfMissing("addressType");
  assignIfMissing("addressStreet");
  assignIfMissing("addressCity");
  assignIfMissing("addressPostalCode");
  assignIfMissing("addressDepartmentCode");
  assignIfMissing("addressDepartmentName");
  assignIfMissing("addressRegion");
  assignIfMissing("object");
  assignIfMissing("source");

  if (incoming.siret && isBlank(existing.siret)) {
    patch.siret = incoming.siret;
  }

  if (incoming.sirets?.length) {
    const merged = Array.from(new Set([...(existing.sirets ?? []), ...incoming.sirets]));
    if (merged.length !== existing.sirets.length) {
      patch.sirets = merged;
    }
  }

  if (incoming.isRUP && !existing.isRUP) {
    patch.isRUP = true;
  }

  if (Object.keys(patch).length === 0) {
    return existing;
  }

  return organizationService.updateOrganization(existing.id, patch);
};


const findExistingByIdentifiers = async (siret?: string | null, siren?: string | null): Promise<OrganizationRecord | null> => {
  if (siret) {
    const bySiret = await organizationService.findOneOrganizationBySiret(siret);
    if (bySiret) {
      return bySiret;
    }
  }
  if (siren) {
    return organizationService.findOneOrganizationBySiren(siren);
  }
  return null;
};

const findByRNA = async (rna: string) => {
  try {
    const response = await organizationService.findOneOrganizationByRna(rna);
    if (response) {
      return response;
    }

    const data = await apiDatasubvention.get(`/association/${rna}`);

    if (data && data.association) {
      const departement = data.association.adresse_siege_rna ? getDepartement(data.association.adresse_siege_rna[0]?.value?.code_postal) : null;
      const siret = Array.isArray(data.association.etablisements_siret) ? data.association.etablisements_siret[0]?.value[0] : data.association.etablisements_siret?.value;
      const siren = data.association.siren?.[0]?.value || siret?.slice(0, 9);
      const title = data.association.denomination_rna?.[0]?.value || data.association.denomination_siren?.[0]?.value || data.association.objet_social?.[0]?.value || rna;
      const payload: OrganizationCreateInput = {
        rna,
        title,
        siren,
        siret,
        sirets: siret ? [siret] : undefined,
        addressNumber: data.association.adresse_siege_rna?.[0]?.value?.numero,
        addressType: data.association.adresse_siege_rna?.[0]?.value?.type_voie,
        addressStreet: data.association.adresse_siege_rna?.[0]?.value?.voie,
        addressCity: data.association.adresse_siege_rna?.[0]?.value?.commune,
        addressPostalCode: data.association.adresse_siege_rna?.[0]?.value?.code_postal,
        addressDepartmentCode: departement?.code,
        addressDepartmentName: departement?.name,
        addressRegion: departement?.region,
        isRUP: Boolean(data.association.rup?.[0]?.value),
        createdAt: data.association.date_creation_rna?.[0] ? new Date(data.association.date_creation_rna[0].value) : undefined,
        updatedAt: data.association.date_modification_rna?.[0] ? new Date(data.association.date_modification_rna[0].value) : undefined,
        object: data.association.objet_social?.[0]?.value,
        source: "DATA_SUBVENTION",
      };

      const existing = await findExistingByIdentifiers(siret, siren);
      if (existing) {
        return mergeOrganizationData(existing, payload);
      }

      return organizationService.createOrganization(payload);
    } else {
      console.log(`[Organization-RNA] No valid RNA data found for rna ${rna}`);
    }
  } catch (error: any) {
    captureException(error, `[Organization] Failure during rna enrichment`);
    return null;
  }
};

const findBySiret = async (siret: string) => {
  try {
    const response = await organizationService.findOneOrganizationBySiret(siret);
    if (response) {
      return response;
    }

    const data = await apiDatasubvention.get(`/etablissement/${siret}`);

    if (data && data.etablissement) {
      const departement = data.etablissement.adresse[0]?.value?.code_postal ? getDepartement(data.etablissement.adresse[0]?.value?.code_postal) : null;

      const payload: OrganizationCreateInput = {
        siret,
        sirets: [siret],
        siren: siret.slice(0, 9),
        title: siret,
        addressNumber: data.etablissement.adresse[0]?.value?.numero,
        addressType: data.etablissement.adresse[0]?.value?.type_voie,
        addressStreet: data.etablissement.adresse[0]?.value?.voie,
        addressCity: data.etablissement.adresse[0]?.value?.commune,
        addressPostalCode: data.etablissement.adresse[0]?.value?.code_postal,
        addressDepartmentCode: departement?.code,
        addressDepartmentName: departement?.name,
        addressRegion: departement?.region,
        source: "DATA_SUBVENTION",
      };

      const asso = await apiDatasubvention.get(`/association/${siret}`);
      if (asso && asso.association) {
        payload.rna = asso.association.rna?.[0]?.value;
        payload.title = asso.association.denomination_rna?.[0]?.value || asso.association.denomination_siren?.[0]?.value || payload.title || payload.rna || siret;
      }

      if (payload.rna) {
        const existingByRna = await organizationService.findOneOrganizationByRna(payload.rna);
        if (existingByRna) {
          return mergeOrganizationData(existingByRna, payload);
        }
      }

      const existing = await findExistingByIdentifiers(siret, payload.siren);
      if (existing) {
        return mergeOrganizationData(existing, payload);
      }

      if (payload.title) {
        return organizationService.createOrganization(payload);
      }
      return null;
    }
  } catch (error: any) {
    captureException(error, `[Organization] Failure during siret enrichment`);
    return null;
  }
};

const findByName = async (name: string) => {
  return organizationService.findOneOrganizationByName(name);
};
