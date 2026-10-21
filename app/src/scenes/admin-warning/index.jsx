import { Route, Routes, useLocation } from "react-router-dom";

import Tabs from "@/components/Tabs";
import AlertDetail from "@/scenes/admin-warning/components/AlertDetail";
import Alerts from "@/scenes/admin-warning/components/Alerts";
import Bots from "@/scenes/admin-warning/components/Bots";

const Index = () => {
  const { pathname } = useLocation();
  const isBots = pathname.startsWith("/admin-warning/bots");
  const tabs = [
    { key: "alerts", label: "Alertes", to: "/admin-warning", isActive: !isBots },
    { key: "bots", label: "Bots", to: "/admin-warning/bots", isActive: isBots },
  ].map((tab) => ({ ...tab, id: `admin-warning-tab-${tab.key}` }));
  const activeTab = tabs.find((tab) => tab.isActive);

  return (
    <div className="space-y-12">
      <title>API Engagement - Alertes - Administration</title>
      <h1 className="text-4xl font-bold">Alertes</h1>
      <div>
        <Tabs tabs={tabs} ariaLabel="Alertes" panelId="admin-warning-panel" className="flex items-center gap-4 pl-4 font-semibold text-black" variant="primary" />
        <section id="admin-warning-panel" role="tabpanel" aria-labelledby={activeTab.id} className="bg-white p-4 shadow-lg sm:p-8">
          <Routes>
            <Route path="/" element={<Alerts />} />
            <Route path="/alerts/:id" element={<AlertDetail />} />
            <Route path="/bots" element={<Bots />} />
          </Routes>
        </section>
      </div>
    </div>
  );
};

export default Index;
