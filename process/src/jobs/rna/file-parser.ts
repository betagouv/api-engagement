import { parse } from "csv-parse/sync";
import streamPackage from "stream";

import esClient from "../../db/elastic";
import { RNA_INDEX } from "../../config";
import { DEPARTMENTS } from "../../constants/departments";
import { DataGouvRnaRecord } from "../../types/data-gouv";
import { Association } from "../../types";

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

const slugify = (value: string) => {
  const a = "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿź·/_,:;";
  const b = "aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyz------";
  const p = new RegExp(a.split("").join("|"), "g");
  return value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^\w\-]+/g, "") // Remove all non-word characters
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
};

const writeData = async (data: DataGouvRnaRecord[]) => {
  const bulk = [];
  let count = 0;

  for (const doc of data) {
    const id = doc.id;

    const department = findDepartment(doc.adrs_codepostal);
    const obj = {
      rna: doc.id,
      siret: doc.siret,
      rup_mi: doc.rup_mi,
      gestion: doc.gestion,
      status: findStatus(doc.position),
      created_at: new Date(doc.date_creat),
      last_declared_at: new Date(doc.date_decla),
      published_at: new Date(doc.date_publi),
      dissolved_at: new Date(doc.date_disso),
      updated_at: new Date(doc.maj_time),
      nature: doc.nature,
      groupement: findGroupement(doc.groupement),
      title: doc.titre,
      short_title: doc.titre_court,
      title_slug: slugify(doc.titre),
      short_title_slug: slugify(doc.titre_court),
      object: doc.objet,
      social_object1: doc.objet_social1,
      social_object2: doc.objet_social2,
      address_complement: doc.adrs_complement,
      address_number: doc.adrs_numvoie,
      address_repetition: doc.adrs_repetition,
      address_type: doc.adrs_typevoie,
      address_street: doc.adrs_libvoie,
      address_distribution: doc.adrs_distrib,
      address_insee_code: doc.adrs_codeinsee,
      address_postal_code: doc.adrs_codepostal,
      address_department_code: department.code,
      address_department_name: department.department,
      address_region: department.region,
      address_city: doc.adrs_libcommune,
      management_declarant: doc.adrg_declarant,
      management_complement: doc.adrg_complemgeo,
      management_street: doc.adrg_libvoie,
      management_distribution: doc.adrg_distrib,
      management_postal_code: doc.adrg_codepostal,
      management_city: doc.adrg_achemine,
      management_country: doc.adrg_pays,
      director_civility: doc.dir_civilite,
      website: doc.siteweb,
      observation: doc.observation,
      sync_at: new Date(),
    } as Association;

    bulk.push({ index: { _index: RNA_INDEX, _id: id } });
    bulk.push(obj);
    count++;
  }

  // cut bulk in smaller chunks
  for (let i = 0; i < bulk.length; i += 1000) {
    const chunk = bulk.slice(i, i + 1000);
    const { body } = await esClient.bulk({ refresh: true, body: chunk });

    if (body.errors) {
      const errors = body.items.filter((e: any) => e.index.error);
      console.error("Error in bulk transfer:");
      errors.forEach((e: any) => {
        console.error(JSON.stringify(e, null, 2));
      });
      count -= errors.length;
    }
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
