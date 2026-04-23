import { Route, Routes, useLocation } from "react-router-dom";

import Tabs from "@/components/Tabs";
import Annonceur from "./Annonceur";
import Apercu from "./Apercu";
import Diffuseur from "./Diffuseur";

const Index = () => {
  const location = useLocation();
  const currentRoute = location.pathname.split("/admin-stats")[1]?.replace("/", "") || "";

  const tabs = [
    { key: "apercu", label: "Aperçu", route: "", isActive: currentRoute === "" },
    { key: "diffuseur", label: "Diffuseurs", route: "diffuseur", isActive: currentRoute === "diffuseur" },
    { key: "annonceur", label: "Annonceurs", route: "annonceur", isActive: currentRoute === "annonceur" },
  ].map((tab) => ({
    ...tab,
    id: `admin-stats-tab-${tab.key}`,
    to: `/admin-stats/${tab.route}`,
  }));

  const activeTab = tabs.find((tab) => tab.isActive) || tabs[0];

  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Statistiques</h1>

      <div>
        <Tabs tabs={tabs} ariaLabel="Statistiques" panelId="admin-stats-panel" className="flex items-center gap-4 pl-4 font-semibold text-black" variant="primary" />
        <section id="admin-stats-panel" role="tabpanel" aria-labelledby={activeTab?.id} className="bg-white shadow-lg">
          <Routes>
            <Route index element={<Apercu />} />
            <Route path="diffuseur" element={<Diffuseur />} />
            <Route path="annonceur" element={<Annonceur />} />
          </Routes>
        </section>
      </div>
    </div>
  );
};

export default Index;
