import { Schema } from "mongoose";

export interface Association {
  _id?: string;
  rna: string;
  siren?: string;
  siret?: string;
  rup_mi?: string;
  gestion?: string;
  status?: string;
  created_at?: Date;
  last_declared_at?: Date;
  published_at?: Date;
  dissolved_at?: Date;
  updated_at?: Date;
  nature?: string;
  groupement?: string;
  title: string;
  short_title?: string;
  title_slug?: string;
  short_title_slug?: string;
  object?: string;
  social_object1?: string;
  social_object2?: string;
  address_complement?: string;
  address_number: string | undefined;
  address_repetition: string | undefined;
  address_type: string | undefined;
  address_street?: string;
  address_distribution?: string;
  address_insee_code?: string;
  address_postal_code: string | undefined;
  address_department_code: string | undefined;
  address_department_name: string | undefined;
  address_region: string | undefined;
  address_city: string | undefined;
  management_declarant?: string;
  management_complement?: string;
  management_street?: string;
  management_distribution?: string;
  management_postal_code?: string;
  management_city?: string;
  management_country?: string;
  director_civility?: string;
  website?: string;
  observation?: string;
  sync_at?: Date;
  source?: string;
}

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
  publisherId: Schema.Types.ObjectId;
  createdCount: number;
  deletedCount: number;
  updatedCount: number;
  missionCount: number;
  refusedCount: number;
  startedAt: Date;
  endedAt: Date | null;
  status: "SUCCESS" | "FAILED";
  failed: any;
}
export interface Mission {
  _id: Schema.Types.ObjectId | undefined;
  _old_id?: string;
  _old_ids?: string[];

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
  placesStatus: "ATTRIBUTED_BY_API" | "GIVEN_BY_PARTNER";
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

  geoPoint: {
    type: "Point";
    coordinates: [number, number];
  } | null;
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
}

export interface ShortMission {
  _id: string;
  clientId: string;
  address: string;
  city: string;
  statusCode: string;
  postalCode: string;
  location?: {
    lat: number;
    lon: number;
  };
  organizationName: string;
  organizationRNA: string;
  geolocStatus: "ENRICHED_BY_PUBLISHER" | "ENRICHED" | "NOT_FOUND" | "NO_DATA" | "SHOULD_ENRICH" | "FAILED";
  rnaStatus: "ENRICHED_BY_DATA_SUBVENTION" | "ENRICHED" | "NEED_VERIFY" | "NOT_FOUND" | "NO_DATA" | "SHOULD_ENRICH" | "FAILED";
  statusComment: string;
  statusCommentHistoric: {
    status: string;
    comment: string;
    date: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
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

export interface Publisher {
  _id: Schema.Types.ObjectId;
  name: string;
  status: string;
  automated_report: boolean;
  send_report_to: string[];
  mission_type: string;
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
  feed_password: string;
  feed_username: string;
  apikey: string | null;
  lastSyncAt: Date;
  publishers: {
    publisher: string;
    publisherName: string;
    publisherLogo: string;
    mission_type: string;
    moderator: boolean;
  }[];
  description: string;
  lead: string;
  deleted_at: Date;
  created_at: Date;
  updated_at: Date;
  lastFetchAt: Date;
  acceptedCount: number;
  refusedCount: number;
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
      [key: string]: number;
      month: number;
    }[];
  };
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

export type RequestWidget = {
  _id: Schema.Types.ObjectId;
  widgetId: Schema.Types.ObjectId;
  query: any;
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
  clickId?: string;
  requestId?: string;
  origin?: string;
  referer?: string;
  host: string;
  createdAt: Date;
  fromPublisherId: string;
  fromPublisherName: string;
  toPublisherId: string;
  toPublisherName: string;
  missionClientId?: string;
  missionDepartmentName?: string;
  missionDomain?: string;
  missionId?: string;
  missionOrganizationId?: string;
  missionOrganizationName?: string;
  missionPostalCode?: string;
  missionTitle?: string;
  source: "api" | "widget" | "campaign" | "seo" | "jstag" | "publisher";
  sourceId: string;
  sourceName: string;
  tag?: string;
  type: "print" | "apply" | "click" | "view";
  user?: string;
  status?: string;
}

export interface Kpi {
  _id: Schema.Types.ObjectId;

  date: Date;

  availableBenevolatMissionCount: number;
  availableVolontariatMissionCount: number;

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

export interface Warning {
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
}

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

export interface MissionXML {
  id: string;
  title: string;
  description: string;
  image: string;
  clientId: string;
  applicationUrl: string;
  postedAt: string;
  startAt: string;
  endAt: string;
  country: string;
  countryCode: string; // Partner makes errors but we save them cause we're cool
  address: string;
  adresse: string; // Partner makes errors but we save them cause we're cool
  city: string;
  postalCode: string;
  departmentCode: string;
  departmentName: string;
  region: string;
  lonlat: string | undefined; // Old
  lonLat: string | undefined; // Partner makes errors but we save them cause we're cool
  location:
    | {
        lon: number;
        lat: number;
      }
    | undefined;
  activity: string;
  tags: { value: string[] | string } | string;
  domain: string;
  schedule: string;
  audience: { value: string[] | string } | string;
  soft_skills: { value: string[] | string } | string;
  remote: "no" | "possible" | "full";
  reducedMobilityAccessible: string;
  closeToTransport: string;
  openToMinors: string;
  priority: string;
  metadata: string;
  places: number | string;
  organizationName: string;
  organizationRNA: string;
  organizationRna: string; // Partner makes errors but we save them cause we're cool

  organizationSiren: string;
  organizationUrl: string;
  organizationLogo: string;
  organizationDescription: string;
  organizationClientId: string;
  organizationStatusJuridique: string;
  organizationType: string;
  organizationActions: string[];
  organizationId: string;
  organizationFullAddress: string;
  organizationPostCode: string;
  organizationCity: string;
  organizationBeneficiaires: string; // Maybe an error in the doc
  organizationBeneficiaries: string;
  organizationReseaux: { value: string[] | string } | string;

  // Out of the doc
  publicsBeneficiaires: { value: string[] | string } | string;
  publicBeneficiaries: { value: string[] | string } | string;
  snu: "yes" | "no";
  snuPlaces: number | string | undefined;
  keyActions: string | undefined;
  isAutonomy: "yes" | "no" | undefined;
  autonomyZips:
    | {
        item: {
          zip: string;
          city: string;
          latitude: string;
          longitude: string;
        }[];
      }
    | undefined;
  parentOrganizationName: string;
}

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

  status: "PENDING" | "PROCESSED" | "FAILED" | "DUPLICATE";
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
