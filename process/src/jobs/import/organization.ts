import { HydratedDocument } from "mongoose";

import { DEPARTMENTS } from "../../constants/departments";
import { captureException } from "../../error";
import OrganizationModel from "../../models/organization";
import OrganizationNameMatchModel from "../../models/organization-name-matches";
import apiDatasubvention from "../../services/api-datasubvention";
import { Mission, Organization, OrganizationNameMatch } from "../../types";
import { slugify } from "../../utils";

const isValidRNA = (rna: string) => {
  return rna && rna.length === 10 && rna.startsWith("W") && rna.match(/^[W0-9]+$/);
};

const isValidSiret = (siret: string) => {
  return siret && siret.length === 14 && siret.match(/^[0-9]+$/);
};

export const verifyOrganization = async (missions: Mission[]) => {
  const result = [] as Mission[];
  if (!missions.length) {
    return result;
  }

  try {
    const organizationsRNAs = [] as string[];
    const organizationsSirets = [] as string[];
    const organizationsNames = [] as string[];

    missions.forEach((mission) => {
      // remove all non alphanumeric characters and convert to uppercase
      const rna = (mission.organizationRNA || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (rna && isValidRNA(rna)) {
        if (organizationsRNAs.includes(rna)) {
          return;
        }
        organizationsRNAs.push(rna);
      } else if (rna && isValidSiret(rna)) {
        // Made for Service Civique
        if (organizationsSirets.includes(rna)) {
          return;
        }
        organizationsSirets.push(rna);
      } else if (mission.organizationName) {
        if (organizationsNames.includes(mission.organizationName)) {
          return;
        }
        organizationsNames.push(mission.organizationName);
      }
    });

    console.log(`[Organization Verification] Have ${organizationsRNAs.length} RNAs, ${organizationsSirets.length} SIRETS and ${organizationsNames.length} names to verify`);

    const resRna = organizationsRNAs.length !== 0 ? await findByRNA(organizationsRNAs) : {};
    const resSiret = organizationsSirets.length !== 0 ? await findBySiret(organizationsSirets) : {};
    const resNames = organizationsNames.length !== 0 ? await findByName(organizationsNames) : { exact: {}, approximate: {} };

    console.log(`[Organization Verification] Results:`);
    console.log(`- RNA matches: ${Object.keys(resRna).length}`);
    console.log(`- SIRET matches: ${Object.keys(resSiret).length}`);
    console.log(`- Name exact matches: ${Object.keys(resNames.exact).length}\n`);

    for (const mission of missions) {
      const identifier = (mission.organizationRNA || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      const obj = { clientId: mission.clientId } as Mission;

      if (identifier && isValidRNA(identifier)) {
        const data = resRna[identifier];
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
          obj.organisationIsRUP = data.isRUP;
          obj.organizationVerificationStatus = data.source === "DATA_SUBVENTION" ? "RNA_MATCHED_WITH_DATA_SUBVENTION" : "RNA_MATCHED_WITH_DATA_DB";
        } else {
          obj.organizationVerificationStatus = "RNA_NOT_MATCHED";
        }
      } else if (identifier && isValidSiret(identifier)) {
        const data = resSiret[identifier];
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
          obj.organisationIsRUP = data.isRUP;
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
          obj.organisationIsRUP = data.isRUP;
          obj.organizationVerificationStatus = "NAME_EXACT_MATCHED_WITH_DB";
        } else if (resNames.approximate[mission.organizationName]) {
          obj.organizationVerificationStatus = "NAME_APPROXIMATE_MATCHED_WITH_DB";
          const match = resNames.approximate[mission.organizationName];
          if (match && mission._id) {
            match.missionIds = [...new Set([...match.missionIds, mission._id.toString()])];
            await match.save();
          }
        } else {
          obj.organizationVerificationStatus = "NAME_NOT_MATCHED";
        }
      } else {
        obj.organizationVerificationStatus = "NO_DATA";
      }

      result.push(obj);
    }

    return result;
  } catch (error) {
    captureException(error, `[Organization] Failure during rna enrichment`);
    return missions.map((m) => ({
      clientId: m.clientId,
      organizationVerificationStatus: "FAILED",
    })) as Mission[];
  }
};

const findByRNA = async (rnas: string[]) => {
  const res = {} as { [key: string]: Organization };
  const rnasToFetch = [] as string[];

  const response = await OrganizationModel.find({ rna: { $in: rnas } });
  console.log(`[Organization-RNA] Found ${response.length} RNAs in database:`);

  rnas.forEach((rna) => {
    const item = response.find((r) => r.rna === rna);
    if (item) {
      res[rna] = item;
    } else {
      rnasToFetch.push(rna);
    }
  });

  console.log(`[Organization-RNA] Fetching ${rnasToFetch.length} RNAs from datasubvention`);

  for (const rna of rnasToFetch) {
    try {
      // limited to 80 requests per minute
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const data = await apiDatasubvention.get(`/association/${rna}`);

      if (data.association) {
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

          existing.set(updates);
          await existing.save();
          res[rna] = existing;
        } else {
          const newRna = await OrganizationModel.create(obj);
          res[rna] = newRna;
        }
      } else {
        console.log(`[Organization-RNA] No valid RNA data found for rna ${rna}`);
      }
    } catch (error: any) {
      console.log(`[Organization-RNA] Error fetching RNA ${rna}:`, error.message);
      continue;
    }
  }

  return res;
};

const findBySiret = async (sirets: string[]) => {
  const res = {} as { [key: string]: Organization };
  const siretsToFetch = [] as string[];

  const response = await OrganizationModel.find({ sirets: { $in: sirets } });
  console.log(`[Organization-SIRET] Found ${response.length} SIRETs in database`);

  sirets.forEach((siret) => {
    const item = response.find((r) => r.sirets.includes(siret));
    if (item) {
      res[siret] = item;
    } else {
      siretsToFetch.push(siret);
    }
  });

  console.log(`[Organization-SIRET] Fetching ${siretsToFetch.length} SIRETs from datasubvention`);

  for (const siret of siretsToFetch) {
    try {
      // limited to 80 requests per minute
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log(`[Organization-SIRET] Fetching ${siret} from datasubvention`);
      const data = await apiDatasubvention.get(`/etablissement/${siret}`);

      if (data.etablissement) {
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

        const existsRNA = obj.rna ? await OrganizationModel.findOne({ rna: obj.rna }) : null;
        if (existsRNA) {
          const updates = {} as Organization;

          if (!existsRNA.siren) {
            updates.siren = obj.siren;
          }
          if (!existsRNA.sirets || !existsRNA.sirets.includes(siret)) {
            updates.sirets = [...(existsRNA.sirets || []), siret];
          }
          if (!existsRNA.title) {
            updates.title = obj.title;
          }
          if (!existsRNA.addressNumber) {
            updates.addressNumber = obj.addressNumber;
          }
          if (!existsRNA.addressType) {
            updates.addressType = obj.addressType;
          }
          if (!existsRNA.addressStreet) {
            updates.addressStreet = obj.addressStreet;
          }
          if (!existsRNA.addressCity) {
            updates.addressCity = obj.addressCity;
          }
          if (!existsRNA.addressPostalCode) {
            updates.addressPostalCode = obj.addressPostalCode;
          }
          if (!existsRNA.addressDepartmentCode) {
            updates.addressDepartmentCode = obj.addressDepartmentCode;
          }
          if (!existsRNA.addressDepartmentName) {
            updates.addressDepartmentName = obj.addressDepartmentName;
          }
          if (!existsRNA.addressRegion) {
            updates.addressRegion = obj.addressRegion;
          }

          if (Object.keys(updates).length > 0) {
            existsRNA.set(updates);
            await existsRNA.save();
          }
          res[siret] = existsRNA;
        } else {
          const newRNA = await OrganizationModel.create(obj);
          res[siret] = newRNA;
        }
      } else {
        console.log(`[Organization-SIRET] No valid RNA or SIREN data found for SIRET ${siret}`);
      }
    } catch (error: any) {
      console.error(error, `[Organization-SIRET] Error fetching SIRET ${siret}`);
      continue;
    }
  }

  return res;
};

const findByName = async (names: string[]) => {
  const res = {
    exact: {} as { [key: string]: Organization },
    approximate: {} as { [key: string]: HydratedDocument<OrganizationNameMatch> },
  };

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (i % 50 === 0) {
      console.log(`[Organization-NAME] Processing ${i + 1} / ${names.length} names`);
    }

    const existingMatches = await OrganizationNameMatchModel.find({ name });
    if (existingMatches.length > 0) {
      res.approximate[name] = existingMatches[0];
      continue;
    }

    const exactMatch = await OrganizationModel.find({ titleSlug: slugify(name) });
    if (exactMatch.length === 1) {
      res.exact[name] = exactMatch[0];
      continue;
    }

    /*
    // Try approximate match using case-insensitive regex
    const matchCount = await OrganizationModel.countDocuments({
      title: {
        $regex: `^${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (matchCount > 0) {
      const match = await OrganizationNameMatchModel.findOne({ name });

      const approximateMatches = await OrganizationModel.find({
        title: {
          $regex: `^${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`,
          $options: "i",
        },
      }).limit(20);

      if (match) {
        match.organizationIds = [...new Set([...match.organizationIds, ...approximateMatches.map((m) => m._id.toString())])];
        match.organizationNames = [...new Set([...match.organizationNames, name])];
        match.matchCount = matchCount;
        match.missionIds = [...new Set([...match.missionIds])];
        await match.save();
        res.approximate[name] = match;
      } else {
        const newMatch = await OrganizationNameMatchModel.create({
          name,
          organizationIds: approximateMatches.map((m) => m._id.toString()),
          organizationNames: [name],
          matchCount: matchCount,
          missionIds: [],
        });
        res.approximate[name] = newMatch;
      }
    }
    */
  }

  return res;
};

const getDepartement = (postalCode: string) => {
  if (!postalCode) {
    return null;
  }
  const code = postalCode.slice(0, 2);
  if (!code || !DEPARTMENTS[code]) {
    return null;
  }
  return { code, name: DEPARTMENTS[code][0], region: DEPARTMENTS[code][1] };
};
