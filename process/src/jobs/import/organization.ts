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

    const resRna = organizationsRNAs.length !== 0 ? await findByRNA(organizationsRNAs) : {};
    const resSiret = organizationsSirets.length !== 0 ? await findBySiret(organizationsSirets) : {};
    const resNames = organizationsNames.length !== 0 ? await findByName(organizationsNames) : { exact: {}, approximate: {} };

    console.log(`\n[Organization Verification] Results:`);
    console.log(`- RNA matches: ${Object.keys(resRna).length}`);
    console.log(`- SIRET matches: ${Object.keys(resSiret).length}`);
    console.log(`- Name exact matches: ${Object.keys(resNames.exact).length}\n`);

    for (const mission of missions) {
      const rna = (mission.organizationRNA || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const obj = { clientId: mission.clientId } as Mission;

      if (rna && isValidRNA(rna)) {
        const data = resRna[rna];
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

      result.push(obj);
    }

    return result;
  } catch (error) {
    captureException(error, `[Organization] Failure during rna enrichment`);
    return missions.map((m) => ({ clientId: m.clientId, organizationVerificationStatus: "FAILED" })) as Mission[];
  }
};

const findByRNA = async (rnas: string[]) => {
  console.log("\n=== RNA Verification Details ===");
  console.log("Input RNAs:", rnas);

  const response = await OrganizationModel.find({ rna: { $in: rnas } });
  console.log(`[Organization DB] Found ${response.length} RNAs in database`);
  console.log(
    "Database matches:",
    response.map((r) => ({ rna: r.rna, title: r.title })),
  );

  const rnasToFetch = rnas.filter((rna) => !response.find((r) => r.rna === rna));
  console.log(`[Organization API] Need to fetch ${rnasToFetch.length} RNAs from datasubvention`);
  if (rnasToFetch.length > 0) {
    console.log("RNAs to fetch:", rnasToFetch);
  }

  for (const rna of rnasToFetch) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`\nAttempting to fetch RNA: ${rna} from DATA_SUBVENTION`);

      const data = await apiDatasubvention.get(`/association/${rna}`);
      console.log(
        `API Response received for RNA ${rna}:`,
        data?.association?.rna?.[0]?.value ? "Has RNA" : "No RNA",
        data?.association?.denomination_rna?.[0]?.value ? "Has Name" : "No Name",
      );
      if (data?.association?.rna?.[0]?.value && data?.association?.rna?.[0]?.provider === "RNA" && data?.association?.denomination_rna?.[0]?.value) {
        const departement = data.association.adresse_siege_rna ? getDepartement(data.association.adresse_siege_rna[0]?.value?.code_postal) : null;
        const obj = {
          rna: data.association.rna[0].value,
          title: data.association.denomination_rna[0].value,
          siren: data.association.siren?.[0]?.value || data.association.siret?.[0]?.value?.slice(0, 9),
          siret: data.association.siret?.[0]?.value,
          addressNumber: data.association.adresse_siege_rna[0]?.value?.numero,
          addressType: data.association.adresse_siege_rna[0]?.value?.type_voie,
          addressStreet: data.association.adresse_siege_rna[0]?.value?.voie,
          addressCity: data.association.adresse_siege_rna[0]?.value?.commune,
          addressPostalCode: data.association.adresse_siege_rna[0]?.value?.code_postal,
          addressDepartmentCode: departement?.code,
          addressDepartmentName: departement?.name,
          addressRegion: departement?.region,
          createdAt: data.association.date_creation_rna?.[0] ? new Date(data.association.date_creation_rna[0].value) : undefined,
          updatedAt: data.association.date_modification_rna?.[0] ? new Date(data.association.date_modification_rna[0].value) : undefined,
          object: data.association.objet_social?.[0]?.value,
          source: "DATA_SUBVENTION",
        } as Organization;

        const newRna = await OrganizationModel.create(obj);
        console.log(`[Organization] Successfully created new organization in database with RNA ${rna}`);
        response.push(newRna);
      } else {
        console.log(`[Organization] No valid RNA data found for rna ${rna}`);
      }
    } catch (error: any) {
      console.log(`[Organization] Error fetching RNA ${rna}:`, error.message);
      continue;
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
  console.log(`[Organization DB] Found ${response.length} SIRETs in database`);

  const siretsToFetch = sirets.filter((siret) => !response.find((r) => r.siret === siret));
  console.log(`[Organization API] Fetching ${siretsToFetch.length} SIRETs from datasubvention`);

  const batchSize = 10;
  const delay = 1000;

  for (let i = 0; i < siretsToFetch.length; i += batchSize) {
    const batch = siretsToFetch.slice(i, i + batchSize);
    const promises = batch.map(async (siret) => {
      try {
        await new Promise((resolve) => setTimeout(resolve, delay));
        const data = await apiDatasubvention.get(`/association/${siret}`);

        if (!data?.association?.rna?.[0]?.value || data?.association?.rna?.[0]?.provider !== "RNA" || !data?.association?.denomination_rna?.[0]?.value) {
          return null;
        }

        const departement = data.association.adresse_siege_rna ? getDepartement(data.association.adresse_siege_rna[0].value?.code_postal) : null;

        const obj = {
          rna: data.association.rna[0].value,
          title: data.association.denomination_rna[0].value,
          siret: data.association.etablisements_siret[0]?.value[0],
          siren: data.association.siren?.[0]?.value || data.association.siret?.[0]?.value?.slice(0, 9),
          addressNumber: data.association.adresse_siege_rna[0]?.value?.numero,
          addressType: data.association.adresse_siege_rna[0]?.value?.type_voie,
          addressStreet: data.association.adresse_siege_rna[0]?.value?.voie,
          addressCity: data.association.adresse_siege_rna[0]?.value?.commune,
          addressPostalCode: data.association.adresse_siege_rna[0]?.value?.code_postal,
          addressDepartmentCode: departement?.code,
          addressDepartmentName: departement?.name,
          addressRegion: departement?.region,
          createdAt: data.association.date_creation_rna?.[0] ? new Date(data.association.date_creation_rna[0].value) : undefined,
          updatedAt: data.association.date_modification_rna?.[0] ? new Date(data.association.date_modification_rna[0].value) : undefined,
          object: data.association.objet_social?.[0]?.value,
          source: "DATA_SUBVENTION",
        } as Organization;

        // Check for existing RNA
        const existsRNA = await OrganizationModel.findOne({ rna: obj.rna });
        if (existsRNA) {
          if (!existsRNA.siret && obj.siret) {
            existsRNA.siret = obj.siret;
            await existsRNA.save();
            return existsRNA;
          }
          return existsRNA;
        }

        const newRNA = await OrganizationModel.create(obj);
        return newRNA;
      } catch (error: any) {
        console.log(`[Organization] Error fetching siret ${siret}:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(promises);
    response.push(...results.filter((result): result is HydratedDocument<Organization> => result !== null));

    console.log(`[Organization] Processed ${Math.min(i + batchSize, siretsToFetch.length)}/${siretsToFetch.length} SIRETs`);
  }

  const res = {} as { [key: string]: Organization };
  response.forEach((item) => {
    if (item?.rna) res[item.rna] = item;
  });

  return res;
};

const findByName = async (names: string[]) => {
  const res = {
    exact: {} as { [key: string]: Organization },
    approximate: {} as { [key: string]: HydratedDocument<OrganizationNameMatch> },
  };

  console.log(`\n[Organization] Starting name matching for ${names.length} organizations`);

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (i % 50 === 0) console.log(`[Organization] Processing ${i + 1} / ${names.length} names`);

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

    // Try approximate match using case-insensitive regex
    const approximateMatchCount = await OrganizationModel.countDocuments({
      title: {
        $regex: `^${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (approximateMatchCount > 0) {
      const match = await OrganizationNameMatchModel.findOne({ name });

      if (approximateMatchCount > 20) {
        if (match) {
          match.matchCount = approximateMatchCount;
          match.missionIds = [...new Set([...match.missionIds])];
          await match.save();
          res.approximate[name] = match;
        } else {
          const newMatch = await OrganizationNameMatchModel.create({
            name,
            matchCount: approximateMatchCount,
            missionIds: [],
          });
          res.approximate[name] = newMatch;
        }
      } else {
        const approximateMatches = await OrganizationModel.find({
          title: {
            $regex: `^${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`,
            $options: "i",
          },
        });

        if (match) {
          match.organizationIds = [...new Set([...match.organizationIds, ...approximateMatches.map((m) => m._id.toString())])];
          match.organizationNames = [...new Set([...match.organizationNames, name])];
          match.matchCount = approximateMatchCount;
          await match.save();
          res.approximate[name] = match;
        } else {
          const newMatch = await OrganizationNameMatchModel.create({
            name,
            organizationIds: approximateMatches.map((m) => m._id.toString()),
            organizationNames: [name],
            matchCount: approximateMatchCount,
          });
          res.approximate[name] = newMatch;
        }
      }
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
