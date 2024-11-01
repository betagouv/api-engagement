import { useEffect, useState } from "react";
import { RiQuestionLine } from "react-icons/ri";

import { useSearchParams } from "react-router-dom";
import dataViz from "../../assets/svg/data-visualization.svg";
import APILogo from "../../assets/svg/logo.svg";
import { BarChart, Pie } from "../../components/Chart";
import Loader from "../../components/Loader";
import TablePagination from "../../components/NewTablePagination";
import { DEPARTMENT_NAMES, DOMAINS } from "../../constants";
import api from "../../services/api";
import { captureError } from "../../services/error";

const formatPostalCode = (postalCode) => {
  if (!postalCode) return undefined;
  const postalCodeString = postalCode.toString();
  if (postalCodeString.length === 5) return postalCodeString;
  if (postalCodeString.length === 4) return "0" + postalCodeString;
  if (postalCodeString.length === 3) return "00" + postalCodeString;
  if (postalCodeString.length === 2) return "000" + postalCodeString;
  if (postalCodeString.length === 1) return "0000" + postalCodeString;
  return undefined;
};

const getDepartmentCode = (departmentCode, postalCode) => {
  if (departmentCode && DEPARTMENT_NAMES.hasOwnProperty(departmentCode)) return departmentCode;

  let code;
  if (postalCode && postalCode.length === 5) code = postalCode.slice(0, 2);
  else if (postalCode && postalCode.length === 4) code = postalCode.slice(0, 1);
  else return null;
  if (code === "97" || code === "98") code = postalCode.slice(0, 3);
  if (DEPARTMENT_NAMES.hasOwnProperty(code)) return code;
  else return null;
};

const getDepartement = (code) => code && code in DEPARTMENT_NAMES && DEPARTMENT_NAMES[code][0];

const MONTHS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jui", "Juil", "Aou", "Sep", "Oct", "Nov", "Dec"];

const DOMAIN_TABLE_HEADER = [
  { title: "Domaine", key: "domain.keyword", colSpan: 2 },
  { title: "Missions", key: "places" },
  { title: "Redirections", key: "click" },
  { title: "Candidatures", key: "apply" },
];

const DEPARTMENT_TABLE_HEADER = [
  { title: "Département", key: "department.keyword", colSpan: 2 },
  { title: "Missions", key: "places" },
  { title: "Redirections", key: "click" },
  { title: "Candidatures", key: "apply" },
];

const buildGraphData = (data, dataKey = "Redirections") => {
  const graphData = data.map((item) => ({
    [dataKey]: item.doc_count,
    name: MONTHS[new Date(item.key).getMonth()],
  }));
  return graphData;
};

const PublicStats = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    department: searchParams.get("department") || "",
    type: searchParams.get("type") || "",
    year: searchParams.get("year") || new Date().getFullYear(),
  });

  const [graphData, setGraphData] = useState({
    redirections: [],
    applications: [],
    organizations: [],
    missions: [],
  });

  const [graphTotal, setGraphTotal] = useState({
    redirections: 0,
    applications: 0,
    organizations: 0,
    missions: 0,
  });

  const [domainStats, setDomainStats] = useState({ domains: [] });
  const [departmentStats, setDepartmentStats] = useState({ departments: [] });
  const [currentDomainPage, setCurrentDomainPage] = useState(1);
  const [currentDepartmentPage, setCurrentDepartmentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.department) query.append("department", filters.department);
        if (filters.type) query.append("type", filters.type);
        if (filters.year) query.append("year", filters.year);

        const resDomains = await api.get(`/stats-public/domains?${query.toString()}`);
        if (!resDomains.ok) throw new Error("Erreur lors de la récupération des statistiques");

        const resDepartments = await api.get("/stats-public/departments");
        if (!resDepartments.ok) throw new Error("Erreur lors de la récupération des statistiques");

        const resGraphs = await api.get(`/stats-public/graphs?${query.toString()}`);
        if (!resGraphs.ok) throw new Error("Erreur lors de la récupération des statistiques");

        const domainByYear = resDomains.data.find((stat) => stat.year === parseInt(filters.year, 10));
        domainByYear.domains = domainByYear.domains.reduce((acc, d) => {
          const domainName = DOMAINS[d.key];
          const exists = acc.find((item) => item.key === domainName);
          if (exists) {
            exists.stat += d.stat;
          } else {
            acc.push({ ...d, key: domainName });
          }
          return acc;
        }, []);

        const departmentByYear = resDepartments.data.find((stat) => stat.year === parseInt(filters.year, 10));
        const aggregatedDepartments = departmentByYear.departments.reduce((acc, d) => {
          const postalCode = formatPostalCode(d.key);
          const departmentCode = getDepartmentCode(undefined, postalCode);
          const departmentName = getDepartement(departmentCode) || "Autre";
          if (!acc[departmentName]) {
            acc[departmentName] = { ...d, key: departmentName };
          } else {
            for (let prop in d) {
              if (typeof d[prop] === "number") {
                acc[departmentName][prop] = (acc[departmentName][prop] || 0) + d[prop];
              }
            }
          }
          return acc;
        }, {});
        departmentByYear.departments = Object.values(aggregatedDepartments);

        setSearchParams(query);
        setGraphData({
          redirections: buildGraphData(resGraphs.data.redirections),
          applications: buildGraphData(resGraphs.data.applications, "Candidatures"),
          organizations: buildGraphData(resGraphs.data.organizations, "Organisations"),
          missions: buildGraphData(resGraphs.data.missions, "Missions"),
        });
        setGraphTotal({
          redirections: resGraphs.data.totalRedirections,
          applications: resGraphs.data.totalApplications,
          organizations: resGraphs.data.totalOrganizations,
          missions: resGraphs.data.totalMissions,
        });
        setDepartmentStats(departmentByYear);
        setDomainStats(domainByYear);
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération des statistiques");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters]);

  return (
    <div className="flex w-full flex-col bg-white shadow-lg">
      <div className="mx-auto my-14 w-4/5 max-w-[1200px] flex-1">
        <div className="flex justify-between">
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold mb-2">Statistiques de l'API Engagement</h1>
            <p className="text-lg font-medium text-gray-dark">L'API Engagement facilite la diffusion des missions de bénévolat et de volontariat partout en France.</p>
          </div>
          <img className="h-18 w-18" src={APILogo} alt="API Engagement" />
        </div>
      </div>
      <div className="bg-beige">
        <div className="mx-auto my-14 w-4/5 max-w-[1200px] flex-1 ">
          <div className="flex">
            <img className="h-18 w-18" src={dataViz} alt="API Engagement" />
            <div className="ml-5 flex flex-col">
              <h2 className="text-3xl font-bold">Vue d'ensemble</h2>
              <p className="text-lg text-gray-dark">
                <strong>Quelques indicateurs </strong>
                pour observer d'un coup d'oeil l'impact de l'API Engagement
              </p>
            </div>
          </div>
        </div>
        <div className="mx-auto my-14 w-4/5 max-w-[1200px] flex-1 border bg-white p-12">
          <h2 className="text-3xl font-bold">En quelques mots</h2>
          <div className="flex-start flex gap-6">
            <div className="mt-8 flex-1 text-lg leading-loose text-gray-dark">
              <strong className="text-black">
                L'API Engagement est un service public numérique qui permet aux plateformes d'engagement associatives, publiques et privées de mettre en commun leurs missions.
              </strong>
              <div>
                Elle permet au plus grand nombre d'accéder aux opportunités d'engagement en renforçant / démultipliant la visibilité des annonces, et augmente ainsi le nombre de
                personnes qui candidatent aux actions.
              </div>
            </div>
            <div className="mt-8 flex-1 text-lg leading-loose text-gray-dark">
              L'API Engagement permet de faciliter l'engagement en simplifiant l'accès à une pluralité d'annonces actualisées. Avec cette technologie, les points de rencontres sont
              multipliés : les annonces sont accessible aux bons endroits, c'est-à-dire là où les personnes qui souhaitent s'engager se trouvent : site de mairie, applications,
              plateformes d'engagement, etc.
            </div>
          </div>
        </div>
        <div className="mx-auto my-14 w-4/5 max-w-[1200px] flex-1 border border-gray-border bg-white p-12">
          <div className="flex justify-between">
            <div className="">
              <h2 className="text-3xl font-bold">En quelques chiffres</h2>
            </div>

            <div className="flex">
              <div className="ml-4 flex items-center gap-4">
                <select className="input w-48" value={filters.year} onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value, 10) })}>
                  <option value={2020}>2020</option>
                  <option value={2021}>2021</option>
                  <option value={2022}>2022</option>
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                </select>
                <select className="input w-48" value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
                  <option value="">Départements</option>
                  {departmentStats.departments
                    .map((department) => {
                      return {
                        ...department,
                        code: Object.keys(DEPARTMENT_NAMES).find((code) => DEPARTMENT_NAMES[code][0] === department.key) || "Unknown",
                      };
                    })
                    .sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }))
                    .map((department) => (
                      <option key={department.code} value={department.key}>
                        {department.code} - {department.key}
                      </option>
                    ))}
                </select>
                <select className="input w-48" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
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
                <h2 className="mb-2 text-2xl font-semibold">{graphTotal.redirections ? `${graphTotal.redirections.toLocaleString("fr")} redirections` : "Pas de données"}</h2>

                <p className="text-lg font-semibold text-gray-dark">Evolution {filters.year}</p>
                <div className="mb-1 mt-4 h-px bg-gray-border" />
                <div className="mb-2 h-60">
                  <BarChart data={graphData.redirections} dataKey="Redirections" />
                </div>
              </div>

              <div className="border border-gray-border p-8">
                <h2 className="mb-2 text-2xl font-semibold">{graphTotal.applications ? `${graphTotal.applications.toLocaleString("fr")} candidatures` : "Pas de données"}</h2>
                <p className="text-lg font-semibold text-gray-dark">Evolution {filters.year}</p>
                <div className="mb-1 mt-4 h-px bg-gray-border" />
                <div className="mb-2 h-60">
                  <BarChart data={graphData.applications} dataKey="Candidatures" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mx-auto my-14 w-4/5 max-w-[1200px] flex-1 border border-gray-border bg-white p-12">
          <div className="flex justify-between">
            <div className="">
              <h2 className="text-3xl font-bold">Répartition des missions</h2>
            </div>

            <div className="flex">
              <div className="ml-4 flex items-center gap-4">
                <select className="input w-48" value={filters.year} onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value, 10) })}>
                  <option value={2020}>2020</option>
                  <option value={2021}>2021</option>
                  <option value={2022}>2022</option>
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                </select>
                <select className="input w-48" value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
                  <option value="">Départements</option>
                  {departmentStats.departments
                    .map((department) => {
                      return {
                        ...department,
                        code: Object.keys(DEPARTMENT_NAMES).find((code) => DEPARTMENT_NAMES[code][0] === department.key) || "Unknown",
                      };
                    })
                    .sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }))
                    .map((department) => (
                      <option key={department.code} value={department.key}>
                        {department.code} - {department.key}
                      </option>
                    ))}
                </select>
                <select className="input w-48" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
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
              <div className="relative group">
                <RiQuestionLine className="text-lg text-gray-dark" />

                <div className="hidden group-hover:block absolute left-0 top-8 z-10 w-56 border border-gray-border bg-white p-4 shadow-lg">
                  <p className="text-xs text-black">Répartition des missions ayant eu au moins une redirection par thématique d'engagement.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-around gap-6">
              <div className="flex-1">
                <Pie data={domainStats.domains.map((item) => ({ name: item.key, value: item.doc_count }))} innerRadius="0%" unit="missions" />
              </div>
              <div className="flex-1">
                <TablePagination
                  header={DOMAIN_TABLE_HEADER}
                  page={currentDomainPage}
                  pageSize={7}
                  onPageChange={(page) => setCurrentDomainPage(page)}
                  total={domainStats.domains.length}
                  loading={loading}
                >
                  {domainStats.domains.slice((currentDomainPage - 1) * 7, currentDomainPage * 7).map((item, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                      <td className="p-4" colSpan={2}>
                        {item.key}
                      </td>
                      <td className="px-4">{item.doc_count}</td>
                      <td className="px-4">{item.click}</td>
                      <td className="px-4">{item.apply}</td>
                    </tr>
                  ))}
                </TablePagination>
              </div>
            </div>
          </div>

          <div className="mt-8 gap-4 border border-gray-border p-8">
            <div className="mb-4 flex justify-between">
              <h2 className="mb-6 text-2xl font-bold">Département des missions</h2>
              <div className="relative group">
                <RiQuestionLine className="text-lg text-gray-dark" />

                <div className="hidden group-hover:block absolute left-0 top-8 z-10 w-56 border border-gray-border bg-white p-4 shadow-lg">
                  <p className="text-xs text-black">Répartition des missions ayant eu au moins une redirection par département</p>
                </div>
              </div>
            </div>
            <div className="flex justify-around gap-6">
              <div className="flex-1">
                <Pie data={departmentStats.departments.map((item) => ({ name: item.key, value: item.doc_count }))} innerRadius="0%" unit="missions" />
              </div>
              <div className="flex-1">
                <TablePagination
                  header={DEPARTMENT_TABLE_HEADER}
                  page={currentDepartmentPage}
                  pageSize={7}
                  onPageChange={(page) => setCurrentDepartmentPage(page)}
                  total={departmentStats.departments.length}
                  loading={loading}
                >
                  {departmentStats.departments.slice((currentDomainPage - 1) * 7, currentDomainPage * 7).map((item, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                      <td className="p-4" colSpan={2}>
                        {item.key}
                      </td>
                      <td className="px-4">{item.doc_count}</td>
                      <td className="px-4">{item.click}</td>
                      <td className="px-4">{item.apply}</td>
                    </tr>
                  ))}
                </TablePagination>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicStats;
