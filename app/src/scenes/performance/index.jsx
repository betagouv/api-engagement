import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Route, Routes, useLocation, useSearchParams } from "react-router-dom";

import useStore from "../../services/store";

import Compare from "./Compare";
import GlobalAnnounce from "./GlobalAnnounce";
import GlobalBroadcast from "./GlobalBroadcast";
import Means from "./Mean";
import Mission from "./Mission";

const Performance = () => {
  const { flux } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    from: searchParams.has("from") ? new Date(searchParams.get("from")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 30),
    to: searchParams.has("to") ? new Date(searchParams.get("to")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 0, 0, 0, -1),
  });
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams();
    if (filters.from) query.append("from", filters.from.toISOString());
    if (filters.to) query.append("to", filters.to.toISOString());
    setSearchParams(query);
  }, [filters, location.pathname]);

  return (
    <div className="space-y-12">
      <Helmet>
        <title>Au global - Performance - API Engagement</title>
      </Helmet>
      <h1 className="text-4xl font-bold">Votre activité {flux === "from" ? "de diffuseur" : "d'annonceur"}</h1>

      <div>
        <nav className="flex items-center space-x-4 pl-4 font-semibold text-black">
          <Tab route="" title="Au global" />
          {flux === "to" ? (
            <>
              <Tab route="mission" title="Missions" />
              <Tab route="compare" title="Comparer des périodes" />
            </>
          ) : (
            <>
              <Tab route="mission" title="Missions" />
              <Tab route="means" title="Moyens de diffusion" />
              <Tab route="compare" title="Comparer des périodes" />
            </>
          )}
        </nav>

        <section className="bg-white shadow-lg">
          <Routes>
            <Route
              path="/"
              element={flux === "from" ? <GlobalBroadcast filters={filters} onFiltersChange={setFilters} /> : <GlobalAnnounce filters={filters} onFiltersChange={setFilters} />}
            />
            <Route path="/mission" element={<Mission filters={filters} onFiltersChange={setFilters} />} />
            <Route path="/means" element={<Means filters={filters} onFiltersChange={setFilters} />} />
            <Route path="/compare" element={<Compare filters={filters} onFiltersChange={setFilters} />} />
          </Routes>
        </section>
      </div>
    </div>
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
          active ? "border-t-2 border-blue-france bg-white text-blue-france hover:bg-gray-975" : "border-0 bg-tab-main hover:bg-tab-hover"
        } flex translate-y-px cursor-pointer items-center border-x border-x-gray-900 px-4 py-2`}
      >
        <p>{title}</p>
      </div>
    </Link>
  );
};

export default Performance;
