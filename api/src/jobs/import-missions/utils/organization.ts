import { DEPARTMENTS } from "../../../constants/departments";
import { captureException } from "../../../error";
import OrganizationModel from "../../../models/organization";
import apiDatasubvention from "../../../services/api-datasubvention";
import { Mission, Organization } from "../../../types";
import { slugify } from "../../../utils";

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

export const isValidRNA = (rna: string): boolean => {
  return !!rna && rna.length === 10 && rna.startsWith("W") && !!rna.match(/^[W0-9]+$/);
};

export const isValidSiret = (siret: string): boolean => {
  return !!siret && siret.length === 14 && !!siret.match(/^[0-9]+$/);
};

export const isVerified = (mission: Partial<Mission>): boolean => {
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

export const verifyOrganization = async (missions: Mission[]) => {
  console.log(`[Organization] Starting organization verification for ${missions.length} missions`);

  const result = [] as Mission[];
  if (!missions.length) {
    return result;
  }

  try {
    const foundRNAs: Record<string, Organization | "not_found"> = {};
    const foundSirets: Record<string, Organization | "not_found"> = {};
    const foundNames: Record<string, Organization | "not_found"> = {};

    let alreadyVerified = 0;
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

      // remove all non alphanumeric characters and convert to uppercase
      const identifier = (mission.organizationRNA || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (identifier && isValidRNA(identifier)) {
        if (foundRNAs[identifier] === "not_found") {
          mission.organizationVerificationStatus = ORGANIZATION_VERIFICATION_STATUS.RNA_NOT_MATCHED;
          rnaNotFound++;
          continue;
        }
        if (foundRNAs[identifier] !== "not_found" && foundRNAs[identifier]) {
          updateMissionOrganization(mission, foundRNAs[identifier] as Organization, ORGANIZATION_VERIFICATION_STATUS.RNA_MATCHED_WITH_DATA_DB);
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
        if (foundSirets[identifier] === "not_found") {
          mission.organizationVerificationStatus = ORGANIZATION_VERIFICATION_STATUS.SIRET_NOT_MATCHED;
          siretNotFound++;
          continue;
        }
        if (foundSirets[identifier] !== "not_found" && foundSirets[identifier]) {
          updateMissionOrganization(mission, foundSirets[identifier] as Organization, ORGANIZATION_VERIFICATION_STATUS.SIRET_MATCHED_WITH_DATA_DB);
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
        if (foundNames[name] === "not_found") {
          mission.organizationVerificationStatus = ORGANIZATION_VERIFICATION_STATUS.NAME_NOT_MATCHED;
          nameNotFound++;
          continue;
        }
        if (foundNames[name] !== "not_found" && foundNames[name]) {
          updateMissionOrganization(mission, foundNames[name] as Organization, ORGANIZATION_VERIFICATION_STATUS.NAME_EXACT_MATCHED_WITH_DB);
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

    console.log(`[Organization] Already verified ${alreadyVerified} missions`);
    console.log(`[Organization] Found ${rnaFound} RNAs, ${rnaNotFound} RNAs not found`);
    console.log(`[Organization] Found ${siretFound} SIRETs, ${siretNotFound} SIRETs not found`);
    console.log(`[Organization] Found ${nameFound} names, ${nameNotFound} names not found`);
    console.log(`[Organization] ${noData} missions with no data`);
  } catch (error) {
    captureException(error, `[Organization] Failure during rna enrichment`);
  }
};

const updateMissionOrganization = async (mission: Mission, organization: Organization, status: string) => {
  mission.organizationId = organization._id.toString();
  mission.organizationNameVerified = organization.title;
  mission.organizationRNAVerified = organization.rna;
  mission.organizationSirenVerified = organization.siren;
  mission.organizationSiretVerified = organization.siret;
  mission.organizationAddressVerified =
    `${organization.addressNumber || ""} ${organization.addressRepetition || ""} ${organization.addressType || ""} ${organization.addressStreet || ""}`
      .replaceAll(/\s+/g, " ")
      .trim();
  mission.organizationCityVerified = organization.addressCity;
  mission.organizationPostalCodeVerified = organization.addressPostalCode;
  mission.organizationDepartmentCodeVerified = organization.addressDepartmentCode;
  mission.organizationDepartmentNameVerified = organization.addressDepartmentName;
  mission.organizationRegionVerified = organization.addressRegion;
  mission.organisationIsRUP = organization.isRUP;
  mission.organizationVerificationStatus = status;
};

const findByRNA = async (rna: string) => {
  try {
    const response = await OrganizationModel.findOne({ rna });
    if (response) {
      return response;
    }

    const data = await apiDatasubvention.get(`/association/${rna}`);

    if (data && data.association) {
      const departement = data.association.adresse_siege_rna ? getDepartement(data.association.adresse_siege_rna[0]?.value?.code_postal) : null;
      const siret = Array.isArray(data.association.etablisements_siret) ? data.association.etablisements_siret[0]?.value[0] : data.association.etablisements_siret?.value;
      const siren = data.association.siren?.[0]?.value || siret?.slice(0, 9);
      const obj = {
        rna,
        title: data.association.denomination_rna?.[0]?.value,
        siren,
        siret,
        sirets: siret ? [siret] : [],
        addressNumber: data.association.adresse_siege_rna?.[0]?.value?.numero,
        addressType: data.association.adresse_siege_rna?.[0]?.value?.type_voie,
        addressStreet: data.association.adresse_siege_rna?.[0]?.value?.voie,
        addressCity: data.association.adresse_siege_rna?.[0]?.value?.commune,
        addressPostalCode: data.association.adresse_siege_rna?.[0]?.value?.code_postal,
        addressDepartmentCode: departement?.code,
        addressDepartmentName: departement?.name,
        addressRegion: departement?.region,
        isRUP: data.association.rup?.[0]?.value,
        createdAt: data.association.date_creation_rna?.[0] ? new Date(data.association.date_creation_rna[0].value) : undefined,
        updatedAt: data.association.date_modification_rna?.[0] ? new Date(data.association.date_modification_rna[0].value) : undefined,
        object: data.association.objet_social?.[0]?.value,
        source: "DATA_SUBVENTION",
      } as Organization;

      const $or = [] as any[];
      if (siret) {
        $or.push({ sirets: siret });
      }
      if (siren) {
        $or.push({ siren });
      }
      const existing = $or.length > 0 ? await OrganizationModel.findOne({ $or }) : null;
      if (existing) {
        const updates = {} as Organization;

        if (!existing.siren) {
          updates.siren = obj.siren;
        }
        if (!existing.sirets || !existing.sirets.includes(siret)) {
          updates.sirets = [...(existing.sirets || []), siret];
        }
        if (!existing.title) {
          updates.title = obj.title;
        }
        if (!existing.addressNumber) {
          updates.addressNumber = obj.addressNumber;
        }
        if (!existing.addressType) {
          updates.addressType = obj.addressType;
        }
        if (!existing.addressStreet) {
          updates.addressStreet = obj.addressStreet;
        }
        if (!existing.addressCity) {
          updates.addressCity = obj.addressCity;
        }
        if (!existing.addressPostalCode) {
          updates.addressPostalCode = obj.addressPostalCode;
        }
        if (!existing.addressDepartmentCode) {
          updates.addressDepartmentCode = obj.addressDepartmentCode;
        }
        if (!existing.addressDepartmentName) {
          updates.addressDepartmentName = obj.addressDepartmentName;
        }
        if (!existing.addressRegion) {
          updates.addressRegion = obj.addressRegion;
        }
        if (!existing.isRUP) {
          updates.isRUP = obj.isRUP;
        }
        if (!existing.object) {
          updates.object = obj.object;
        }

        if (Object.keys(updates).length > 0) {
          existing.set(updates);
          await existing.save();
        }
        return existing;
      } else {
        const newRna = await OrganizationModel.create(obj);
        return newRna;
      }
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
    const response = await OrganizationModel.findOne({ sirets: siret });
    if (response) {
      return response;
    }

    const data = await apiDatasubvention.get(`/etablissement/${siret}`);

    if (data && data.etablissement) {
      const departement = data.etablissement.adresse[0]?.value?.code_postal ? getDepartement(data.etablissement.adresse[0]?.value?.code_postal) : null;

      const obj = {
        siret,
        sirets: [siret],
        siren: siret.slice(0, 9),
        addressNumber: data.etablissement.adresse[0]?.value?.numero,
        addressType: data.etablissement.adresse[0]?.value?.type_voie,
        addressStreet: data.etablissement.adresse[0]?.value?.voie,
        addressCity: data.etablissement.adresse[0]?.value?.commune,
        addressPostalCode: data.etablissement.adresse[0]?.value?.code_postal,
        addressDepartmentCode: departement?.code,
        addressDepartmentName: departement?.name,
        addressRegion: departement?.region,
        source: "DATA_SUBVENTION",
      } as Organization;

      const asso = await apiDatasubvention.get(`/association/${siret}`);
      if (asso.association) {
        obj.rna = asso.association.rna?.[0]?.value;
        obj.title = asso.association.denomination_rna?.[0]?.value || asso.association.denomination_siren?.[0]?.value;
      }

      const existing = obj.rna ? await OrganizationModel.findOne({ rna: obj.rna }) : null;
      if (existing) {
        const updates = {} as Organization;

        if (!existing.siren) {
          updates.siren = obj.siren;
        }
        if (!existing.sirets || !existing.sirets.includes(siret)) {
          updates.sirets = [...(existing.sirets || []), siret];
        }
        if (!existing.title) {
          updates.title = obj.title;
        }
        if (!existing.addressNumber) {
          updates.addressNumber = obj.addressNumber;
        }
        if (!existing.addressType) {
          updates.addressType = obj.addressType;
        }
        if (!existing.addressStreet) {
          updates.addressStreet = obj.addressStreet;
        }
        if (!existing.addressCity) {
          updates.addressCity = obj.addressCity;
        }
        if (!existing.addressPostalCode) {
          updates.addressPostalCode = obj.addressPostalCode;
        }
        if (!existing.addressDepartmentCode) {
          updates.addressDepartmentCode = obj.addressDepartmentCode;
        }
        if (!existing.addressDepartmentName) {
          updates.addressDepartmentName = obj.addressDepartmentName;
        }
        if (!existing.addressRegion) {
          updates.addressRegion = obj.addressRegion;
        }

        if (Object.keys(updates).length > 0) {
          existing.set(updates);
          await existing.save();
        }
        return existing;
      } else {
        const newRNA = await OrganizationModel.create(obj);
        return newRNA;
      }
    }
  } catch (error: any) {
    captureException(error, `[Organization] Failure during siret enrichment`);
    return null;
  }
};

const findByName = async (name: string) => {
  const exactMatch = await OrganizationModel.find({ titleSlug: slugify(name) });
  if (exactMatch.length === 1) {
    return exactMatch[0];
  }

  return null;
};
