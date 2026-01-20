import { Route, Routes, useLocation } from "react-router-dom";

import useStore from "../../services/store";
import Tabs from "../../components/Tabs";
import Flux from "./Flux";
import RealTime from "./RealTime";
import TrackingAnnounce from "./TrackingAnnounce";
import TrackingBroadcast from "./TrackingBroadcast";

const Settings = () => {
  const { flux } = useStore();
  const location = useLocation();
  const currentRoute = location.pathname.split("/settings")[1].replace("/", "");
  const tabs = [
    {
      key: "flux",
      label: "Flux de missions",
      route: "",
      isActive: currentRoute === "",
    },
    {
      key: "tracking",
      label: "Tracking des événements",
      route: "tracking",
      isActive: currentRoute === "tracking",
    },
    {
      key: "real-time",
      label: "Événements en temps réel",
      route: "real-time",
      isActive: currentRoute === "real-time",
    },
  ].map((tab) => ({
    ...tab,
    id: `settings-tab-${tab.key}`,
    to: `/settings/${tab.route}`,
  }));
  const activeTab = tabs.find((tab) => tab.isActive) || tabs[0];
  const activeTabId = activeTab ? activeTab.id : null;

  if (flux === "from")
    return (
      <div className="space-y-12">
        <title>API Engagement - Paramètres de tracking</title>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Paramètres de tracking</h1>
          <p className="text-text-mention text-base">
            Suivez les instructions ci-dessous pour que les impressions de vos liens de campagnes et des missions que vous diffusez par API soient comptabilisées.
          </p>
        </div>
        <TrackingBroadcast />
      </div>
    );

  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Paramètres</h1>
      <div>
        <Tabs
          tabs={tabs}
          ariaLabel="Paramètres"
          panelId="settings-panel"
          className="flex items-center gap-4 pl-4 font-semibold text-black"
          getTabClassName={(tab) =>
            `${
              tab.isActive ? "border-blue-france text-blue-france hover:bg-gray-975 border-t-2 bg-white" : "bg-blue-france-925 hover:bg-blue-france-925-hover border-0"
            } border-x-grey-border flex translate-y-px items-center border-x px-4 py-2`
          }
        />
        <section id="settings-panel" role="tabpanel" aria-labelledby={activeTabId || undefined} className="bg-white shadow-lg">
          <Routes>
            <Route path="/" element={<Flux />} />
            <Route path="/tracking" element={<TrackingAnnounce />} />
            <Route path="/real-time" element={<RealTime />} />
          </Routes>
        </section>
      </div>
    </div>
  );
};

export default Settings;
