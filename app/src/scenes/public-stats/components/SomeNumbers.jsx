import { useEffect, useState } from "react";
import { RiQuestionLine } from "react-icons/ri";

import { BarChart } from "../../../components/Chart";
import Loader from "../../../components/Loader";
import { DEPARTMENT_NAMES, MONTHS } from "../../../constants";
import api from "../../../services/api";
import { captureError } from "../../../services/error";

const buildGraphData = (data, dataKey = "Redirections") => {
  const graphData = data.map((item) => ({
    [dataKey]: item.doc_count,
    name: MONTHS[new Date(item.key).getMonth()],
  }));
  return graphData;
};

const SomeNumbers = ({ filters, onFiltersChange }) => {
  const [graphData, setGraphData] = useState({
    clicks: [],
    applies: [],
    organizations: [],
    missions: [],
  });

  const [graphTotal, setGraphTotal] = useState({
    clicks: 0,
    applies: 0,
    organizations: 0,
    missions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.department) query.append("department", filters.department);
        if (filters.type) query.append("type", filters.type);
        if (filters.year) query.append("year", filters.year);

        const promises = [api.get(`/stats-public/graph-stats?${query.toString()}`), api.get(`/stats-public/graph-missions?${query.toString()}`)];
        const [resGraphStats, resGraphMissions] = await Promise.all(promises);
        if (!resGraphStats.ok || !resGraphMissions.ok) throw new Error("Erreur lors de la récupération des statistiques");

        setGraphData({
          clicks: buildGraphData(resGraphStats.data.clicks),
          applies: buildGraphData(resGraphStats.data.applies, "Candidatures"),
          organizations: buildGraphData(resGraphStats.data.organizations, "Organisations"),
          missions: buildGraphData(resGraphMissions.data, "Missions"),
        });
        setGraphTotal({
          clicks: resGraphStats.data.totalClicks,
          applies: resGraphStats.data.totalApplies,
          organizations: resGraphStats.data.totalOrganizations,
          missions: resGraphMissions.total,
        });
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération des statistiques");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters]);

  return (
    <div className="mx-auto my-14 w-4/5 max-w-[1200px] flex-1 border border-gray-border bg-white p-12">
      <div className="flex justify-between">
        <div className="">
          <h2 className="text-3xl font-bold">En quelques chiffres</h2>
        </div>

        <div className="flex">
          <div className="ml-4 flex items-center gap-4">
            <label htmlFor="year" className="sr-only">
              Année
            </label>
            <select id="year" className="input w-48" value={filters.year} onChange={(e) => onFiltersChange({ ...filters, year: parseInt(e.target.value, 10) })}>
              <option value={2020}>2020</option>
              <option value={2021}>2021</option>
              <option value={2022}>2022</option>
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
            <label htmlFor="department" className="sr-only">
              Département
            </label>
            <select id="department" className="input w-48" value={filters.department} onChange={(e) => onFiltersChange({ ...filters, department: e.target.value })}>
              <option value="">Départements</option>
              {Object.entries(DEPARTMENT_NAMES)
                .sort((a, b) => a[0].localeCompare(b[0], "fr", { numeric: true }))
                .map(([code, value]) => (
                  <option key={value[0]} value={value[0]}>
                    {code} - {value[0]}
                  </option>
                ))}
            </select>
            <label htmlFor="mission-type" className="sr-only">
              Type de mission
            </label>
            <select id="mission-type" className="input w-48" value={filters.type} onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}>
              <option value="">Type de mission</option>
              <option value="benevolat">Bénévolat</option>
              <option value="volontariat">Volontariat</option>
            </select>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-96">
          <Loader />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="border border-gray-border p-8">
            <div className="flex justify-between">
              <h2 className="mb-2 text-2xl font-semibold">
                {graphTotal.organizations ? `${graphTotal.organizations.toLocaleString("fr")} organisations actives` : "Pas de données"}
              </h2>
              <div className="relative group">
                <RiQuestionLine className="text-lg text-gray-dark" />

                <div className="hidden group-hover:block absolute left-0 top-8 z-10 w-56 border border-gray-border bg-white p-4 shadow-lg">
                  <p className="text-xs text-black">Il s'agit des structures ayant au moins 1 mission en cours sur la période sélectionnée</p>
                </div>
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-dark">Evolution {filters.year}</p>
            <div className="mb-1 mt-4 h-px bg-gray-border" />
            <div className="mb-2 h-60">
              <BarChart data={graphData.organizations} dataKey="Organisations" />
            </div>
          </div>

          <div className="border border-gray-border p-8">
            <div className="flex justify-between">
              <h2 className="mb-2 text-2xl font-semibold">{graphTotal.missions ? `${graphTotal.missions.toLocaleString("fr")} missions partagées` : "Pas de données"}</h2>

              <div className="relative group">
                <RiQuestionLine className="text-lg text-gray-dark" />

                <div className="hidden group-hover:block absolute left-0 top-8 z-10 w-56 border border-gray-border bg-white p-4 shadow-lg">
                  <p className="text-xs text-black">Il s'agit des missions partagées sur l'API Engagement et en cours au moins un jour de la période sélectionnée</p>
                </div>
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-dark">Evolution {filters.year}</p>
            <div className="mb-1 mt-4 h-px bg-gray-border" />
            <div className="mb-2 h-60">
              <BarChart data={graphData.missions} dataKey="Missions" />
            </div>
          </div>

          <div className="border border-gray-border p-8">
            <h2 className="mb-2 text-2xl font-semibold">{graphTotal.clicks ? `${graphTotal.clicks.toLocaleString("fr")} redirections` : "Pas de données"}</h2>

            <p className="text-lg font-semibold text-gray-dark">Evolution {filters.year}</p>
            <div className="mb-1 mt-4 h-px bg-gray-border" />
            <div className="mb-2 h-60">
              <BarChart data={graphData.clicks} dataKey="Redirections" />
            </div>
          </div>

          <div className="border border-gray-border p-8">
            <h2 className="mb-2 text-2xl font-semibold">{graphTotal.applies ? `${graphTotal.applies.toLocaleString("fr")} candidatures` : "Pas de données"}</h2>
            <p className="text-lg font-semibold text-gray-dark">Evolution {filters.year}</p>
            <div className="mb-1 mt-4 h-px bg-gray-border" />
            <div className="mb-2 h-60">
              <BarChart data={graphData.applies} dataKey="Candidatures" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SomeNumbers;
