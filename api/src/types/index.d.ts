import { Schema } from "mongoose";
import { BrevoInboundEmail } from "./brevo";

export type Association = {
  _id?: Schema.Types.ObjectId | string;
  score?: number;
  id_siren: string;
  id_rna: string;
  id_correspondance: string;
  logo: string;
  url: string;
  linkedin: string;
  facebook: string;
  twitter: string;
  description: string;
  donation: string;
  statut_juridique: string;
  publics_beneficiaires: string[];
  domaines: string[];
  parent_nom: string;
  parent_id: string;
  tags: string[];
  etablissements_nb_actifs: string;
  est_etablissement_secondaire: string;
  etablissements_etablissement: string[];
  etablissements: string[];
  identite_nom: string;
  identite_sigle: string;
  identite_id_rna: string;
  identite_id_ex: string;
  identite_id_siren: string;
  identite_id_siret_siege: string;
  identite_id_correspondance: string;
  identite_id_forme_juridique: string;
  identite_lib_forme_juridique: string;
  identite_date_pub_jo: Date;
  identite_date_creation_sirene: Date;
  identite_date_modif_rna: Date;
  identite_date_modif_siren: Date;
  identite_active: string;
  identite_nature: string;
  identite_util_publique: string;
  identite_eligibilite_cec: string;
  identite_groupement: string;
  identite_regime: string;
  identite_impots_commerciaux: string;
  activites_objet: string;
  activites_id_objet_social1: string;
  activites_lib_objet_social1: string;
  activites_id_famille1: string;
  activites_lib_famille1: string;
  activites_id_theme1: string;
  activites_lib_theme1: string;
  activites_id_activite_principale: string;
  activites_lib_activite_principale: string;
  activites_annee_activite_principale: string;
  activites_id_tranche_effectif: string;
  activites_lib_tranche_effectif: string;
  activites_effectif_salarie_cent: string;
  activites_annee_effectif_salarie_cent: string;
  activites_appartenance_ess: string;
  activites_date_appartenance_ess: string;
  coordonnees_telephone: string[];
  coordonnees_courriel: string[];
  coordonnees_courriel_status: string;
  coordonnees_adresse_location: {
    lat: number;
    lon: number;
  };
  coordonnees_adresse_nom_complet: string;
  coordonnees_adresse_score_api_adresse: string;
  coordonnees_adresse_id_api_adresse: string;
  coordonnees_adresse_nom: string;
  coordonnees_adresse_code_postal: string;
  coordonnees_adresse_code_insee: string;
  coordonnees_adresse_rue: string;
  coordonnees_adresse_numero: string;
  coordonnees_adresse_commune: string;
  coordonnees_adresse_commune_ancienne: string;
  coordonnees_adresse_contexte: string;
  coordonnees_adresse_departement_numero: string;
  coordonnees_adresse_departement: string;
  coordonnees_adresse_region: string;
  coordonnees_adresse_type: string;
  coordonnees_adresse_siege_num_voie: string;
  coordonnees_adresse_siege_code_type_voie: string;
  coordonnees_adresse_siege_type_voie: string;
  coordonnees_adresse_siege_code_type_voie_insee: string;
  coordonnees_adresse_siege_voie: string;
  coordonnees_adresse_siege_cp: string;
  coordonnees_adresse_siege_commune: string;
  coordonnees_adresse_siege_code_insee: string;
  coordonnees_adresse_gestion_voie: string;
  coordonnees_adresse_gestion_cp: string;
  coordonnees_adresse_gestion_commune: string;
  coordonnees_adresse_gestion_pays: string;
  schema_version: string;
  history: string[];
  created_at: Date;
  updated_at: Date;
};

export type Campaign = {
  _id: Schema.Types.ObjectId;
  name: string;
  type: string;
  url: string;
  trackers: { key: string; value: string }[];
  fromPublisherId: string;
  fromPublisherName: string;
  toPublisherId: string;
  toPublisherName: string;
  active: boolean;
  deletedAt: Date | null;
  reassignedAt: Date | null;
  reassignedByUsername: string | null;
  reassignedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Import = {
  _id: Schema.Types.ObjectId;
  name: string;
  publisherId: string;
  createdCount: number;
  deletedCount: number;
  updatedCount: number;
  startedAt: Date;
  endedAt: Date;
};

export interface Mission {
  _id: Schema.Types.ObjectId;
  _old_id: string | undefined;
  _old_ids: string[] | undefined;

  publisherId: string;
  publisherName: string;
  publisherUrl: string;
  publisherLogo: string;
  lastSyncAt: Date | undefined;
  applicationUrl: string;
  statusCode: string;
  statusComment: string;
  statusCommentHistoric?: {
    status: string;
    comment: string;
    date: Date;
  }[];
  clientId: string;
  title: string;
  description: string;
  descriptionHtml: string;
  tags: string[];
  tasks: string[];
  audience: string[];
  soft_skills: string[];
  organizationId: string | undefined;
  organizationUrl: string | undefined;
  organizationName: string | undefined;
  organizationType: string | undefined;
  organizationLogo: string | undefined;
  organizationDescription: string | undefined;
  organizationClientId: string | undefined;
  organizationFullAddress: string | undefined;
  organizationRNA: string | undefined;
  organizationSiren: string | undefined;
  organizationDepartment: string | undefined;
  organizationPostCode: string | undefined;
  organizationCity: string | undefined;
  organizationStatusJuridique: string | undefined;
  organizationBeneficiaries: string[] | undefined;
  organizationActions: string[] | undefined;
  organizationReseaux: string[] | undefined;
  associationId: string | undefined;
  associationName: string | undefined;
  associationSiren: string | undefined;
  associationRNA: string | undefined;
  associationSources: string[] | undefined;
  associationReseaux: string[] | undefined;
  associationLogo: string | undefined;
  associationAddress: string | null | undefined;
  associationCity: string | null | undefined;
  associationPostalCode: string | null | undefined;
  associationDepartmentCode: string | null | undefined;
  associationDepartmentName: string | null | undefined;
  associationRegion: string | null | undefined;

  reducedMobilityAccessible: "yes" | "no";
  closeToTransport: "yes" | "no";
  openToMinors: "yes" | "no";
  schedule: string;
  postedAt: Date;
  startAt: Date;
  priority: string | undefined;
  metadata: string | undefined;
  endAt: Date | null;
  duration: number | undefined;
  adresse: string | undefined;
  address: string | undefined;
  postalCode: string | undefined;
  departmentName: string | undefined;
  departmentCode: string | undefined;
  city: string | undefined;
  region: string | undefined;
  country: string | undefined;
  geolocStatus: "ENRICHED_BY_PUBLISHER" | "ENRICHED" | "NOT_FOUND" | "NO_DATA" | "SHOULD_ENRICH" | "FAILED";
  rnaStatus: "ENRICHED_BY_DATA_SUBVENTION" | "ENRICHED" | "NEED_VERIFY" | "NOT_FOUND" | "NO_DATA" | "SHOULD_ENRICH" | "FAILED";
  places: number;
  domain: string;
  domainOriginal: string | undefined;
  domainLogo: string;
  type: string;
  activity: string;
  location:
    | {
        lat: number;
        lon: number;
      }
    | undefined;

  geoPoint:
    | {
        type: "Point";
        coordinates: [number, number];
      }
    | undefined;
  snu: boolean | undefined;
  snuPlaces: number | undefined;
  remote: "no" | "possible" | "full";
  deleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  [key: `moderation_${string}_status`]: string | undefined;
  [key: `moderation_${string}_comment`]: string | undefined;
  [key: `moderation_${string}_title`]: string | undefined;
  [key: `moderation_${string}_note`]: string | undefined;
  [key: `moderation_${string}_date`]: Date | undefined;

  leboncoinStatus: "ACCEPTED" | "EDITED" | "DELETED" | "REFUSED" | undefined;
  leboncoinUrl: string | undefined;
  leboncoinComment: string | undefined;
  leboncoinUpdatedAt: Date | undefined;

  jobteaserStatus: "ACCEPTED" | "PENDING" | "DELETED" | "REFUSED" | undefined;
  jobteaserUrl: string | undefined;
  jobteaserComment: string | undefined;
  jobteaserUpdatedAt: Date | undefined;
}

export type ModerationEvent = {
  _id: Schema.Types.ObjectId;
  missionId: string;
  moderatorId: string;
  initialStatus: "ACCEPTED" | "REFUSED" | "PENDING" | "ONGOING";
  newStatus: "ACCEPTED" | "REFUSED" | "PENDING" | "ONGOING";
  initialComment: string | null;
  newComment: string;
  initialNote: string | null;
  newNote: string;
  initialTitle: string;
  newTitle: string;
  userId: string;
  userName: string;
  initialSiren: string | null;
  newSiren: string;
  initialRNA: string | null;
  newRNA: string;
  createdAt: Date;
};

export type Publisher = {
  _id: Schema.Types.ObjectId;
  name: string;
  status: string;
  automated_report: boolean;
  send_report_to: string[];
  mission_type: string | null;
  role_promoteur: boolean;
  role_annonceur_api: boolean;
  role_annonceur_widget: boolean;
  role_annonceur_campagne: boolean;
  url: string;
  moderator: boolean;
  moderatorLink: string;
  email: string;
  documentation: string;
  logo: string;
  feed: string;
  apikey: string | null;
  lastSyncAt: Date;
  publishers: {
    publisher: string;
    publisherName: string;
    publisherLogo?: string;
    mission_type?: string;
    moderator?: boolean;
  }[];
  excludeOrganisations: string[];
  description: string;
  lead: string;
  deleted_at: Date;
  created_at: Date;
  updated_at: Date;
  lastFetchAt: Date;
  acceptedCount: number;
  refusedCount: number;
};

export interface Report {
  _id: Schema.Types.ObjectId;
  name: string;
  month: number;
  year: number;
  url: string | null;
  objectName: string | null;
  publisherId: string;
  publisherName: string;
  sent: boolean;
  sentAt: Date | null;
  sentTo: string[];
  dataTemplate: "BOTH" | "RECEIVE" | "SEND";
  data: StatsReport;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatsReport {
  publisherId: string;
  publisherName: string;
  publisherLogo: string;
  month: number;
  monthName: string;
  year: number;
  id: string;
  receive: {
    hasStats: boolean;
    print: number;
    printLastMonth: number;
    click: number;
    clickLastMonth: number;
    clickYear: number;
    clickLastYear: number;
    apply: number;
    applyLastMonth: number;
    applyYear: number;
    applyLastYear: number;
    account: number;
    accountLastMonth: number;
    topPublishers: {
      key: string;
      doc_count: number;
    }[];
    topOrganizations: {
      key: string;
      doc_count: number;
    }[];
    graphYears: {
      month: Date;
      click: number;
      clickLastYear: number;
      apply: number;
      applyLastYear: number;
    }[];
    organizationHistogram: {
      month: Date;
      [key: string]: number;
    }[];
  };
  send: {
    hasStats: boolean;
    print: number;
    printLastMonth: number;
    click: number;
    clickLastMonth: number;
    clickYear: number;
    clickLastYear: number;
    apply: number;
    applyLastMonth: number;
    applyYear: number;
    applyLastYear: number;
    account: number;
    accountLastMonth: number;
    topPublishers: {
      key: string;
      doc_count: number;
    }[];
    topOrganizations: {
      key: string;
      doc_count: number;
    }[];
    graphYears: {
      month: Date;
      click: number;
      clickLastYear: number;
      apply: number;
      applyLastYear: number;
    }[];
    organizationHistogram: {
      month: Date;
      [key: string]: number;
    }[];
  };
}

export type RequestWidget = {
  _id: Schema.Types.ObjectId;
  widgetId: Schema.Types.ObjectId;
  query: object;
  total: number;
  missions: string[];
  createdAt: Date;
};

export type Request = {
  _id: Schema.Types.ObjectId;
  route: string;
  query: object;
  params: object;
  method: "GET" | "POST" | "PUT" | "DELETE";
  key: string;
  header: object;
  body: object;
  status: number;
  code: string;
  message: string;
  total: number;
  createdAt: Date;
};

export type User = {
  _id: Schema.Types.ObjectId;
  firstname: string;
  lastname: string;
  publishers: string[];
  email: string;
  password: string | null;
  deleted: boolean;
  created_at: Date;
  updated_at: Date;
  last_activity_at: Date;
  last_login_at: Date;
  login_at: Date[];
  forgot_password_reset_token: string | null;
  forgot_password_reset_expires: Date | null;
  role: "user" | "admin";
  invitationToken: string | null;
  invitationExpiresAt: Date | null;
  invitationCompletedAt: Date | null;
  comparePassword: (password: string) => Promise<boolean>;
};

export interface Stats {
  _id: string;
  clickUser?: string;
  clickId?: string;
  requestId?: string;
  origin: string;
  referer: string;
  userAgent: string;
  host: string;
  user?: string;
  createdAt: Date;
  fromPublisherId: string;
  fromPublisherName: string;
  toPublisherId: string;
  toPublisherName: string;
  missionId?: string;
  missionClientId?: string;
  missionDomain?: string;
  missionTitle?: string;
  missionPostalCode?: string;
  missionDepartmentName?: string;
  missionOrganizationId?: string;
  missionOrganizationName?: string;
  source: "api" | "widget" | "campaign" | "seo" | "jstag" | "publisher";
  sourceId: string;
  sourceName: string;
  tag?: string;
  type: "print" | "apply" | "click" | "account";
  status: "PENDING" | "VALIDATED" | "CANCEL" | "CANCELED" | "REFUSED" | "CARRIED_OUT" | undefined;
}

export type View = {
  _id?: string;
  url?: string;
  // old
  viewId?: string;
  name?: string;
  identifier?: string;
  created_at?: Date;
  sourceType?: string;
  // new
  requestId?: string;
  clickId?: string;
  source?: string;
  sourceId?: string;
  sourceName?: string;
  host?: string;
  origin?: string;
  missionId?: string;
  missionClientId?: string;
  missionDomain?: string;
  missionTitle?: string;
  missionPostalCode?: string;
  missionDepartmentName?: string;
  missionOrganizationName?: string;
  missionOrganizationId?: string;
  toPublisherId?: string;
  toPublisherName?: string;
  fromPublisherId?: string;
  fromPublisherName?: string;
  referer?: string;
  user?: string;
  createdAt?: Date;
  type?: string;
  tag?: string;
};

export type Impression = {
  _id?: string;
  fromPublisherId?: string;
  fromPublisherName?: string;
  host?: string;
  missionClientId?: string;
  missionDeparmentCode?: string;
  missionDepartmentName?: string;
  missionDomain?: string;
  missionId?: string;
  missionOrganizationId?: string;
  missionOrganizationName?: string;
  missionPostalCode?: string;
  missionTitle?: string;
  origin?: string;
  referer?: string;
  requestId?: string;
  sourceId?: string;
  sourceName?: string;
  sourceType?: string;
  tag?: string;
  toPublisherId?: string;
  toPublisherName?: string;
  type?: string;
  user?: string;
  createdAt?: Date;
};

export type Account = {
  _id?: string;
  fromPublisherId?: string;
  fromPublisherName?: string;
  host?: string;
  identifier?: string;
  missionClientId?: string;
  missionDepartmentName?: string;
  missionDomain?: string;
  missionId?: string;
  missionOrganizationId?: string;
  missionOrganizationName?: string;
  missionPostalCode?: string;
  missionTitle?: string;
  name?: string;
  referrer?: string;
  referrerUrl?: string;
  source?: string;
  toPublisherId?: string;
  toPublisherName?: string;
  type?: string;
  url?: string;
  user?: string;
  viewId?: string;
  created_at?: Date;
};

export type Warning = {
  _id: Schema.Types.ObjectId;
  type: string;
  title: string;
  description: string;
  publisherId: string;
  publisherName: string;
  publisherLogo: string;
  seen: boolean;
  fixed: boolean;
  fixedAt: Date;
  occurrences: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Widget = {
  _id: Schema.Types.ObjectId;
  name: string;
  color: string;
  style: "carousel" | "page";
  type: "benevolat" | "volontariat";
  location: {
    lat: number;
    lon: number;
    city: string;
    label: string;
    postcode: string;
    name: string;
  } | null;
  distance: string;
  rules: { field: string; operator: string; value: string; combinator: "and" | "or"; fieldType?: string }[];
  publishers: string[];
  display: "full" | "line";
  url: string;
  jvaModeration: boolean;
  fromPublisherId: string;
  fromPublisherName: string;
  active: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type EsQuery = {
  bool: {
    must: any[] | { [key: string]: any };
    must_not: any[] | { [key: string]: any };
    should: any[] | { [key: string]: any };
    filter: any[] | { [key: string]: any };
    minimum_should_match?: number;
  };
};

export interface Email {
  _id: Schema.Types.ObjectId;
  raw: BrevoInboundEmail;
  message_id: string;
  in_reply_to?: string;
  from_name: string;
  from_email: string;
  to: { name: string; email: string }[];
  subject: string;
  sent_at: Date;
  raw_text_body?: string;
  raw_html_body?: string;
  md_text_body: string;
  attachments: { name: string; content_type: string; content_length: number; content_id: string; token: string; url: string }[];

  status: "PENDING" | "PROCESSED" | "FAILED";
  report_url: string | null;
  file_object_name: string | null;
  date_from: Date | null;
  date_to: Date | null;
  created_count: number | null;
  failed: any | null;

  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
