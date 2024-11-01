export interface PgPartner {
  id: string;
  old_id: string;
  name: string;
  diffuseur_api: boolean;
  diffuseur_widget: boolean;
  diffuseur_campaign: boolean;
  annonceur: boolean;
  api_key: string;
  partners: string[];
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// To try
export interface PgPartnerRelation extends PgPartner {
  missions?: PgMission[];
  annonceur_widget?: PgWidget[];
  diffuseur_widgets?: PgWidget[];
  annonceur_campaigns?: PgCampaign[];
  diffuseur_campaigns?: PgCampaign[];
  users?: PgUser[];
  imports?: PgImport[];
  apply_from?: PgApply[];
  apply_to?: PgApply[];
  click_from?: PgClick[];
  click_to?: PgClick[];
  account_from?: PgAccount[];
  account_to?: PgAccount[];
  impression_from?: PgImpression[];
  impression_to?: PgImpression[];
}

export interface PgMission {
  id: string;
  old_id: string;

  client_id: string | undefined;
  title: string | undefined;
  description: string | undefined;
  description_html: string | undefined;
  tags: string[];
  tasks: string[];
  audience: string[];
  soft_skills: string[];
  close_to_transport: string | undefined;
  reduced_mobility_accessible: string | undefined;
  open_to_minors: string | undefined;
  remote: string | undefined;
  schedule: string | undefined;
  duration: number | undefined;
  posted_at: Date | undefined;
  start_at: Date | undefined;
  end_at: Date | undefined;
  priority: string | undefined;
  places: number | undefined;
  metadata: string | undefined;
  domain: string;
  activity: string | undefined;
  type: "benevolat" | "volontariat";
  snu: Boolean | undefined;
  snu_places: number | undefined;

  address: string | undefined;
  city: string | undefined;
  postal_code: string | undefined;
  department_name: string | undefined;
  department_code: string | undefined;
  region: string | undefined;
  country: string | undefined;
  latitude: number | null;
  longitude: number | null;
  geoloc_status: string | undefined;

  organization_id: string | undefined;
  organization_url: string | undefined;
  organization_name: string | undefined;
  organization_logo: string | undefined;
  organization_client_id: string | undefined;
  organization_description: string | undefined;
  organization_rna: string | undefined;
  organization_siren: string | undefined;
  organization_full_address: string | undefined;
  organization_city: string | undefined;
  organization_department: string | undefined;
  organization_postal_code: string | undefined;
  organization_status_juridique: string | undefined;
  organization_beneficiaries: string[];
  organization_reseaux: string[];
  organization_actions: string[];

  // Later add association table in the database
  association_id: string | undefined;
  association_rna: string | undefined;
  rna_status: string | undefined;

  partner_id: string;
  last_sync_at: Date | undefined;
  status: string | undefined;
  status_comment: string | undefined;

  jva_moderation_status: string | undefined;
  jva_moderation_comment: string | undefined;
  jva_moderation_title: string | undefined;
  jva_moderation_updated_at: Date | undefined;

  leboncoin_moderation_status: string | undefined;
  leboncoin_moderation_comment: string | undefined;
  leboncoin_moderation_url: string | undefined;
  leboncoin_moderation_updated_at: Date | undefined;

  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PgMissionRelation extends PgMission {
  partner?: PgPartner;
  impressions?: PgImpression[];
  clicks?: PgClick[];
  applies?: PgApply[];
  accounts?: PgAccount[];
  widget_query?: PgWidgetQuery[];
}

export interface PgMissionRelation extends PgMission {
  partner?: PgPartner;
  impressions?: PgImpression[];
  clicks?: PgClick[];
  applies?: PgApply[];
  accounts?: PgAccount[];
  widget_query?: PgWidgetQuery[];
}

export interface PgWidget {
  id: string;
  name: string;
  old_id: string;
  diffuseur_id: string;
  mission_type: "benevolat" | "volontariat";
  active: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  // annonceur?: PgPartner[];
  // diffuseur?: PgPartner;
  // impressions?: PgImpression[];
  // applies?: PgApply[];
  // clicks?: PgClick[];
  // accounts?: PgAccount[];
  // query?: PgWidgetQuery[];
}

export interface PgWidgetRelation extends PgWidget {
  annonceur?: PgPartner[];
  diffuseur?: PgPartner;
  impressions?: PgImpression[];
  applies?: PgApply[];
  clicks?: PgClick[];
  accounts?: PgAccount[];
  query?: PgWidgetQuery[];
}

export interface PgCampaign {
  id: string;
  url: string;
  type: string;
  old_id: string;
  name: string;
  diffuseur_id: string;
  annonceur_id: string;
  active: boolean;
  deleted_at: Date;
  reassigned_at: Date;
  reassigned_by_user_id: string;
  reassigned_by_user_name: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  // diffuseur?: PgPartner;
  // annonceur?: PgPartner;
  // clicks?: PgClick[];
  // applies?: PgApply[];
  // impressions?: PgImpression[];
  // accounts?: PgAccount[];
}

export interface PgCampaignRelation extends PgCampaign {
  diffuseur?: PgPartner;
  annonceur?: PgPartner;
  clicks?: PgClick[];
  applies?: PgApply[];
  impressions?: PgImpression[];
  accounts?: PgAccount[];
}

export interface PgImpression {
  id: string;
  mission_id: string;
  to_partner_id: string;
  from_partner_id: string;
  created_at: Date;
  updated_at: Date;
  campaign_id: string;
  widget_id: string;
  host: string;
  source: "api" | "widget" | "campaign";
  source_id: string;
  old_id: string;
  // to_partner?: PgPartner;
  // from_partner?: PgPartner;
  // campaign?: PgCampaign;
  // widget?: PgWidget;
  // mission?: PgMission;
}

export interface PgImpressionRelation extends PgImpression {
  to_partner?: PgPartner;
  from_partner?: PgPartner;
  campaign?: PgCampaign;
  widget?: PgWidget;
  mission?: PgMission;
}

export interface PgClick {
  id: string;
  old_id: string;
  mission_id: string;
  campaign_id: string;
  widget_id: string;
  source: "api" | "widget" | "campaign" | "seo" | "jstag";
  source_id: string;
  host: string;
  from_partner_id: string;
  to_partner_id: string;
  tag: string;
  created_at: Date;
  updated_at: Date;
  // mission?: PgMission;
  // campaign?: PgCampaign;
  // widget?: PgWidget;
  // from_partner?: PgPartner;
  // accounts?: PgAccount[];
  // to_partner?: PgPartner;
  // applies?: PgApply[];
}

export interface PgClickRelation extends PgClick {
  mission?: PgMission;
  campaign?: PgCampaign;
  widget?: PgWidget;
  from_partner?: PgPartner;
  accounts?: PgAccount[];
  to_partner?: PgPartner;
  applies?: PgApply[];
}

export interface PgApply {
  id: string;
  old_id: string;
  mission_id: string;
  created_at: Date;
  updated_at: Date;
  campaign_id: string;
  widget_id: string;
  source: "api" | "widget" | "campaign" | "seo" | "jstag";
  source_id: string;
  host: string;
  from_partner_id: string;
  to_partner_id: string;
  tag: string;
  status: string;
  old_view_id: string;
  click_id: string;
  // click?: PgClick;
  // to_partner?: PgPartner;
  // clicks?: PgClick[];
  // mission?: PgMission;
  // campaign?: PgCampaign;
  // widget?: PgWidget;
  // from_partner?: PgPartner;
}

export interface PgApplyRelation extends PgApply {
  click?: PgClick;
  to_partner?: PgPartner;
  clicks?: PgClick[];
  mission?: PgMission;
  campaign?: PgCampaign;
  widget?: PgWidget;
  from_partner?: PgPartner;
}

export interface PgUser {
  id: string;
  old_id: string;
  forgot_password_reset_token: string;
  role: string;
  password: string;
  email: string;
  last_login_at: Date;
  first_name: string;
  last_name: string;
  invitation_completed_at: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date;
  deleted: boolean;
  // partners?: PgPartner[];
  // login_history?: PgLoginHistory[];
}

export interface PgUserRelation extends PgUser {
  partners?: PgPartner[];
  login_history?: PgLoginHistory[];
}

export interface PgImport {
  id: string;
  old_id: string;
  created_count: number;
  deleted_count: number;
  updated_count: number;
  partner_id: string;
  started_at: Date;
  ended_at: Date;
  // partner?: PgPartner;
}

export interface PgImportRelation extends PgImport {
  partner?: PgPartner;
}

export interface PgAccount {
  id: string;
  old_id: string;
  mission_id: string;
  created_at: Date;
  updated_at: Date;
  campaign_id: string;
  widget_id: string;
  source: "api" | "widget" | "campaign" | "seo" | "jstag";
  source_id: string;
  host: string;
  url: string;
  from_partner_id: string;
  to_partner_id: string;
  old_view_id: string;
  click_id: string;
  tag?: string;
  // mission?: PgMission;
  // campaign?: PgCampaign;
  // widget?: PgWidget;
  // from_partner?: PgPartner;
  // to_partner?: PgPartner;
  // clicks?: PgClick[];
}

export interface PgAccountRelation extends PgAccount {
  mission?: PgMission;
  campaign?: PgCampaign;
  widget?: PgWidget;
  from_partner?: PgPartner;
  to_partner?: PgPartner;
  clicks?: PgClick[];
}

export interface PgWidgetQuery {
  id: string;
  old_id: string;
  widget_id: string;
  domain: string[];
  organization: string[];
  department: string[];
  schedule: string[];
  remote: string[];
  action: string[];
  beneficiary: string[];
  country: string[];
  minor: string[];
  accessibility: string[];
  duration: number;
  start: Date;
  search: string;
  lat: number;
  lon: number;
  size: number;
  from: number;
  created_at: Date;
  // missions?: PgMission[];
  // widget?: PgWidget;
}

export interface PgWidgetQueryRelation extends PgWidgetQuery {
  missions?: PgMission[];
  widget?: PgWidget;
}

export interface PgLoginHistory {
  id: string;
  user_id: string;
  login_at: Date;
  // user?: PgUser;
}

export interface PgLoginHistoryRelation extends PgLoginHistory {
  user?: PgUser;
}
