import { DEPARTMENTS } from "@/constants/departments";
import { captureException } from "@/error";
import apiDatasubvention from "@/services/api-datasubvention";
import { organizationService } from "@/services/organization";
import publisherOrganizationService from "@/services/publisher-organization";
import { OrganizationCreateInput, OrganizationRecord, OrganizationUpdatePatch } from "@/types/organization";
import { PublisherOrganizationUpdateInput } from "@/types/publisher-organization";
import { isBlank } from "@/utils";

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
    updates.organizationIdVerified = organization.id;
  }

  return publisherOrganizationService.update(id, updates);
};

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

    const result = await apiDatasubvention.get(`/association/${rna}`);

    if (result.ok && result.association) {
      const departement = result.association.adresse_siege_rna ? getDepartement(result.association.adresse_siege_rna[0]?.value?.code_postal) : null;
      const siret = Array.isArray(result.association.etablisements_siret) ? result.association.etablisements_siret[0]?.value[0] : result.association.etablisements_siret?.value;
      const siren = result.association.siren?.[0]?.value || siret?.slice(0, 9);
      const title = result.association.denomination_rna?.[0]?.value || result.association.denomination_siren?.[0]?.value || result.association.objet_social?.[0]?.value || rna;
      const payload: OrganizationCreateInput = {
        rna,
        title,
        siren,
        siret,
        sirets: siret ? [siret] : undefined,
        addressNumber: result.association.adresse_siege_rna?.[0]?.value?.numero,
        addressType: result.association.adresse_siege_rna?.[0]?.value?.type_voie,
        addressStreet: result.association.adresse_siege_rna?.[0]?.value?.voie,
        addressCity: result.association.adresse_siege_rna?.[0]?.value?.commune,
        addressPostalCode: result.association.adresse_siege_rna?.[0]?.value?.code_postal,
        addressDepartmentCode: departement?.code,
        addressDepartmentName: departement?.name,
        addressRegion: departement?.region,
        isRUP: Boolean(result.association.rup?.[0]?.value),
        createdAt: result.association.date_creation_rna?.[0] ? new Date(result.association.date_creation_rna[0].value) : undefined,
        updatedAt: result.association.date_modification_rna?.[0] ? new Date(result.association.date_modification_rna[0].value) : undefined,
        object: result.association.objet_social?.[0]?.value,
        source: "DATA_SUBVENTION",
      };

      const existing = await findExistingByIdentifiers(siret, siren);
      if (existing) {
        return mergeOrganizationData(existing, payload);
      }

      return organizationService.createOrganization(payload);
    } else if (!result.ok) {
      console.error("[DataSubvention] Failed to fetch rna", result.message);
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

    const result = await apiDatasubvention.get(`/etablissement/${siret}`);

    if (result.ok && result.etablissement) {
      const departement = result.etablissement.adresse[0]?.value?.code_postal ? getDepartement(result.etablissement.adresse[0]?.value?.code_postal) : null;

      const payload: OrganizationCreateInput = {
        siret,
        sirets: [siret],
        siren: siret.slice(0, 9),
        title: siret,
        addressNumber: result.etablissement.adresse[0]?.value?.numero,
        addressType: result.etablissement.adresse[0]?.value?.type_voie,
        addressStreet: result.etablissement.adresse[0]?.value?.voie,
        addressCity: result.etablissement.adresse[0]?.value?.commune,
        addressPostalCode: result.etablissement.adresse[0]?.value?.code_postal,
        addressDepartmentCode: departement?.code,
        addressDepartmentName: departement?.name,
        addressRegion: departement?.region,
        source: "DATA_SUBVENTION",
      };

      const asso = await apiDatasubvention.get(`/association/${siret}`);
      if (asso.ok && asso.association) {
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
    } else if (!result.ok) {
      console.error("[DataSubvention] Failed to fetch siret", result.message);
    }
  } catch (error: any) {
    captureException(error, `[Organization] Failure during siret enrichment`);
    return null;
  }
};

export const findByName = async (name: string) => {
  return organizationService.findOneOrganizationByName(name);
};
