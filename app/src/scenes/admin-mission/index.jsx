import { useEffect, useState } from "react";
import { RiCheckboxCircleFill, RiFileDownloadLine, RiInformationLine } from "react-icons/ri";
import { Link, useSearchParams } from "react-router-dom";

import ErrorIconSvg from "@/assets/svg/error-icon.svg?react";
import Combobox from "@/components/combobox";
import Loader from "@/components/Loader";
import SearchInput from "@/components/SearchInput";
import Select from "@/components/Select";
import Table from "@/components/Table";
import Tooltip from "@/components/Tooltip";
import { STATUS_PLR } from "@/constants";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { compactMissionFilters, searchMissions } from "@/services/mission";
import exportCSV from "@/services/utils";

const TABLE_HEADER = [
  { title: "Mission", key: "title.keyword", colSpan: 4 },
  { title: "Places disponibles", key: "places" },
  { title: "Ville", key: "city.keyword", colSpan: 2 },
  { title: "Créée le", key: "createdAt" },
  { title: "Statut", key: "statusCode.keyword" },
];

const AdminMission = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    size: 25,
    page: Number(searchParams.get("page")) || 1,
    sortBy: "createdAt",
    publisherId: searchParams.get("publisherId") || null,
    status: searchParams.get("status") || null,
    domain: searchParams.get("domain") || null,
    activity: searchParams.get("activity") || null,
    department: searchParams.get("department") || null,
    city: searchParams.get("city") || null,
    organization: searchParams.get("organization") || null,
    search: searchParams.get("search") || "",
  });
  const [options, setOptions] = useState({
    status: [],
    partners: [],
    domains: [],
    activities: [],
    departments: [],
    cities: [],
    organizations: [],
  });
  const [lastImport, setLastImport] = useState();

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/import/search", { size: 1 });
        if (!res.ok) throw res;
        setLastImport(res.data.length ? res.data[0] : null);
      } catch (error) {
        captureError(error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const newSearchParams = new URLSearchParams();
        Object.entries(compactMissionFilters(filters)).forEach(([key, value]) => newSearchParams.set(key, value));
        setSearchParams(newSearchParams);

        const res = await searchMissions(filters);

        if (!res.ok) throw res;
        setData(res.data);
        setOptions(res.aggs);
        setTotal(res.total);
      } catch (error) {
        captureError(error, { extra: { filters } });
      }
      setLoading(false);
    };

    fetchData();
  }, [filters]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await searchMissions({ ...filters, size: total, page: 1 });

      if (!res.ok) throw res;

      const data = [];
      res.data.forEach((mission) => {
        const d = {};
        d["Id"] = mission._id;
        d["Partenaire Id"] = mission.publisherId;
        d["Partenaire"] = mission.publisherName;
        d["Client Id"] = mission.clientId;
        d["Titre"] = mission.title;
        d["Place"] = mission.places;
        d["Description"] = `"${mission.description.replace(/"/g, "'")}"`;
        d["Organisation"] = mission.organizationName;
        d["Ville"] = `${mission.city} - ${mission.country}`;
        d["Domaine"] = mission.domain;
        d["Activité"] = (mission.activities || []).join(", ");
        d["Statut"] = mission.statusCode;
        d["Commentaire statut"] = mission.statusComment;
        d["Créée le"] = new Date(mission.createdAt).toLocaleDateString("fr");
        d["Modifiée le"] = new Date(mission.updatedAt).toLocaleDateString("fr");
        d["Publiée le"] = new Date(mission.postedAt).toLocaleDateString("fr");
        data.push(d);
      });
      exportCSV("missions", data);
    } catch (error) {
      captureError(error, { extra: { filters } });
    }
    setExporting(false);
  };

  return (
    <div className="space-y-12 bg-white p-12 shadow-lg">
      <title>API Engagement - Missions - Administration</title>
      <div className="space-y-4">
        <SearchInput className="w-96" value={filters.search} onChange={(search) => setFilters({ ...filters, search })} placeholder="Rechercher par mot-clé" />
        <div className="flex items-center gap-4">
          <Select
            options={options.status.map((e) => ({ value: e.key, label: STATUS_PLR[e.key], count: e.doc_count }))}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.value })}
            placeholder="Statut"
          />
          <Select
            options={options.domains.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.domain}
            onChange={(e) => setFilters({ ...filters, domain: e.value })}
            placeholder="Domaine"
          />
          <Select
            options={options.activities.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.activity}
            onChange={(e) => setFilters({ ...filters, activity: e.value })}
            placeholder="Activité"
          />
          <Combobox
            id="publisher"
            options={options.partners.map((e) => ({ value: e.id, label: e.name, count: e.count }))}
            value={filters.publisherId}
            onSelect={(e) => (e ? setFilters({ ...filters, publisherId: e.value }) : null)}
            placeholder="Partenaire"
          />
        </div>
        <div className="flex items-center gap-4">
          <Select
            options={options.cities.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.value })}
            placeholder="Ville"
          />
          <Combobox
            id="department"
            options={options.departments.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.department}
            onSelect={(e) => (e ? setFilters({ ...filters, department: e.value }) : null)}
            placeholder="Département"
          />
          <Select
            options={options.organizations.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.organization}
            onChange={(e) => setFilters({ ...filters, organization: e.value })}
            placeholder="Organisation"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="max-w-[60%] flex-1 space-y-2">
            <h2 className="text-2xl font-bold">{total.toLocaleString("fr")} missions partagées</h2>
            <div className="flex items-center gap-2">
              <p className="text-text-mention text-base">Dernière synchronisation le {lastImport ? new Date(lastImport.startedAt).toLocaleDateString("fr") : "N/A"}</p>
              {lastImport && new Date(lastImport.startedAt) > new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1) ? (
                <RiCheckboxCircleFill role="img" aria-label="OK" className="text-success text-base" />
              ) : (
                <ErrorIconSvg role="img" aria-label="Erreur" className="fill-error h-4 w-4" />
              )}
            </div>
          </div>
          <button className="tertiary-btn flex items-center" onClick={handleExport}>
            {exporting ? <Loader /> : <RiFileDownloadLine className="mr-2" />}
            Exporter
          </button>
        </div>

        <Table
          header={TABLE_HEADER}
          pagination
          page={filters.page}
          pageSize={filters.size}
          onPageChange={(page) => setFilters({ ...filters, page })}
          total={total}
          loading={loading}
          sortBy={filters.sortBy}
          onSort={(sortBy) => setFilters({ ...filters, sortBy })}
        >
          {data.map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
              <td className="p-4" colSpan={4}>
                <Link to={`/mission/${item._id}`} className="text-blue-france line-clamp-3">
                  {item.title}
                </Link>
                {item.publisherName && <p className="text-sm">{item.publisherName}</p>}
                {item.organizationName && <p className="text-sm">{item.organizationName}</p>}
              </td>
              <td className="px-4">{item.places}</td>
              <td className="px-4" colSpan={2}>
                {item.city}
              </td>
              <td className="px-4">{new Date(item.createdAt).toLocaleDateString("fr")}</td>
              <td className="px-6">
                <div className="flex items-center gap-1">
                  {item.statusCode === "ACCEPTED" ? (
                    <RiCheckboxCircleFill role="img" aria-label="OK" className="text-success text-2xl" />
                  ) : (
                    <ErrorIconSvg role="img" aria-label="Erreur" className="fill-error h-6 w-6" />
                  )}
                  {item.statusComment ? (
                    <Tooltip
                      ariaLabel="Voir le commentaire de statut"
                      triggerClassName="text-text-mention"
                      tooltipClassName="border-grey-border w-64 border bg-white p-4 text-sm shadow-lg"
                      content={item.statusComment}
                    >
                      <RiInformationLine className="text-2xl" aria-hidden="true" />
                    </Tooltip>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

export default AdminMission;
