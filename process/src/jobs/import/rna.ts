import apiDatasubvention from "../../services/api-datasubvention";

import { DEPARTMENTS } from "../../constants/departments";
import { captureException } from "../../error";
import { Mission, Publisher, RNA } from "../../types";
import RnaModel from "../../models/rna";

const isValidRNA = (rna: string) => {
  return rna && rna.length === 10 && rna.startsWith("W") && rna.match(/^[W0-9]+$/);
};

const isValidSiret = (siret: string) => {
  return siret && siret.length === 14 && siret.match(/^[0-9]+$/);
};

export interface AssociationResult {
  clientId: string;
  associationId: string | undefined;
  associationRNA: string | undefined;
  associationSiren: string | undefined;
  associationSiret: string | undefined;
  associationName: string | undefined;
  associationAddress: string | undefined;
  associationCity: string | undefined;
  associationPostalCode: string | undefined;
  associationDepartmentCode: string | undefined;
  associationDepartmentName: string | undefined;
  associationRegion: string | undefined;
  organizationVerificationStatus: string | undefined;
}

export const enrichWithRNA = async (publisher: Publisher, missions: Mission[]) => {
  const result = [] as AssociationResult[];
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
      `[${publisher.name}] Enriching with RNA ${missions.length} missions, with ${organizationsRNAs.length} valid RNA and ${organizationsSirets.length} valid sirets and ${organizationsNames.length} names...`,
    );
    const resRna = organizationsRNAs.length !== 0 ? await findByRNA(organizationsRNAs) : {};
    const resSiret = organizationsSirets.length !== 0 ? await findBySiret(organizationsSirets) : {};
    const resNames = organizationsNames.length !== 0 ? await findByName(organizationsNames) : { exact: {}, approximate: {} };

    console.log(
      `[${publisher.name}] RNA Found for ${Object.keys(resRna).length} RNA, ${Object.keys(resSiret).length} sirets and ${Object.keys(resNames.exact).length} names and ${Object.keys(resNames.approximate).length} approximate names`,
    );
    const updates = [] as AssociationResult[];

    missions.forEach((mission) => {
      const rna = (mission.organizationRNA || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const obj = { clientId: mission.clientId } as AssociationResult;

      if (rna && isValidRNA(rna)) {
        const data = resRna[rna];
        if (data) {
          obj.associationId = data._id.toString();
          obj.associationRNA = data.rna;
          obj.associationSiren = data.siren;
          obj.associationSiret = data.siret;
          obj.associationName = data.title;
          obj.associationAddress = `${data.addressNumber || ""} ${data.addressRepetition || ""} ${data.addressType || ""} ${data.addressStreet || ""}`
            .replaceAll(/\s+/g, " ")
            .trim();
          obj.associationCity = data.addressCity;
          obj.associationPostalCode = data.addressPostalCode;
          obj.associationDepartmentCode = data.addressDepartmentCode;
          obj.associationDepartmentName = data.addressDepartmentName;
          obj.associationRegion = data.addressRegion;
          obj.organizationVerificationStatus = data.source === "RNA_DB" ? "RNA_MATCHED_WITH_DB" : "RNA_MATCHED_WITH_DATA_SUBVENTION";
        } else {
          obj.organizationVerificationStatus = "RNA_NOT_MATCHED";
        }
      } else if (rna && isValidSiret(rna)) {
        const data = resSiret[rna];
        if (data) {
          obj.associationId = data._id.toString();
          obj.associationRNA = data.rna;
          obj.associationSiren = data.siren;
          obj.associationSiret = data.siret;
          obj.associationName = data.title;
          obj.associationAddress = `${data.addressNumber || ""} ${data.addressRepetition || ""} ${data.addressType || ""} ${data.addressStreet || ""}`
            .replaceAll(/\s+/g, " ")
            .trim();
          obj.associationCity = data.addressCity;
          obj.associationPostalCode = data.addressPostalCode;
          obj.associationDepartmentCode = data.addressDepartmentCode;
          obj.associationDepartmentName = data.addressDepartmentName;
          obj.associationRegion = data.addressRegion;
          obj.organizationVerificationStatus = data.source === "DB" ? "SIRET_MATCHED_WITH_DB" : "SIRET_MATCHED_WITH_DATA_SUBVENTION";
        } else {
          obj.organizationVerificationStatus = "SIRET_NOT_MATCHED";
        }
      } else if (mission.organizationName) {
        if (resNames.exact[mission.organizationName]) {
          const data = resNames.exact[mission.organizationName];
          obj.associationRNA = data.rna;
          obj.associationSiren = data.siren;
          obj.associationSiret = data.siret;
          obj.associationName = data.title;
          obj.associationAddress = `${data.addressNumber || ""} ${data.addressRepetition || ""} ${data.addressType || ""} ${data.addressStreet || ""}`
            .replaceAll(/\s+/g, " ")
            .trim();
          obj.associationCity = data.addressCity;
          obj.associationPostalCode = data.addressPostalCode;
          obj.associationDepartmentCode = data.addressDepartmentCode;
          obj.associationDepartmentName = data.addressDepartmentName;
          obj.associationRegion = data.addressRegion;
          obj.organizationVerificationStatus = "NAME_EXACT_MATCHED_WITH_DB";
        } else if (resNames.approximate[mission.organizationName]) {
          obj.organizationVerificationStatus = "NAME_APPROXIMATE_MATCHED_WITH_DB";
        } else {
          obj.organizationVerificationStatus = "NAME_NOT_MATCHED";
        }
      } else {
        obj.organizationVerificationStatus = "NO_DATA";
      }

      updates.push(obj);
    });

    return updates;
  } catch (error) {
    captureException(error, `[${publisher.name}] Failure during rna enrichment`);
    return missions.map((m) => ({ clientId: m.clientId, organizationVerificationStatus: "FAILED" })) as AssociationResult[];
  }
};

const findByRNA = async (rnas: string[]) => {
  const response = await RnaModel.find({ rna: { $in: rnas } });

  for (const rna of rnas.filter((rna) => !response.find((r) => r.rna === rna))) {
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
      } as RNA;

      const newRna = await RnaModel.create(obj);
      response.push(newRna);
    }
  }

  const res = {} as { [key: string]: RNA };
  response.forEach((item) => {
    res[item.rna] = item;
  });

  return res;
};

const findBySiret = async (sirets: string[]) => {
  const response = await RnaModel.find({ siret: { $in: sirets } });
  for (const siret of sirets.filter((siret) => !response.find((r) => r.siret === siret))) {
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
      } as RNA;

      const newRna = await RnaModel.create(obj);
      response.push(newRna);
    }
  }
  const res = {} as { [key: string]: RNA };
  response.forEach((item) => {
    res[item.rna] = item;
  });

  return res;
};

const findByName = async (names: string[]) => {
  const res = {
    exact: {} as { [key: string]: RNA },
    approximate: {} as { [key: string]: RNA[] },
  };

  for (const name of names) {
    // Try exact match first
    const exactMatch = await RnaModel.findOne({
      title: name,
    });

    if (exactMatch) {
      res.exact[name] = exactMatch;
      continue;
    }

    // Try approximate match using case-insensitive regex
    const approximateMatch = await RnaModel.find({
      title: {
        $regex: `^${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (approximateMatch) {
      res.approximate[name] = approximateMatch;
      continue;
    }
  }

  return res;
};

const getDepartement = (postalCode: string) => {
  if (!postalCode) return null;
  const code = postalCode.slice(0, 2);
  if (!code || !DEPARTMENTS[code]) return null;
  return { code, name: DEPARTMENTS[code][0], region: DEPARTMENTS[code][1] };
};
