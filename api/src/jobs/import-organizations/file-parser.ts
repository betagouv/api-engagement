import { parse } from "csv-parse";
import { Readable } from "stream";

import { DEPARTMENTS } from "../../constants/departments";
import OrganizationModel from "../../models/organization";
import { DataGouvRnaRecord } from "../../services/data-gouv/types";
import { Organization } from "../../types";
import { slugify } from "../../utils";

const findStatus = (position: string) => {
  if (position === "A") {
    return "ACTIVE";
  }
  if (position === "D") {
    return "DISSOLVED";
  }
  if (position === "S") {
    return "DELETED";
  } else {
    return "UNKNOWN";
  }
};

const findGroupement = (groupement: string) => {
  if (groupement === "F") {
    return "FEDERATION";
  }
  if (groupement === "S") {
    return "SIMPLE";
  }
  if (groupement === "U") {
    return "UNION";
  } else {
    return "UNKNOWN";
  }
};

const findDepartment = (postalCode: string) => {
  let code;
  if (postalCode.startsWith("97") || postalCode.startsWith("98")) {
    code = postalCode.substring(0, 3);
  } else if (postalCode.length === 5) {
    code = postalCode.substring(0, 2);
  } else {
    code = postalCode.substring(0, 1);
  }

  const department = DEPARTMENTS[code];

  return {
    code,
    department: department ? department[0] : "UNKNOWN",
    region: department ? department[1] : "UNKNOWN",
  };
};

const formatDate = (date: string) => {
  if (!date) {
    return null;
  }
  if (isNaN(new Date(date).getTime())) {
    return null;
  }
  return new Date(date);
};

const processRecord = (record: string[]): DataGouvRnaRecord => {
  const [
    id,
    id_ex,
    siret,
    rup_mi,
    gestion,
    date_creat,
    date_decla,
    date_publi,
    date_disso,
    nature,
    groupement,
    titre,
    titre_court,
    objet,
    objet_social1,
    objet_social2,
    adrs_complement,
    adrs_numvoie,
    adrs_repetition,
    adrs_typevoie,
    adrs_libvoie,
    adrs_distrib,
    adrs_codeinsee,
    adrs_codepostal,
    adrs_libcommune,
    adrg_declarant,
    adrg_complemid,
    adrg_complemgeo,
    adrg_libvoie,
    adrg_distrib,
    adrg_codepostal,
    adrg_achemine,
    adrg_pays,
    dir_civilite,
    siteweb,
    publiweb,
    observation,
    position,
    maj_time,
  ] = record;

  return {
    id,
    id_ex,
    siret,
    rup_mi,
    gestion,
    date_creat,
    date_decla,
    date_publi,
    date_disso,
    nature,
    groupement,
    titre,
    titre_court,
    objet,
    objet_social1,
    objet_social2,
    adrs_complement,
    adrs_numvoie,
    adrs_repetition,
    adrs_typevoie,
    adrs_libvoie,
    adrs_distrib,
    adrs_codeinsee,
    adrs_codepostal,
    adrs_libcommune,
    adrg_declarant,
    adrg_complemid,
    adrg_complemgeo,
    adrg_libvoie,
    adrg_distrib,
    adrg_codepostal,
    adrg_achemine,
    adrg_pays,
    dir_civilite,
    siteweb,
    publiweb,
    observation,
    position,
    maj_time,
  } as DataGouvRnaRecord;
};

const createOrganizationFromRecord = (doc: DataGouvRnaRecord): Organization => {
  const department = findDepartment(doc.adrs_codepostal);
  return {
    rna: doc.id,
    siren: doc.siret ? doc.siret.slice(0, 9) : undefined,
    siret: doc.siret,
    sirets: doc.siret ? [doc.siret] : [],
    rupMi: doc.rup_mi,
    gestion: doc.gestion,
    status: findStatus(doc.position),
    createdAt: formatDate(doc.date_creat),
    lastDeclaredAt: formatDate(doc.date_decla),
    publishedAt: formatDate(doc.date_publi),
    dissolvedAt: formatDate(doc.date_disso),
    updatedAt: formatDate(doc.maj_time),
    nature: doc.nature,
    groupement: findGroupement(doc.groupement),
    title: doc.titre,
    shortTitle: doc.titre_court,
    titleSlug: slugify(doc.titre),
    shortTitleSlug: slugify(doc.titre_court),
    object: doc.objet,
    socialObject1: doc.objet_social1,
    socialObject2: doc.objet_social2,
    addressComplement: doc.adrs_complement,
    addressNumber: doc.adrs_numvoie,
    addressRepetition: doc.adrs_repetition,
    addressType: doc.adrs_typevoie,
    addressStreet: doc.adrs_libvoie,
    addressDistribution: doc.adrs_distrib,
    addressInseeCode: doc.adrs_codeinsee,
    addressPostalCode: doc.adrs_codepostal,
    addressDepartmentCode: department.code,
    addressDepartmentName: department.department,
    addressRegion: department.region,
    addressCity: doc.adrs_libcommune,
    managementDeclarant: doc.adrg_declarant,
    managementComplement: doc.adrg_complemgeo,
    managementStreet: doc.adrg_libvoie,
    managementDistribution: doc.adrg_distrib,
    managementPostalCode: doc.adrg_codepostal,
    managementCity: doc.adrg_achemine,
    managementCountry: doc.adrg_pays,
    directorCivility: doc.dir_civilite,
    website: doc.siteweb,
    observation: doc.observation,
    syncAt: new Date(),
  } as Organization;
};

const writeBatch = async (records: DataGouvRnaRecord[]): Promise<number> => {
  const bulk = [];
  let count = 0;

  for (const doc of records) {
    // Remove header
    if (doc.id === "id") {
      continue;
    }

    const obj = createOrganizationFromRecord(doc);
    bulk.push({ updateOne: { filter: { rna: doc.id }, update: obj, upsert: true } });
    count++;
  }

  if (bulk.length > 0) {
    const res = await OrganizationModel.bulkWrite(bulk);
    console.log(`[Organizations] Updated ${res.modifiedCount} organizations, upserted ${res.upsertedCount} organizations`);
  }

  return count;
};

export const parseFile = async (stream: Readable): Promise<number> => {
  return new Promise((resolve, reject) => {
    let totalCount = 0;
    let batch: DataGouvRnaRecord[] = [];
    const BATCH_SIZE = 1000; // Process 1000 records at a time

    // Create a parser stream
    const parser = parse({
      skip_empty_lines: true,
      delimiter: ";",
    });

    // Handle parser errors
    parser.on("error", (err) => {
      reject(err);
    });

    // Process each record as it comes in
    parser.on("readable", () => {
      let record: string[];
      while ((record = parser.read()) !== null) {
        const dataRecord = processRecord(record);
        batch.push(dataRecord);

        // When batch size is reached, process it
        if (batch.length >= BATCH_SIZE) {
          const currentBatch = [...batch];
          batch = [];

          // Process batch asynchronously
          writeBatch(currentBatch)
            .then((count) => {
              totalCount += count;
            })
            .catch((err) => {
              console.error("Error processing batch:", err);
            });
        }
      }
    });

    // When parsing is complete, process any remaining records
    parser.on("end", async () => {
      if (batch.length > 0) {
        try {
          const count = await writeBatch(batch);
          totalCount += count;
        } catch (err) {
          console.error("Error processing final batch:", err);
        }
      }
      resolve(totalCount);
    });

    // Pipe the input stream to the parser
    stream.pipe(parser);
  });
};
