import { useEffect, useState } from "react";
import { RiQuestionLine } from "react-icons/ri";

import { Pie } from "../../../components/Chart";
import TablePagination from "../../../components/NewTablePagination";
import { DEPARTMENT_NAMES, DOMAINS } from "../../../constants";
import api from "../../../services/api";
import { captureError } from "../../../services/error";

const getDepartmentCode = (postalCode) => {
  let code;
  if (postalCode && postalCode.length === 5) code = postalCode.slice(0, 2);
  else if (postalCode && postalCode.length === 4) code = postalCode.slice(0, 1);
  else return null;
  if (code === "97" || code === "98") code = postalCode.slice(0, 3);
  if (DEPARTMENT_NAMES.hasOwnProperty(code)) return code;
  else return null;
};

const getDepartement = (code) => code && code in DEPARTMENT_NAMES && DEPARTMENT_NAMES[code][0];

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
const Distribution = ({ filters, onFiltersChange }) => {
  const [domainStats, setDomainStats] = useState({ domains: [] });
  const [departmentStats, setDepartmentStats] = useState([]);
  const [currentDomainPage, setCurrentDomainPage] = useState(1);
  const [currentDepartmentPage, setCurrentDepartmentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.year) query.append("year", filters.year);
        if (filters.type) query.append("type", filters.type);

        const resDepartments = await api.get(`/stats-public/departments?${query.toString()}`);
        if (!resDepartments.ok) throw new Error("Erreur lors de la récupération des statistiques");

        setDepartmentStats(resDepartments.data.map((d) => ({ ...d, name: getDepartement(d.key) || "Non renseigné" })));
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération des statistiques");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters.year, filters.type]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.department) query.append("department", filters.department);
        if (filters.type) query.append("type", filters.type);
        if (filters.year) query.append("year", filters.year);

        const res = await api.get(`/stats-public/domains?${query.toString()}`);
        if (!res.ok) throw new Error("Erreur lors de la récupération des statistiques");

        if (res.data?.length === 0) {
          setDomainStats({ domains: [] });
          setLoading(false);
          return;
        }

        const domainByYear = res.data.find((stat) => stat.year === parseInt(filters.year, 10));
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

        setDomainStats(domainByYear);
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération des statistiques");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters]);

  return (
    <div className="mx-auto my-14 w-4/5 max-w-[1200px] flex-1 border border-gray-900 bg-white p-12">
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
      <div className="mt-8 gap-4 border p-8">
        <div className="mb-4 flex justify-between">
          <h2 className="mb-6 text-2xl font-bold">Domaine d'action des missions</h2>
          <div className="group relative">
            <RiQuestionLine className="text-gray-425 text-lg" />

            <div className="absolute top-8 left-0 z-10 hidden w-56 border border-gray-900 bg-white p-4 shadow-lg group-hover:block">
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
                <tr key={i} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
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

      <div className="mt-8 gap-4 border border-gray-900 p-8">
        <div className="mb-4 flex justify-between">
          <h2 className="mb-6 text-2xl font-bold">Département des missions</h2>
          <div className="group relative">
            <RiQuestionLine className="text-gray-425 text-lg" />

            <div className="absolute top-8 left-0 z-10 hidden w-56 border border-gray-900 bg-white p-4 shadow-lg group-hover:block">
              <p className="text-xs text-black">Répartition des missions ayant eu au moins une redirection par département</p>
            </div>
          </div>
        </div>
        <div className="flex justify-around gap-6">
          <div className="flex-1">
            <Pie data={departmentStats.map((item) => ({ name: item.name, value: item.mission_count }))} innerRadius="0%" unit="missions" />
          </div>
          <div className="flex-1">
            <TablePagination
              header={DEPARTMENT_TABLE_HEADER}
              page={currentDepartmentPage}
              pageSize={7}
              onPageChange={(page) => setCurrentDepartmentPage(page)}
              total={departmentStats.length}
              loading={loading}
            >
              {departmentStats.slice((currentDepartmentPage - 1) * 7, currentDepartmentPage * 7).map((item, i) => (
                <tr key={i} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
                  <td className="p-4" colSpan={2}>
                    {item.name}
                  </td>
                  <td className="px-4">{item.mission_count}</td>
                  <td className="px-4">{item.click_count}</td>
                  <td className="px-4">{item.apply_count}</td>
                </tr>
              ))}
            </TablePagination>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Distribution;
