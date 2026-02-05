import { captureException } from "../../../error";
import type { PublisherRecord } from "../../../types/publisher";
import { isValidSiren, isValidSiret } from "../../../utils/organization";
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

export const parseOrganization = (publisher: PublisherRecord, missionXML: MissionXML): ImportedOrganization | null => {
  try {
    const organizationLogo = parseString(missionXML.organizationLogo);
    const { siret, siren } = parseSiren(missionXML.organizationSiren);
    const organization = {
      publisherId: publisher.id,
      organizationClientId: parseString(missionXML.organizationClientId) || parseString(missionXML.organizationId),
      name: parseString(missionXML.organizationName),
      rna: normalizeRNA(parseString(missionXML.organizationRNA) || parseString(missionXML.organizationRna)),
      rnaVerified: null,
      siren: siren,
      sirenVerified: null,
      siret: siret,
      siretVerified: null,
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

    return organization;
  } catch (error) {
    captureException(error, { extra: { missionXML } });
  }
  return null;
};
