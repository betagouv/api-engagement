import importCampaigns from "./utils/campaign";
import importImports from "./utils/import";
import importKpi from "./utils/kpi";
import importKpiBotless from "./utils/kpi-botless";
import importLoginHistory from "./utils/login-history";
import importModerationEvents from "./utils/moderation-event";
import importOrganizationExclusion from "./utils/organization-exclusion";
import importPartners from "./utils/partner";
import importUsers from "./utils/user";
import importWidgets from "./utils/widget";
import importRequestWidgets from "./utils/widget-query";

import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";

export interface MetabaseJobPayload {
  jobs?: string;
}

export interface MetabaseJobResult extends JobResult {
  stats: {
    [key: string]: {
      created: number;
      updated: number | null;
    };
  };
}
export class MetabaseHandler implements BaseHandler<MetabaseJobPayload, MetabaseJobResult> {
  name = "Export data to Metabase";

  public async handle(payload: MetabaseJobPayload): Promise<MetabaseJobResult> {
    const stats = {
      partners: { created: 0, updated: 0 },
      users: { created: 0, updated: 0 },
      campaigns: { created: 0, updated: 0 },
      widgets: { created: 0, updated: 0 },
      moderation_events: { created: 0, updated: 0 },
      organization_name_matches: { created: 0, updated: 0 },
      organization_exclusion: { created: 0, updated: 0 },
      imports: { created: 0, updated: null },
      requests: { created: 0, updated: null },
      login_history: { created: 0, updated: null },
      kpi: { created: 0, updated: null },
      kpiBotless: { created: 0, updated: null },
    };

    const jobs = payload?.jobs ? payload.jobs.split(",") : null;

    if (jobs === null || jobs.includes("partners")) {
      const partners = await importPartners();
      stats.partners.created += partners?.created || 0;
      stats.partners.updated += partners?.updated || 0;
    }

    if (jobs === null || jobs.includes("organization_exclusion")) {
      const organizationExclusions = await importOrganizationExclusion();
      stats.organization_exclusion.created += organizationExclusions?.created || 0;
      stats.organization_exclusion.updated += organizationExclusions?.updated || 0;
    }

    if (jobs === null || jobs.includes("users")) {
      const users = await importUsers();
      stats.users.created += users?.created || 0;
      stats.users.updated += users?.updated || 0;
    }

    if (jobs === null || jobs.includes("campaigns")) {
      const campaigns = await importCampaigns();
      stats.campaigns.created += campaigns?.created || 0;
      stats.campaigns.updated += campaigns?.updated || 0;
    }

    if (jobs === null || jobs.includes("widgets")) {
      const widgets = await importWidgets();
      stats.widgets.created += widgets?.created || 0;
      stats.widgets.updated += widgets?.updated || 0;
    }

    if (jobs === null || jobs.includes("moderation_events")) {
      const moderationEvents = await importModerationEvents();
      stats.moderation_events.created += moderationEvents?.created || 0;
      stats.moderation_events.updated += moderationEvents?.updated || 0;
    }

    if (jobs === null || jobs.includes("imports")) {
      const imports = await importImports();
      stats.imports.created += imports?.created || 0;
    }

    if (jobs === null || jobs.includes("requests")) {
      const requests = await importRequestWidgets();
      stats.requests.created += requests?.created || 0;
    }

    if (jobs === null || jobs.includes("login_history")) {
      const loginHistory = await importLoginHistory();
      stats.login_history.created += loginHistory?.created || 0;
    }

    if (jobs === null || jobs.includes("kpi")) {
      const kpi = await importKpi();
      stats.kpi.created += kpi?.created || 0;
      const kpiBotless = await importKpiBotless();
      stats.kpiBotless.created += kpiBotless?.created || 0;
    }

    // Send message to slack
    const text = `${Object.entries(stats)
      .map(([key, value]) => `${key}: ${value.created} created${value.updated !== null ? `, ${value.updated} updated` : ""}`)
      .join("\n")}`;

    return {
      stats,
      success: true,
      timestamp: new Date(),
      message: text,
    };
  }
}
