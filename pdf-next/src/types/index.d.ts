export interface Publisher {
  _id: string;
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
