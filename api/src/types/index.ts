import { Schema } from "mongoose";
import { BrevoInboundEmail } from "./brevo";

export interface Organization {
  _id: Schema.Types.ObjectId;
  esId: string;
  rna: string;
  siren?: string;
  siret?: string;
  sirets?: string[];
  rupMi?: string;
  gestion?: string;
  status?: string;
  createdAt?: Date;
  lastDeclaredAt?: Date;
  publishedAt?: Date;
  dissolvedAt?: Date;
  updatedAt: Date;
  nature?: string;
  groupement?: string;
  title: string;
  names: string[];
  shortTitle?: string;
  titleSlug?: string;
  shortTitleSlug?: string;
  object?: string;
  socialObject1?: string;
  socialObject2?: string;
  addressComplement?: string;
  addressNumber: string | undefined;
  addressRepetition: string | undefined;
  addressType: string | undefined;
  addressStreet?: string;
  addressDistribution?: string;
  addressInseeCode?: string;
  addressPostalCode: string | undefined;
  addressDepartmentCode: string | undefined;
  addressDepartmentName: string | undefined;
  addressRegion: string | undefined;
  addressCity: string | undefined;
  managementDeclarant?: string;
  managementComplement?: string;
  managementStreet?: string;
  managementDistribution?: string;
  managementPostalCode?: string;
  managementCity?: string;
  managementCountry?: string;
  directorCivility?: string;
  website?: string;
  observation?: string;
  syncAt?: Date;
  source?: string;
  isRUP?: boolean;
  letudiantPublicId?: string;
  letudiantUpdatedAt?: Date;
}

export type GeolocStatus = "ENRICHED_BY_PUBLISHER" | "ENRICHED_BY_API" | "NOT_FOUND" | "NO_DATA" | "SHOULD_ENRICH" | "FAILED";

export type AddressItem = {
  _id?: Schema.Types.ObjectId;
  street: string;
  postalCode: string;
  departmentName: string;
  departmentCode: string;
  city: string;
  region: string;
  country: string;
  location: {
    lat: number;
    lon: number;
  } | null;
  geoPoint: GeoPoint | null;
  geolocStatus: GeolocStatus;
};

export type GeoPoint = {
  type: string;
  coordinates: number[];
};

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

export interface Import {
  _id: Schema.Types.ObjectId;
  name: string;
  publisherId: Schema.Types.ObjectId | string;
  createdCount: number;
  deletedCount: number;
  updatedCount: number;
  missionCount: number;
  refusedCount: number;
  startedAt: Date;
  endedAt: Date | null;
  status: "SUCCESS" | "FAILED";
  error: string | null;
  failed: any;
}

export interface MissionHistory {
  date: Date;
  state: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MissionEvent {
  _id: Schema.Types.ObjectId;
  type: "create" | "update" | "delete";
  missionId: Schema.Types.ObjectId;
  changes: Record<string, { previous: any; current: any }> | null;
  createdAt: Date;
  createdBy?: Schema.Types.ObjectId; // User
  // PG export
  lastExportedToPgAt: Date | null;
}

export interface Mission {
  _id?: Schema.Types.ObjectId;

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
  audience: string[];

  softSkills: string[];
  requirements: string[];
  romeSkills: string[];
  organizationClientId: string;
  organizationUrl: string;
  organizationName: string;
  organizationRNA: string;
  organizationSiren: string;
  organizationSiret: string;
  organizationType: string;
  organizationLogo: string;
  organizationDescription: string;
  organizationFullAddress: string;
  organizationDepartment: string;
  organizationPostCode: string;
  organizationCity: string;
  organizationStatusJuridique: string;
  organizationBeneficiaries: string[];
  organizationActions: string[];
  organizationReseaux: string[];

  organizationId: string | null;
  organizationNameVerified: string;
  organizationRNAVerified: string;
  organizationSirenVerified: string;
  organizationSiretVerified: string;
  organizationAddressVerified: string;
  organizationCityVerified: string;
  organizationPostalCodeVerified: string;
  organizationDepartmentCodeVerified: string;
  organizationDepartmentNameVerified: string;
  organizationRegionVerified: string;
  organisationIsRUP: boolean;
  organizationVerificationStatus: string;

  associationId: string | undefined;
  associationName: string | undefined;
  associationSiret: string | undefined;
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
  priority: string;
  metadata: string;
  endAt: Date | null;
  duration: number | null;
  address: string;
  postalCode: string;
  departmentName: string;
  departmentCode: string;
  city: string;
  region: string;
  country: string;
  geolocStatus: "ENRICHED_BY_PUBLISHER" | "ENRICHED_BY_API" | "NOT_FOUND" | "NO_DATA" | "SHOULD_ENRICH" | "FAILED";
  rnaStatus: "ENRICHED_BY_DATA_SUBVENTION" | "ENRICHED" | "NEED_VERIFY" | "NOT_FOUND" | "NO_DATA" | "SHOULD_ENRICH" | "FAILED";
  places: number;
  placesStatus: "ATTRIBUTED_BY_API" | "GIVEN_BY_PARTNER";
  domain: string;
  domainLogo: string;
  type: string;
  activity: string;
  location: {
    lat: number;
    lon: number;
  } | null;

  geoPoint: GeoPoint | null;
  addresses: AddressItem[];

  snu: boolean;
  snuPlaces: number | null;
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

  letudiantPublicId: { [key: string]: string } | undefined;
  letudiantUpdatedAt: Date | undefined;
  letudiantError: string | undefined;

  lastExportedToPgAt: Date | null;

  // Deprecated fields
  domainOriginal: string | undefined;
  __history?: MissionHistory[];
  soft_skills: string[];
  adresse: string | undefined;
  tasks: string[];
  _old_id?: string;
  _old_ids?: string[];
}

export type ModerationEvent = {
  _id: Schema.Types.ObjectId;
  missionId: string;
  moderatorId: string;
  initialStatus: "ACCEPTED" | "REFUSED" | "PENDING" | "ONGOING" | null;
  newStatus: "ACCEPTED" | "REFUSED" | "PENDING" | "ONGOING" | null;
  initialComment: string | null;
  newComment: string | null;
  initialNote: string | null;
  newNote: string | null;
  initialTitle: string | null;
  newTitle: string | null;
  userId: string | null;
  userName: string | null;
  initialSiren: string | null;
  newSiren: string | null;
  initialRNA: string | null;
  newRNA: string | null;
  createdAt: Date;
};

export interface Publisher {
  _id: Schema.Types.ObjectId;
  name: string;
  lead: string;
  category: string | null;
  url: string;
  email: string;
  logo: string;
  documentation: string;
  description: string;

  missionType: string | null;
  feed: string;
  feedUsername: string;
  feedPassword: string;

  isAnnonceur: boolean;
  hasApiRights: boolean;
  hasWidgetRights: boolean;
  hasCampaignRights: boolean;

  moderator: boolean;
  moderatorLink: string;
  apikey: string | null;
  broadcasters: string[];
  publishers: Diffuseur[];

  sendReport: boolean;
  sendReportTo: string[];

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Diffuseur {
  _id?: Schema.Types.ObjectId;
  publisherId: string;
  publisherName: string;
  moderator: boolean;
  missionType: string | null;
}

export interface OrganizationExclusion {
  _id?: Schema.Types.ObjectId;
  excludedByPublisherId: string;
  excludedByPublisherName: string;

  excludedForPublisherId: string;
  excludedForPublisherName: string;

  organizationClientId: string;
  organizationName: string;

  createdAt: Date;
  updatedAt: Date;
}

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
      month: number;
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
      month: number;
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

export interface User {
  _id: Schema.Types.ObjectId;
  firstname: string;
  lastname: string | undefined;
  publishers: string[];
  email: string;
  password: string | null;
  role: "user" | "admin";
  invitationToken: string | null;
  invitationExpiresAt: Date | null;
  invitationCompletedAt: Date | null;

  comparePassword: (password: string) => Promise<boolean>;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  lastActivityAt: Date | null;
  loginAt: Date[] | null;
  forgotPasswordToken: string | null;
  forgotPasswordExpiresAt: Date | null;

  brevoContactId: number | null;
}

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
  isBot: boolean;
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
  missionOrganizationClientId?: string;
  source: "api" | "widget" | "campaign" | "seo" | "jstag" | "publisher";
  sourceId: string;
  sourceName: string;
  tag?: string;
  tags?: string[];
  type: "print" | "apply" | "click" | "account";
  status: "PENDING" | "VALIDATED" | "CANCEL" | "CANCELED" | "REFUSED" | "CARRIED_OUT" | undefined;
}

export type StatsBot = {
  _id: Schema.Types.ObjectId;
  origin?: string;
  referer?: string;
  userAgent?: string;
  host?: string;
  user: string;
  createdAt: Date;
  updatedAt: Date;
};

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

export interface WarningBot {
  _id: Schema.Types.ObjectId;
  hash: string;
  userAgent: string;
  printCount: number;
  clickCount: number;
  applyCount: number;
  accountCount: number;
  publisherId: string;
  publisherName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Widget {
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
  rules: {
    field: string;
    operator: string;
    value: string;
    combinator: "and" | "or";
    fieldType?: string;
  }[];
  publishers: string[];
  url: string;
  jvaModeration: boolean;
  fromPublisherId: string;
  fromPublisherName: string;
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ImportRna = {
  _id: Schema.Types.ObjectId;

  year: number;
  month: number;
  resourceId: string;
  resourceCreatedAt: Date;
  resourceUrl: string;
  count: number;
  startedAt: Date;
  endedAt: Date;
  status: string;
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
  messageId: string;
  inReplyTo?: string;
  fromName: string;
  fromEmail: string;
  to: { name: string; email: string }[];
  subject: string;
  sentAt: Date;
  rawTextBody?: string;
  rawHtmlBody?: string;
  mdTextBody: string;
  attachments: {
    name: string;
    contentType: string;
    contentLength: number;
    contentId: string;
    token: string;
    url: string;
  }[];

  status: "PENDING" | "PROCESSED" | "FAILED" | "DUPLICATE";
  reportUrl: string | null;
  fileObjectName: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  createdCount: number | null;
  failed: any | null;

  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Kpi {
  _id: Schema.Types.ObjectId;

  date: Date;

  availableBenevolatMissionCount: number;
  availableVolontariatMissionCount: number;

  availableJvaMissionCount: number;

  availableBenevolatGivenPlaceCount: number;
  availableVolontariatGivenPlaceCount: number;

  availableBenevolatAttributedPlaceCount: number;
  availableVolontariatAttributedPlaceCount: number;

  percentageBenevolatGivenPlaces: number;
  percentageVolontariatGivenPlaces: number;

  percentageBenevolatAttributedPlaces: number;
  percentageVolontariatAttributedPlaces: number;

  benevolatPrintMissionCount: number;
  volontariatPrintMissionCount: number;

  benevolatClickMissionCount: number;
  volontariatClickMissionCount: number;

  benevolatApplyMissionCount: number;
  volontariatApplyMissionCount: number;

  benevolatAccountMissionCount: number;
  volontariatAccountMissionCount: number;

  benevolatPrintCount: number;
  volontariatPrintCount: number;

  benevolatClickCount: number;
  volontariatClickCount: number;

  benevolatApplyCount: number;
  volontariatApplyCount: number;

  benevolatAccountCount: number;
  volontariatAccountCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export enum MissionType {
  BENEVOLAT = "benevolat",
  VOLONTARIAT = "volontariat-service-civique",
}
