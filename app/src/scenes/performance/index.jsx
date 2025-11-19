import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useSearchParams } from "react-router-dom";

import useStore from "../../services/store";

import GlobalAnnounce from "./GlobalAnnounce";
import GlobalBroadcast from "./GlobalBroadcast";
import Means from "./Mean";

const Performance = () => {
  const { flux } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const defaultTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);

    return {
      from: searchParams.has("from") ? new Date(searchParams.get("from")) : defaultFrom,
      to: searchParams.has("to") ? new Date(searchParams.get("to")) : defaultTo,
    };
  });
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams();
    if (filters.from) query.append("from", filters.from.toISOString());
    if (filters.to) query.append("to", filters.to.toISOString());
    setSearchParams(query);
  }, [filters, location.pathname]);

  return (
    <>
      <title>Au global - Performance - API Engagement</title>
      <h1 className="mb-12 text-4xl font-bold">Votre activité {flux === "from" ? "de diffuseur" : "d'annonceur"}</h1>

      {flux === "from" && (
        <>
          <nav className="flex items-center space-x-4 pl-4 font-semibold text-black">
            <Tab route="" title="Au global" />
            <Tab route="means" title="Moyens de diffusion" />
          </nav>
        </>
      )}

      <section className="bg-white shadow-lg">
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

const Tab = ({ title, route = "" }) => {
  const [active, setActive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const current = location.pathname.split("/performance")[1];
    setActive(route === current.replace("/", ""));
  }, [location]);

  return (
    <Link to={`/performance/${route}`}>
      <div
        className={`${
          active ? "border-blue-france text-blue-france hover:bg-gray-975 border-t-2 bg-white" : "bg-blue-france-925 hover:bg-blue-france-925-hover border-0"
        } flex translate-y-px cursor-pointer items-center border-x border-x-gray-900 px-4 py-2`}
      >
        <p>{title}</p>
      </div>
    </Link>
  );
};

export default Performance;
