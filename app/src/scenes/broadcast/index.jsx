import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import Api from "./Api";
import Campaigns from "./Campaigns";
import Widgets from "./Widgets";

import Tabs from "../../components/Tabs";
import useStore from "../../services/store";
import Moderation from "./moderation";

const Index = () => {
  const { publisher } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const publisherId = publisher?.id || publisher?._id;
  const currentRoute = location.pathname.split("/broadcast")[1].split("/")[1] || "";
  const tabs = [
    publisher.hasApiRights && {
      key: "api",
      label: "Flux par API",
      route: "",
      isActive: currentRoute === "",
    },
    publisher.hasWidgetRights && {
      key: "widgets",
      label: "Widgets",
      route: "widgets",
      isActive: currentRoute === "widgets",
    },
    publisher.hasCampaignRights && {
      key: "campaigns",
      label: "Campagnes",
      route: "campaigns",
      isActive: currentRoute === "campaigns",
    },
    publisher.moderator && {
      key: "moderation",
      label: "Modération",
      route: "moderation",
      isActive: currentRoute === "moderation",
    },
  ]
    .filter(Boolean)
    .map((tab) => ({
      ...tab,
      id: `broadcast-tab-${tab.key}`,
      to: `/${publisherId}/broadcast/${tab.route}`,
    }));
  const activeTab = tabs.find((tab) => tab.isActive) || tabs[0];
  const activeTabId = activeTab ? activeTab.id : null;

  useEffect(() => {
    if (!publisher) return;
    let route = location.pathname.split("/broadcast")[1].split("/")[1] || "";
    if (route === "" && !publisher.hasApiRights) route = "widgets";
    if (route === "widgets" && !publisher.hasWidgetRights) route = "campaigns";
    if (route === "campaigns" && !publisher.hasCampaignRights) route = "moderation";
    if (route === "moderation" && !publisher.moderator) route = "";

    navigate(`/${publisherId}/broadcast/${route}`); // If route didn't change, it will not trigger a re-render, so no infinite loop
  }, [location.pathname]);

  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Diffuser des missions partenaires</h1>

      <div>
        <Tabs
          tabs={tabs}
          ariaLabel="Diffuser des missions partenaires"
          panelId="broadcast-panel"
          className="flex items-center gap-4 pl-4 font-semibold text-black"
          variant="primary"
        />

        <section id="broadcast-panel" role="tabpanel" aria-labelledby={activeTabId || undefined} className="bg-white shadow-lg">
          <Routes>
            <Route path="/" element={<Api />} />
            <Route path="/widgets" element={<Widgets />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/moderation" element={<Moderation />} />
          </Routes>
        </section>
      </div>
    </div>
  );
};

export default Index;
