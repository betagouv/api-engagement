import { DEPARTMENTS } from "../../../constants/departments";
import { captureException } from "../../../error";
import apiDatasubvention from "../../../services/api-datasubvention";
import { organizationService } from "../../../services/organization";
import publisherOrganizationService from "../../../services/publisher-organization";
import { OrganizationCreateInput, OrganizationRecord, OrganizationUpdatePatch } from "../../../types/organization";
import { PublisherOrganizationUpdateInput } from "../../../types/publisher-organization";

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

export const updatePublisherOrganization = async (id: string, organization: OrganizationRecord | null, status: string) => {
  const updates: PublisherOrganizationUpdateInput = {
    verifiedAt: new Date(),
    verificationStatus: status,
  };
  if (organization) {
    updates.rnaVerified = organization.rna || undefined;
    updates.sirenVerified = organization.siren || undefined;
    updates.siretVerified = organization.siret || undefined;
    updates.organizationIdVerified = organization.id;
  }

  return publisherOrganizationService.update(id, updates);
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

export const findByRNA = async (rna: string) => {
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
    }
  } catch (error: any) {
    captureException(error, { extra: { rna } });
    return null;
  }
};

export const findBySiret = async (siret: string) => {
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

export const findByName = async (name: string) => {
  return organizationService.findOneOrganizationByName(name);
};
