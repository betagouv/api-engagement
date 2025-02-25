import { parse } from "csv-parse/sync";
import streamPackage from "stream";

import { DEPARTMENTS } from "../../constants/departments";
import { DataGouvRnaRecord } from "../../types/data-gouv";
import { Organization } from "../../types";
import OrganizationModel from "../../models/organization";
import { slugify } from "../../utils";

const findStatus = (position: string) => {
  if (position === "A") return "ACTIVE";
  if (position === "D") return "DISSOLVED";
  if (position === "S") return "DELETED";
  else return "UNKNOWN";
};

const findGroupement = (groupement: string) => {
  if (groupement === "F") return "FEDERATION";
  if (groupement === "S") return "SIMPLE";
  if (groupement === "U") return "UNION";
  else return "UNKNOWN";
};

const findDepartment = (postalCode: string) => {
  let code;
  if (postalCode.startsWith("97") || postalCode.startsWith("98")) code = postalCode.substring(0, 3);
  else if (postalCode.length === 5) code = postalCode.substring(0, 2);
  else code = postalCode.substring(0, 1);

  const department = DEPARTMENTS[code];

  return { code, department: department ? department[0] : "UNKNOWN", region: department ? department[1] : "UNKNOWN" };
};

const writeData = async (data: DataGouvRnaRecord[]) => {
  const bulk = [];
  let count = 0;

  for (const doc of data) {
    // Remove header
    if (doc.id === "id") continue;

    const department = findDepartment(doc.adrs_codepostal);
    const obj = {
      rna: doc.id,
      siret: doc.siret,
      rupMi: doc.rup_mi,
      gestion: doc.gestion,
      status: findStatus(doc.position),
      createdAt: new Date(doc.date_creat),
      lastDeclaredAt: new Date(doc.date_decla),
      publishedAt: new Date(doc.date_publi),
      dissolvedAt: new Date(doc.date_disso),
      updatedAt: new Date(doc.maj_time),
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

    bulk.push({ updateOne: { filter: { rna: doc.id }, update: obj, upsert: true } });

    if (bulk.length === 5000) {
      const res = await OrganizationModel.bulkWrite(bulk);
      console.log(`[Organizations] Imported ${res.upsertedCount} organizations`);
      bulk.length = 0;
    }
  }

  if (bulk.length > 0) {
    const res = await OrganizationModel.bulkWrite(bulk);
    console.log(`[Organizations] Imported ${res.upsertedCount} organizations`);
  }
  return count;
};

const parseFile = (content: string) => {
  const records = parse(content, {
    // columns: true,
    skip_empty_lines: true,
    delimiter: ";",
  }) as string[][];

  const data = records.map((r) => {
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
    ] = r;

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
  });

  return data;
};

const collectStream = async (stream: streamPackage.Readable): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data = "" as string;
    stream.on("data", (chunk) => {
      data += chunk as string;
    });
    stream.on("end", () => {
      resolve(data);
    });
    stream.on("error", (err) => {
      reject(err);
    });
  });
};

const handler = async (stream: streamPackage.Readable) => {
  const content = await collectStream(stream);
  const data = parseFile(content);
  const count = await writeData(data);
  console.log(`[RNA] Imported ${count} records`);
  return count;
};

export default { handler };
