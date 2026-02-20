import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useSearchParams } from "react-router-dom";

import Tabs from "@/components/Tabs";
import useStore from "@/services/store";

import GlobalAnnounce from "@/scenes/performance/GlobalAnnounce";
import GlobalBroadcast from "@/scenes/performance/GlobalBroadcast";
import Means from "@/scenes/performance/Mean";

const Performance = () => {
  const { flux, publisher } = useStore();
  const publisherId = publisher?.id;
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
    to: `/${publisherId}/performance/${tab.route}`,
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
          <Tabs tabs={tabs} ariaLabel="Performance" panelId="performance-panel" className="flex items-center gap-4 pl-4 font-semibold text-black" variant="primary" />
        </>
      )}

      <section id="performance-panel" role={isTabbed ? "tabpanel" : undefined} aria-labelledby={isTabbed && activeTabId ? activeTabId : undefined} className="bg-white shadow-lg">
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
