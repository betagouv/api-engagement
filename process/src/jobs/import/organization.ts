import { HydratedDocument } from "mongoose";

import apiDatasubvention from "../../services/api-datasubvention";
import { DEPARTMENTS } from "../../constants/departments";
import { captureException } from "../../error";
import { Mission, Organization, OrganizationNameMatch } from "../../types";
import OrganizationModel from "../../models/organization";
import OrganizationNameMatchModel from "../../models/organization-name-matches";
import { slugify } from "../../utils";

const isValidRNA = (rna: string) => {
  return rna && rna.length === 10 && rna.startsWith("W") && rna.match(/^[W0-9]+$/);
};

const isValidSiret = (siret: string) => {
  return siret && siret.length === 14 && siret.match(/^[0-9]+$/);
};

export const verifyOrganization = async (missions: Mission[]) => {
  const result = [] as Mission[];
  if (!missions.length) return result;

  try {
    const organizationsRNAs = [] as string[];
    const organizationsSirets = [] as string[];
    const organizationsNames = [] as string[];

    missions.forEach((mission) => {
      // remove all non alphanumeric characters and convert to uppercase
      const rna = (mission.organizationRNA || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (rna && isValidRNA(rna)) {
        if (organizationsRNAs.includes(rna)) return;
        organizationsRNAs.push(rna);
      } else if (rna && isValidSiret(rna)) {
        // Made for Service Civique
        if (organizationsSirets.includes(rna)) return;
        organizationsSirets.push(rna);
      } else if (mission.organizationName) {
        if (organizationsNames.includes(mission.organizationName)) return;
        organizationsNames.push(mission.organizationName);
      }
    });

    console.log(
      `[Organization] Enriching with RNA ${missions.length} missions, with ${organizationsRNAs.length} valid RNA and ${organizationsSirets.length} valid sirets and ${organizationsNames.length} names...`,
    );
    const resRna = organizationsRNAs.length !== 0 ? await findByRNA(organizationsRNAs) : {};
    const resSiret = organizationsSirets.length !== 0 ? await findBySiret(organizationsSirets) : {};
    const resNames = organizationsNames.length !== 0 ? await findByName(organizationsNames) : { exact: {}, approximate: {} };

    console.log(
      `[Organization] RNA Found for ${Object.keys(resRna).length} RNA, ${Object.keys(resSiret).length} sirets and ${Object.keys(resNames.exact).length} names and ${Object.keys(resNames.approximate).length} approximate names`,
    );
    const updates = [] as Mission[];

    for (const mission of missions) {
      const rna = (mission.organizationRNA || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const obj = { clientId: mission.clientId } as Mission;

      if (rna && isValidRNA(rna)) {
        const data = resRna[rna];
        if (data) {
          obj.organizationId = data._id.toString();
          obj.organizationNameVerified = data.rna;
          obj.organizationSirenVerified = data.siren;
          obj.organizationSiretVerified = data.siret;
          obj.organizationAddressVerified = `${data.addressNumber || ""} ${data.addressRepetition || ""} ${data.addressType || ""} ${data.addressStreet || ""}`
            .replaceAll(/\s+/g, " ")
            .trim();
          obj.organizationCityVerified = data.addressCity;
          obj.organizationPostalCodeVerified = data.addressPostalCode;
          obj.organizationDepartmentCodeVerified = data.addressDepartmentCode;
          obj.organizationDepartmentNameVerified = data.addressDepartmentName;
          obj.organizationRegionVerified = data.addressRegion;
          // obj.organisationIsRUP = data.isRUP;
          obj.organizationVerificationStatus = data.source === "DATA_SUBVENTION" ? "RNA_MATCHED_WITH_DATA_SUBVENTION" : "RNA_MATCHED_WITH_DATA_DB";
        } else {
          obj.organizationVerificationStatus = "RNA_NOT_MATCHED";
        }
      } else if (rna && isValidSiret(rna)) {
        const data = resSiret[rna];
        if (data) {
          obj.organizationId = data._id.toString();
          obj.organizationNameVerified = data.title;
          obj.organizationRNAVerified = data.rna;
          obj.organizationSirenVerified = data.siren;
          obj.organizationSiretVerified = data.siret;
          obj.organizationAddressVerified = `${data.addressNumber || ""} ${data.addressRepetition || ""} ${data.addressType || ""} ${data.addressStreet || ""}`
            .replaceAll(/\s+/g, " ")
            .trim();
          obj.organizationCityVerified = data.addressCity;
          obj.organizationPostalCodeVerified = data.addressPostalCode;
          obj.organizationDepartmentCodeVerified = data.addressDepartmentCode;
          obj.organizationDepartmentNameVerified = data.addressDepartmentName;
          obj.organizationRegionVerified = data.addressRegion;
          // obj.organisationIsRUP = data.isRUP;
          obj.organizationVerificationStatus = data.source === "DATA_SUBVENTION" ? "SIRET_MATCHED_WITH_DATA_SUBVENTION" : "SIRET_MATCHED_WITH_DATA_DB";
        } else {
          obj.organizationVerificationStatus = "SIRET_NOT_MATCHED";
        }
      } else if (mission.organizationName) {
        if (resNames.exact[mission.organizationName]) {
          const data = resNames.exact[mission.organizationName];
          obj.organizationId = data._id.toString();
          obj.organizationNameVerified = data.title;
          obj.organizationRNAVerified = data.rna;
          obj.organizationSirenVerified = data.siren;
          obj.organizationSiretVerified = data.siret;
          obj.organizationAddressVerified = `${data.addressNumber || ""} ${data.addressRepetition || ""} ${data.addressType || ""} ${data.addressStreet || ""}`
            .replaceAll(/\s+/g, " ")
            .trim();
          obj.organizationCityVerified = data.addressCity;
          obj.organizationPostalCodeVerified = data.addressPostalCode;
          obj.organizationDepartmentCodeVerified = data.addressDepartmentCode;
          obj.organizationDepartmentNameVerified = data.addressDepartmentName;
          obj.organizationRegionVerified = data.addressRegion;
          // obj.organisationIsRUP = data.isRUP;
          obj.organizationVerificationStatus = "NAME_EXACT_MATCHED_WITH_DB";
        } else if (resNames.approximate[mission.organizationName]) {
          obj.organizationVerificationStatus = "NAME_APPROXIMATE_MATCHED_WITH_DB";
          const match = resNames.approximate[mission.organizationName];
          match.missionIds = [...new Set([...match.missionIds, mission._id.toString()])];
          await match.save();
        } else {
          obj.organizationVerificationStatus = "NAME_NOT_MATCHED";
        }
      } else {
        obj.organizationVerificationStatus = "NO_DATA";
      }

      updates.push(obj);
    }

    return updates;
  } catch (error) {
    captureException(error, `[Organization] Failure during rna enrichment`);
    return missions.map((m) => ({ clientId: m.clientId, organizationVerificationStatus: "FAILED" })) as Mission[];
  }
};

const findByRNA = async (rnas: string[]) => {
  const response = await OrganizationModel.find({ rna: { $in: rnas } });
  console.log(`[Organization] Found ${response.length} rnas matching in database`);

  const rnasToFetch = rnas.filter((rna) => !response.find((r) => r.rna === rna));
  console.log(`[Organization] Fetching ${rnasToFetch.length} rnas from datasubvention`);
  for (const rna of rnasToFetch) {
    const data = await apiDatasubvention.get(`/association/${rna}`);
    if (data && data.association && data.association.rna && data.association.rna.value && data.association.denomination_rna && data.association.denomination_rna.value) {
      const departement = data.association.adresse_siege_rna ? getDepartement(data.association.adresse_siege_rna.value?.code_postal) : null;
      const obj = {
        rna: data.association.rna.value,
        title: data.association.denomination_rna.value,
        siren: data.association.siren?.value || data.association.siret?.value?.slice(0, 9),
        siret: data.association.siret?.value,
        addressNumber: data.association.adresse_siege_rna?.value?.numero,
        addressType: data.association.adresse_siege_rna?.value?.type_voie,
        addressStreet: data.association.adresse_siege_rna?.value?.voie,
        addressCity: data.association.adresse_siege_rna?.value?.commune,
        addressPostalCode: data.association.adresse_siege_rna?.value?.code_postal,
        addressDepartmentCode: departement?.code,
        addressDepartmentName: departement?.name,
        addressRegion: departement?.region,
        createdAt: data.association.date_creation_rna ? new Date(data.association.date_creation_rna.value) : undefined,
        updatedAt: data.association.date_creation_rna ? new Date(data.association.date_modification_rna.value) : undefined,
        object: data.association.objet_social.value,
        source: "DATA_SUBVENTION",
      } as Organization;

      const newRna = await OrganizationModel.create(obj);
      response.push(newRna);
    }
  }

  const res = {} as { [key: string]: Organization };
  response.forEach((item) => {
    res[item.rna] = item;
  });

  return res;
};

const findBySiret = async (sirets: string[]) => {
  const response = await OrganizationModel.find({ siret: { $in: sirets } });
  console.log(`[Organization] Found ${response.length} sirets matching in database`);

  const siretsToFetch = sirets.filter((siret) => !response.find((r) => r.siret === siret));
  console.log(`[Organization] Fetching ${siretsToFetch.length} sirets from datasubvention`);
  for (const siret of siretsToFetch) {
    const data = await apiDatasubvention.get(`/association/${siret}`);
    if (data && data.association && data.association.rna && data.association.rna.value && data.association.denomination_rna && data.association.denomination_rna.value) {
      const departement = data.association.adresse_siege_rna ? getDepartement(data.association.adresse_siege_rna.value?.code_postal) : null;
      const obj = {
        rna: data.association.rna.value,
        title: data.association.denomination_rna.value,
        siret: data.association.siret?.value,
        siren: data.association.siren?.value || data.association.siret?.value?.slice(0, 9),
        addressNumber: data.association.adresse_siege_rna?.value?.numero,
        addressType: data.association.adresse_siege_rna?.value?.type_voie,
        addressStreet: data.association.adresse_siege_rna?.value?.voie,
        addressCity: data.association.adresse_siege_rna?.value?.commune,
        addressPostalCode: data.association.adresse_siege_rna?.value?.code_postal,
        addressDepartmentCode: departement?.code,
        addressDepartmentName: departement?.name,
        addressRegion: departement?.region,
        createdAt: data.association.date_creation_rna ? new Date(data.association.date_creation_rna.value) : undefined,
        updatedAt: data.association.date_creation_rna ? new Date(data.association.date_modification_rna.value) : undefined,
        object: data.association.objet_social.value,
        source: "DATA_SUBVENTION",
      } as Organization;

      const newRna = await OrganizationModel.create(obj);
      response.push(newRna);
    }
  }
  const res = {} as { [key: string]: Organization };
  response.forEach((item) => {
    res[item.rna] = item;
  });

  return res;
};

const findByName = async (names: string[]) => {
  const res = {
    exact: {} as { [key: string]: Organization },
    approximate: {} as { [key: string]: HydratedDocument<OrganizationNameMatch> },
  };

  console.log(`[Organization] Fetching ${names.length} names with approximate match`);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (i % 50 === 0) console.log(`[Organization] Fetching ${i + 1} / ${names.length} names`);

    const exactMatch = await OrganizationModel.find({ titleSlug: slugify(name) });
    if (exactMatch.length === 1) {
      res.exact[name] = exactMatch[0];
      continue;
    }

    // Try approximate match using case-insensitive regex
    const approximateMatch = await OrganizationModel.find({
      title: {
        $regex: `^${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (approximateMatch.length > 0) {
      const match = await OrganizationNameMatchModel.findOne({ name });
      if (match) {
        match.organizationIds = [...new Set([...match.organizationIds, ...approximateMatch.map((m) => m._id.toString())])];
        match.organizationNames = [...new Set([...match.organizationNames, name])];
        await match.save();
        res.approximate[name] = match;
      } else {
        const newMatch = await OrganizationNameMatchModel.create({ name, organizationIds: approximateMatch.map((m) => m._id.toString()), organizationNames: [name] });
        res.approximate[name] = newMatch;
      }
      continue;
    }
  }
  console.log(`[Organization] Found ${Object.keys(res.exact).length} exact matches and ${Object.keys(res.approximate).length} approximate matches`);

  return res;
};

const getDepartement = (postalCode: string) => {
  if (!postalCode) return null;
  const code = postalCode.slice(0, 2);
  if (!code || !DEPARTMENTS[code]) return null;
  return { code, name: DEPARTMENTS[code][0], region: DEPARTMENTS[code][1] };
};
