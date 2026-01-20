import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useSearchParams } from "react-router-dom";

import useStore from "../../services/store";
import Tabs from "../../components/Tabs";

import GlobalAnnounce from "./GlobalAnnounce";
import GlobalBroadcast from "./GlobalBroadcast";
import Means from "./Mean";

const Performance = () => {
  const { flux } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    from: searchParams.has("from") ? new Date(searchParams.get("from")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 30),
    to: searchParams.has("to") ? new Date(searchParams.get("to")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 0, 0, 0, -1),
  });
  const location = useLocation();
  const isTabbed = flux === "from";
  const currentRoute = location.pathname.split("/performance")[1].replace("/", "");
  const tabs = [
    {
      key: "global",
      title: "Au global",
      route: "",
      isActive: currentRoute === "",
    },
    {
      key: "means",
      title: "Moyens de diffusion",
      route: "means",
      isActive: currentRoute === "means",
    },
  ].map((tab) => ({
    ...tab,
    id: `performance-tab-${tab.key}`,
    label: tab.title,
    to: `/performance/${tab.route}`,
  }));
  const activeTab = tabs.find((tab) => tab.isActive) || tabs[0];
  const activeTabId = activeTab ? activeTab.id : null;

  useEffect(() => {
    const query = new URLSearchParams();
    if (filters.from) query.append("from", filters.from.toISOString());
    if (filters.to) query.append("to", filters.to.toISOString());
    setSearchParams(query);
  }, [filters, location.pathname]);

  return (
    <>
      <title>API Engagement - Au global - Performance</title>
      <h1 className="mb-12 text-4xl font-bold">Votre activité {flux === "from" ? "de diffuseur" : "d'annonceur"}</h1>

      {flux === "from" && (
        <>
          <Tabs
            tabs={tabs}
            ariaLabel="Performance"
            panelId="performance-panel"
            className="flex items-center gap-4 pl-4 font-semibold text-black"
            getTabClassName={(tab) =>
              `${
                tab.isActive ? "border-blue-france text-blue-france hover:bg-gray-975 border-t-2 bg-white" : "bg-blue-france-925 hover:bg-blue-france-925-hover border-0"
              } border-x-grey-border flex translate-y-px items-center border-x px-4 py-2`
            }
          />
        </>
      )}

      <section
        id="performance-panel"
        role={isTabbed ? "tabpanel" : undefined}
        aria-labelledby={isTabbed && activeTabId ? activeTabId : undefined}
        className="bg-white shadow-lg"
      >
        <Routes>
          <Route
            path="/"
            element={flux === "from" ? <GlobalBroadcast filters={filters} onFiltersChange={setFilters} /> : <GlobalAnnounce filters={filters} onFiltersChange={setFilters} />}
          />
          <Route path="/means" element={<Means filters={filters} onFiltersChange={setFilters} />} />
        </Routes>
      </section>
    </>
  );
};

export default Performance;
