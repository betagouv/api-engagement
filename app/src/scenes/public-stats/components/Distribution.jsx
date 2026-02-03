import { useEffect, useMemo, useState } from "react";
import { RiQuestionLine } from "react-icons/ri";

import Tooltip from "../../../components/Tooltip";
import { DEPARTMENT_NAMES, METABASE_CARD_ID } from "../../../constants";
import AnalyticsCard from "../../performance/AnalyticsCard";

const Distribution = ({ filters, onFiltersChange }) => {
  const [departmentPage, setDepartmentPage] = useState(1);
  const [domainPage, setDomainPage] = useState(1);
  const departmentCode = useMemo(() => {
    if (!filters.department) return "";
    if (DEPARTMENT_NAMES[filters.department]) return filters.department;
    const found = Object.entries(DEPARTMENT_NAMES).find(([, value]) => value[0] === filters.department);
    return found ? found[0] : filters.department;
  }, [filters.department]);

  useEffect(() => {
    setDepartmentPage(1);
  }, [filters.year, filters.type]);

  useEffect(() => {
    setDomainPage(1);
  }, [filters.year, filters.type, departmentCode]);

  const metabaseVariablesDomain = useMemo(
    () => ({
      year: filters.year ? String(filters.year) : "",
      department: departmentCode || "all",
      mission_type: filters.type || "all",
    }),
    [filters.year, filters.type, departmentCode],
  );

  const metabaseVariablesDepartment = useMemo(
    () => ({
      year: filters.year ? String(filters.year) : "",
      department: "all",
      mission_type: filters.type || "all",
    }),
    [filters.year, filters.type],
  );

  return (
    <div className="border-grey-border mx-auto my-14 w-4/5 max-w-[1200px] flex-1 border bg-white p-12">
      <div className="flex justify-between">
        <div className="">
          <h2 className="text-3xl font-bold">Répartition des missions</h2>
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
              <option value={2026}>2026</option>
            </select>
            <label htmlFor="department" className="sr-only">
              Département
            </label>
            <select id="department" className="input w-48" value={departmentCode} onChange={(e) => onFiltersChange({ ...filters, department: e.target.value })}>
              <option value="">Départements</option>
              {Object.entries(DEPARTMENT_NAMES)
                .sort((a, b) => a[0].localeCompare(b[0], "fr", { numeric: true }))
                .map(([code, value]) => (
                  <option key={value[0]} value={code}>
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

      <div className="mt-8 gap-4 border p-8">
        <div className="mb-4 flex justify-between">
          <h2 className="mb-6 text-2xl font-bold">Domaine d'action des missions</h2>
          <Tooltip
            ariaLabel="Voir la définition de la répartition par domaine"
            triggerClassName="text-text-mention"
            tooltipClassName="border-grey-border w-56 border bg-white p-4 text-xs text-black shadow-lg"
            content="Répartition des missions ayant eu au moins une redirection par thématique d'engagement."
          >
            <RiQuestionLine className="text-lg" aria-hidden="true" />
          </Tooltip>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="lg:w-5/12">
            <AnalyticsCard
              cardId={METABASE_CARD_ID.PUBLIC_STATS_MISSIONS_DOMAIN}
              filters={filters}
              variables={metabaseVariablesDomain}
              type="pie"
              chartProps={{ unit: "missions", innerRadius: "40%" }}
              loaderHeight="22rem"
            />
          </div>
          <div className="lg:w-7/12">
            <AnalyticsCard
              cardId={METABASE_CARD_ID.PUBLIC_STATS_MISSIONS_DOMAIN}
              filters={filters}
              variables={metabaseVariablesDomain}
              type="table"
              loaderHeight="22rem"
              tableProps={{ pageSize: 7, page: domainPage, onPageChange: setDomainPage }}
              columns={[
                { key: "mission_domaine", title: "Domaine" },
                { key: "missions", title: "Missions" },
                { key: "redirection_count", title: "Redirections" },
                { key: "candidature_count", title: "Candidatures" },
              ]}
              formatCell={(value) => {
                if (typeof value === "number") return value.toLocaleString("fr");
                if (typeof value === "string" && value.length > 0) return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
                return value;
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 gap-4 border p-8">
        <div className="mb-4 flex justify-between">
          <h2 className="mb-6 text-2xl font-bold">Département des missions</h2>
          <Tooltip
            ariaLabel="Voir la définition de la répartition par département"
            triggerClassName="text-text-mention"
            tooltipClassName="border-grey-border w-56 border bg-white p-4 text-xs text-black shadow-lg"
            content="Répartition des missions ayant eu au moins une redirection par département"
          >
            <RiQuestionLine className="text-lg" aria-hidden="true" />
          </Tooltip>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="lg:w-5/12">
            <AnalyticsCard
              cardId={METABASE_CARD_ID.PUBLIC_STATS_MISSIONS_DEPARTMENT}
              filters={filters}
              variables={metabaseVariablesDepartment}
              type="pie"
              showLegend={false}
              adapterOptions={{ labelColumn: "department_name", valueColumn: "missions_count" }}
              chartProps={{ unit: "missions", innerRadius: "40%" }}
              loaderHeight="22rem"
            />
          </div>
          <div className="lg:w-7/12">
            <AnalyticsCard
              cardId={METABASE_CARD_ID.PUBLIC_STATS_MISSIONS_DEPARTMENT}
              filters={filters}
              variables={metabaseVariablesDepartment}
              type="table"
              loaderHeight="24rem"
              tableProps={{ pageSize: 7, page: departmentPage, onPageChange: setDepartmentPage }}
              columns={[
                { key: "department_name", title: "Département" },
                { key: "missions_count", title: "Missions" },
                { key: "redirection_count", title: "Redirections" },
                { key: "candidature_count", title: "Candidatures" },
              ]}
              formatCell={(value, column) => {
                if (typeof value === "number") return value.toLocaleString("fr");
                if ((column?.key === "department_name" || column?.key === "department") && typeof value === "string" && value.length > 0) {
                  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
                }
                return value;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Distribution;
