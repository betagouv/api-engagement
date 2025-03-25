import importPartners from "./partner";
import importUsers from "./user";
import importCampaigns from "./campaign";
import importWidgets from "./widget";
import importOrganizations from "./organization";
import importMissions from "./mission";
import importModerationEvents from "./moderation-event";
import importImports from "./import";
import importImpressions from "./print";
import importClicks from "./click";
import importApplies from "./apply";
import importAccounts from "./account";
import importRequestWidgets from "./widget-query";
import importLoginHistory from "./login-history";
import importKpi from "./kpi";
import { postMessage } from "../../services/slack";
import { SLACK_CRON_CHANNEL_ID } from "../../config";

const handler = async () => {
  const stats = {
    partners: { created: 0, updated: 0 },
    users: { created: 0, updated: 0 },
    campaigns: { created: 0, updated: 0 },
    widgets: { created: 0, updated: 0 },
    organizations: { created: 0, updated: 0 },
    missions: { created: 0, updated: 0 },
    moderation_events: { created: 0, updated: 0 },
    organization_name_matches: { created: 0, updated: 0 },
    imports: { created: 0, updated: null },
    prints: { created: 0, updated: null },
    clicks: { created: 0, updated: null },
    applies: { created: 0, updated: null },
    accounts: { created: 0, updated: 0 },
    requests: { created: 0, updated: null },
    login_history: { created: 0, updated: null },
    kpi: { created: 0, updated: null },
  };

  const partners = await importPartners();
  stats.partners.created += partners?.created || 0;
  stats.partners.updated += partners?.updated || 0;
  const users = await importUsers();
  stats.users.created += users?.created || 0;
  stats.users.updated += users?.updated || 0;
  const campaigns = await importCampaigns();
  stats.campaigns.created += campaigns?.created || 0;
  stats.campaigns.updated += campaigns?.updated || 0;
  const widgets = await importWidgets();
  stats.widgets.created += widgets?.created || 0;
  stats.widgets.updated += widgets?.updated || 0;
  const organizations = await importOrganizations();
  stats.organizations.created += organizations?.created || 0;
  stats.organizations.updated += organizations?.updated || 0;
  const missions = await importMissions();
  stats.missions.created += missions?.created || 0;
  stats.missions.updated += missions?.updated || 0;
  const moderation_events = await importModerationEvents();
  stats.moderation_events.created += moderation_events?.created || 0;
  stats.moderation_events.updated += moderation_events?.updated || 0;
  const impressions = await importImpressions();
  stats.prints.created += impressions?.created || 0;
  const clicks = await importClicks();
  stats.clicks.created += clicks?.created || 0;
  const applies = await importApplies();
  stats.applies.created += applies?.created || 0;
  const accounts = await importAccounts();
  stats.accounts.created += accounts?.created || 0;
  stats.accounts.updated += accounts?.updated || 0;
  const imports = await importImports();
  stats.imports.created += imports?.created || 0;
  const requests = await importRequestWidgets();
  stats.requests.created += requests?.created || 0;
  const login_history = await importLoginHistory();
  stats.login_history.created += login_history?.created || 0;
  const kpi = await importKpi();
  stats.kpi.created += kpi?.created || 0;

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
    SLACK_CRON_CHANNEL_ID,
  );
  return stats;
};

export default { handler };
