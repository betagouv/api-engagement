import esClient from "../../db/elastic";
import apiDatasubvention from "../../services/api-datasubvention";
import { RNA_INDEX } from "../../config";
import { DEPARTMENTS } from "../../constants/departments";
import { captureException } from "../../error";
import { Association, Mission, Publisher } from "../../types";

const isValideRNA = (rna: string) => {
  return rna && rna.length === 10 && rna.startsWith("W") && rna.match(/^[W0-9]+$/);
};

export interface AssociationResult {
  clientId: string;
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
  rnaStatus: "NOT_FOUND" | "ENRICHED" | "ENRICHED_BY_DATA_SUBVENTION" | "NEED_VERIFY" | "FAILED";
}

export const enrichWithRNA = async (publisher: Publisher, missions: Mission[]) => {
  if (!missions.length) return [] as AssociationResult[];
  try {
    const organizationsRNAs = [] as string[];
    const organizationsNames = [] as string[];

    missions.forEach((mission) => {
      // remove all non alphanumeric characters and convert to uppercase
      const rna = (mission.organizationRNA || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (rna && isValideRNA(rna)) {
        if (organizationsRNAs.includes(rna)) return;
        organizationsRNAs.push(rna);
      } else if (mission.organizationName) {
        if (organizationsNames.includes(mission.organizationName)) return;
        organizationsNames.push(mission.organizationName);
      }
    });
    console.log(`[${publisher.name}] Enriching with RNA ${missions.length} missions, with ${organizationsRNAs.length} valid RNA and ${organizationsNames.length} names...`);
    const resRna = organizationsRNAs.length !== 0 ? await findByRNA(organizationsRNAs) : { res: {}, notFound: [] };
    const resNames = organizationsNames.length !== 0 ? await findByName(organizationsNames) : { res: {} };

    console.log(`[${publisher.name}] RNA Found for ${Object.keys(resRna.res).length} RNA and ${Object.keys(resNames.res).length} names`);
    const updates = [] as AssociationResult[];

    missions.forEach((mission) => {
      const rna = (mission.organizationRNA || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const obj = { rnaStatus: "NOT_FOUND", clientId: mission.clientId } as AssociationResult;
      if (rna && isValideRNA(rna)) {
        const data = resRna.res[rna];
        if (data) {
          obj.associationRNA = data.rna;
          obj.associationSiren = data.siren;
          obj.associationSiret = data.siret;
          obj.associationName = data.title;
          obj.associationAddress = `${data.address_number || ""} ${data.address_repetition || ""} ${data.address_type || ""} ${data.address_street || ""}`
            .replaceAll(/\s+/g, " ")
            .trim();
          obj.associationCity = data.address_city;
          obj.associationPostalCode = data.address_postal_code;
          obj.associationDepartmentCode = data.address_department_code;
          obj.associationDepartmentName = data.address_department_name;
          obj.associationRegion = data.address_region;
          obj.rnaStatus = data.source === "RNA_DB" ? "ENRICHED" : "ENRICHED_BY_DATA_SUBVENTION";
        }
      } else {
        const data = mission.organizationName ? resNames.res[mission.organizationName] : null;
        if (data) {
          obj.associationRNA = data.rna;
          obj.associationSiren = data.siren;
          obj.associationSiret = data.siret;
          obj.associationName = data.title;
          obj.associationAddress = `${data.address_number || ""} ${data.address_repetition || ""} ${data.address_type || ""} ${data.address_street || ""}`
            .replaceAll(/\s+/g, " ")
            .trim();
          obj.associationCity = data.address_city;
          obj.associationPostalCode = data.address_postal_code;
          obj.associationDepartmentCode = data.address_department_code;
          obj.associationDepartmentName = data.address_department_name;
          obj.associationRegion = data.address_region;
          obj.rnaStatus = "NEED_VERIFY";
        }
      }

      updates.push(obj);
    });

    return updates;
  } catch (error) {
    captureException(error, `[${publisher.name}] Failure during rna enrichment`);
    return missions.map((m) => ({ clientId: m.clientId, rnaStatus: "FAILED" })) as AssociationResult[];
  }
};

const findByRNA = async (rnas: string[]) => {
  const res = {} as { [key: string]: Association };
  const { body } = await esClient.search({
    index: RNA_INDEX,
    body: {
      query: {
        terms: { _id: rnas },
      },
      size: 10000,
    },
  });

  body.hits.hits.forEach((hit: { _id: string; _source: Association }) => {
    res[hit._id] = { ...hit._source, source: "RNA_DB" };
  });

  const newRnas = [] as Association[];

  for (const rna of rnas.filter((rna) => !res[rna])) {
    const data = await apiDatasubvention.get(`/association/${rna}`);
    if (data && data.association) {
      const departement = data.association.adresse_siege_rna ? getDepartement(data.association.adresse_siege_rna.value?.code_postal) : null;
      const obj = {
        rna: data.association.rna.value,
        title: data.association.denomination_rna.value,
        siren: data.association.siren?.value,
        address_number: data.association.adresse_siege_rna?.value?.numero,
        address_type: data.association.adresse_siege_rna?.value?.type_voie,
        address_street: data.association.adresse_siege_rna?.value?.voie,
        address_city: data.association.adresse_siege_rna?.value?.commune,
        address_postal_code: data.association.adresse_siege_rna?.value?.code_postal,
        address_department_code: departement?.code,
        address_department_name: departement?.name,
        address_region: departement?.region,
        created_at: data.association.date_creation_rna ? new Date(data.association.date_creation_rna.value) : undefined,
        updated_at: data.association.date_creation_rna ? new Date(data.association.date_modification_rna.value) : undefined,
        object: data.association.objet_social.value,
        source: "DATA_SUBVENTION",
      } as Association;
      res[rna] = obj;
      newRnas.push(obj);
    }
  }

  if (newRnas.length) {
    const bulk = newRnas.flatMap((obj) => [{ index: { _index: RNA_INDEX, _id: obj.rna } }, obj]);
    await esClient.bulk({ refresh: true, body: bulk });
  }

  const notFound = rnas.filter((rna) => !res[rna]);
  return { res, notFound };
};

const findByName = async (names: string[]) => {
  const res = {} as { [key: string]: Association };

  // TODO slugify names
  const { body } = await esClient.search({
    index: RNA_INDEX,
    body: {
      query: {
        terms: { "title.keyword": names },
      },
      size: 10000,
    },
  });

  body.hits.hits.forEach((hit: { _id: string; _source: Association }) => {
    res[hit._id] = hit._source;
  });

  return { res };
};

const getDepartement = (postalCode: string) => {
  if (!postalCode) return null;
  const code = postalCode.slice(0, 2);
  if (!code || !DEPARTMENTS[code]) return null;
  return { code, name: DEPARTMENTS[code][0], region: DEPARTMENTS[code][1] };
};
