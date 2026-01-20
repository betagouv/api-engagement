import { Route, Routes, useLocation } from "react-router-dom";

import Publishers from "./Publishers";
import Users from "./Users";
import Tabs from "../../components/Tabs";

const Index = () => {
  const location = useLocation();
  const currentRoute = location.pathname.split("/admin-account")[1].split("/")[1] || "";
  const tabs = [
    {
      key: "users",
      label: "Utilisateurs",
      route: "",
      isActive: currentRoute === "",
    },
    {
      key: "publishers",
      label: "Partenaires",
      route: "publishers",
      isActive: currentRoute === "publishers",
    },
  ].map((tab) => ({
    ...tab,
    id: `admin-account-tab-${tab.key}`,
    to: `/admin-account/${tab.route}`,
  }));
  const activeTab = tabs.find((tab) => tab.isActive) || tabs[0];
  const activeTabId = activeTab ? activeTab.id : null;

  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Liste des comptes de l'API Engagement</h1>

      <div>
        <Tabs
          tabs={tabs}
          ariaLabel="Liste des comptes de l'API Engagement"
          panelId="admin-account-panel"
          className="flex items-center gap-4 pl-4 font-semibold text-black"
          getTabClassName={(tab) =>
            `${
              tab.isActive ? "border-blue-france text-blue-france hover:bg-gray-975 border-t-2 bg-white" : "bg-blue-france-925 hover:bg-blue-france-925-hover border-0"
            } border-x-grey-border flex translate-y-px items-center border-x px-4 py-2`
          }
        />
        <section id="admin-account-panel" role="tabpanel" aria-labelledby={activeTabId || undefined} className="bg-white shadow-lg">
          <Routes>
            <Route path="/" element={<Users />} />
            <Route path="/publishers" element={<Publishers />} />
          </Routes>
        </section>
      </div>
    </div>
  );
};

export default Index;
