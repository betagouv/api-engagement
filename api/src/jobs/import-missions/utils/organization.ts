import { PUBLISHER_IDS } from "../../../config";
import { captureException } from "../../../error";
import type { PublisherRecord } from "../../../types/publisher";
import { isValidSiren, isValidSiret } from "../../../utils/organization";
import { slugify } from "../../../utils/string";
import { ImportedOrganization, MissionXML } from "../types";

const parseString = (value: string | undefined) => {
  if (!value) {
    return "";
  }
  return String(value);
};

const parseStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    const normalized = value.map((v) => String(v ?? "").trim()).filter((v) => v.length > 0);
    return normalized.length ? normalized : undefined;
  }

  if (typeof value === "object") {
    const obj = value as any;
    if ("value" in obj) {
      return parseStringArray(obj.value);
    }
    if ("item" in obj) {
      return parseStringArray(obj.item);
    }
    return undefined;
  }

  const str = String(value).trim();
  if (!str) {
    return undefined;
  }
  const split = str
    .split(",")
    .map((i) => i.trim())
    .filter((i) => i.length > 0);
  return split.length ? split : undefined;
};

const parseSiren = (value: string | undefined) => {
  const parsed = parseString(value);
  if (!parsed) {
    return { siret: null, siren: null };
  }
  if (isValidSiret(parsed)) {
    return { siret: parsed, siren: parsed.slice(0, 9) };
  }
  if (isValidSiren(parsed)) {
    return { siren: parsed, siret: null };
  }
  return { siret: null, siren: null };
};

const normalizeRNA = (value?: string | null) => (value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

export const parseOrganizationClientId = (missionXML: MissionXML) => {
  // Before organizationClientId the id was asked into organizationId field, which has been changed
  if (missionXML.organizationClientId || missionXML.organizationId) {
    return parseString(missionXML.organizationClientId) || parseString(missionXML.organizationId);
  }
  if (missionXML.organizationRNA || missionXML.organizationRna) {
    return normalizeRNA(parseString(missionXML.organizationRNA) || parseString(missionXML.organizationRna));
  }
  const { siret, siren } = parseSiren(missionXML.organizationSiren);
  if (siret || siren) {
    return siret || siren;
  }
  if (missionXML.organizationName) {
    return slugify(missionXML.organizationName);
  }
  return null;
};

export const parseOrganization = (publisher: PublisherRecord, missionXML: MissionXML): ImportedOrganization | null => {
  try {
    const organizationClientId = parseOrganizationClientId(missionXML);
    if (!organizationClientId) {
      return null;
    }
    const organizationLogo = parseString(missionXML.organizationLogo);
    const { siret, siren } = parseSiren(missionXML.organizationSiren);
    const organization = {
      publisherId: publisher.id,
      clientId: organizationClientId,
      name: parseString(missionXML.organizationName),
      rna: normalizeRNA(parseString(missionXML.organizationRNA) || parseString(missionXML.organizationRna)),
      siren: siren,
      siret: siret,
      url: parseString(missionXML.organizationUrl),
      logo: organizationLogo || publisher.defaultMissionLogo,
      description: parseString(missionXML.organizationDescription),
      legalStatus: parseString(missionXML.organizationStatusJuridique),
      type: parseString(missionXML.organizationType),
      actions: parseStringArray(missionXML.keyActions) || [],
      fullAddress: parseString(missionXML.organizationFullAddress),
      postalCode: parseString(missionXML.organizationPostCode),
      city: parseString(missionXML.organizationCity),
      beneficiaries:
        parseStringArray(missionXML.organizationBeneficiaries) ||
        parseStringArray(missionXML.organizationBeneficiaires) ||
        parseStringArray(missionXML.publicBeneficiaries) ||
        parseStringArray(missionXML.publicsBeneficiaires) ||
        [],
      parentOrganizations: parseStringArray(missionXML.organizationReseaux) || [],
      verifiedAt: null,
      organizationIdVerified: null,
    } as ImportedOrganization;

    if (publisher.id === PUBLISHER_IDS.SERVICE_CIVIQUE) {
      if (missionXML.parentOrganizationName) {
        organization.parentOrganizations = Array.isArray(missionXML.parentOrganizationName) ? missionXML.parentOrganizationName : [missionXML.parentOrganizationName];
      } else {
        organization.parentOrganizations = [missionXML.organizationName];
      }
    }

    return organization;
  } catch (error) {
    captureException(error, { extra: { missionXML } });
  }
  return null;
};
