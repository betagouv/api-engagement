import { PUBLISHER_IDS } from "../../../config";
import { captureException } from "../../../error";
import type { PublisherRecord } from "../../../types/publisher";
import { normalizeRNA, parseSiren, parseString, parseStringArray } from "../../../utils";
import { slugify } from "../../../utils/string";
import { ImportedOrganization, MissionXML } from "../types";

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
      rna: normalizeRNA(missionXML.organizationRNA || missionXML.organizationRna),
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
