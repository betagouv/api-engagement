import { SLACK_CRON_CHANNEL_ID } from "../../config";
import { postMessage } from "../../services/slack";
import importAccounts from "./utils/account";
import importApplies from "./utils/apply";
import importCampaigns from "./utils/campaign";
import importClicks from "./utils/click";
import importImports from "./utils/import";
import importKpi from "./utils/kpi";
import importKpiBotless from "./utils/kpi-botless";
import importLoginHistory from "./utils/login-history";
import importModerationEvents from "./utils/moderation-event";
import importOrganizations from "./utils/organization";
import importOrganizationExclusion from "./utils/organization-exclusion";
import importPartners from "./utils/partner";
import importImpressions from "./utils/print";
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
  name = "Sync all data to metabase (PG database)";

  public async handle(payload: MetabaseJobPayload): Promise<MetabaseJobResult> {
    const stats = {
      partners: { created: 0, updated: 0 },
      users: { created: 0, updated: 0 },
      campaigns: { created: 0, updated: 0 },
      widgets: { created: 0, updated: 0 },
      organizations: { created: 0, updated: 0 },
      moderation_events: { created: 0, updated: 0 },
      organization_name_matches: { created: 0, updated: 0 },
      organization_exclusion: { created: 0, updated: 0 },
      imports: { created: 0, updated: null },
      prints: { created: 0, updated: null },
      clicks: { created: 0, updated: null },
      applies: { created: 0, updated: null },
      accounts: { created: 0, updated: 0 },
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

    if (jobs === null || jobs.includes("organizations")) {
      const organizations = await importOrganizations();
      stats.organizations.created += organizations?.created || 0;
      stats.organizations.updated += organizations?.updated || 0;
    }

    if (jobs === null || jobs.includes("moderation_events")) {
      const moderationEvents = await importModerationEvents();
      stats.moderation_events.created += moderationEvents?.created || 0;
      stats.moderation_events.updated += moderationEvents?.updated || 0;
    }

    if (jobs === null || jobs.includes("prints")) {
      const impressions = await importImpressions();
      stats.prints.created += impressions?.created || 0;
      const clicks = await importClicks();
      stats.clicks.created += clicks?.created || 0;
    }

    if (jobs === null || jobs.includes("applies")) {
      const applies = await importApplies();
      stats.applies.created += applies?.created || 0;
      const accounts = await importAccounts();
      stats.accounts.created += accounts?.created || 0;
      stats.accounts.updated += accounts?.updated || 0;
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

    console.log("stats", stats);
    await postMessage(
      {
        title: `Metabase Sync completed`,
        text,
      },
      SLACK_CRON_CHANNEL_ID
    );
    return {
      stats,
      success: true,
      timestamp: new Date(),
    };
  }
}
