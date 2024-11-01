import importPartners from "./partner";
import importUsers from "./user";
import importCampaigns from "./campaign";
import importWidgets from "./widget";
import importMissions from "./mission";
import importImports from "./import";
import importImpressions from "./impression";
import importClicks from "./click";
import importApplies from "./apply";
import importAccounts from "./account";
import importRequestWidgets from "./widget-query";
import importLoginHistory from "./login-history";

const handler = async () => {
  await importPartners();
  await importUsers();
  await importCampaigns();
  await importWidgets();
  await importMissions();
  await importImpressions();
  await importClicks();
  await importApplies();
  await importAccounts();
  await importImports();
  await importRequestWidgets();
  await importLoginHistory();
};

export default { handler };
