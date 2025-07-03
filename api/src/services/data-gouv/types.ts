export interface DataGouvResource {
  id: string;
  title: string;
  description: string;
  filetype: string;
  type: string;
  format: string;
  url: string;
  latest: string;
  checksum: string | null;
  filesize: string | null;
  mime: string;
  created_at: string;
  last_modified: string;
  metrics: {
    views: number;
  };
  harvest: {
    created_at: string;
    modified_at: string;
    uri: string;
  };
  extras: {
    "check:url": string;
    "check:available": boolean;
    "check:date": string;
    "check:count-availability": number;
    "check:headers:content-type": string;
    "check:headers:charset": string;
    "check:headers:content-disposition": string;
    "check:status": number;
    "check:timeout": boolean;
    "analysis:content-length": number;
    "analysis:checksum": string;
    "analysis:mime-type": string;
    "analysis:last-modified-at": string;
    "analysis:last-modified-detection": string;
    "analysis:parsing:finished_at": string;
    "analysis:parsing:started_at": string;
  };
  preview_url: string | null;
  schema: any;
  internal: {
    created_at_internal: string;
    last_modified_internal: string;
  };
}

export interface DataGouvRnaRecord {
  id: string;
  id_ex: string;
  siret: string;
  rup_mi: string;
  gestion: string;
  date_creat: string;
  date_decla: string;
  date_publi: string;
  date_disso: string;
  nature: string;
  groupement: string;
  titre: string;
  titre_court: string;
  objet: string;
  objet_social1: string;
  objet_social2: string;
  adrs_complement: string;
  adrs_numvoie: string;
  adrs_repetition: string;
  adrs_typevoie: string;
  adrs_libvoie: string;
  adrs_distrib: string;
  adrs_codeinsee: string;
  adrs_codepostal: string;
  adrs_libcommune: string;
  adrg_declarant: string;
  adrg_complemid: string;
  adrg_complemgeo: string;
  adrg_libvoie: string;
  adrg_distrib: string;
  adrg_codepostal: string;
  adrg_achemine: string;
  adrg_pays: string;
  dir_civilite: string;
  siteweb: string;
  publiweb: string;
  observation: string;
  position: string;
  maj_time: string;
}
