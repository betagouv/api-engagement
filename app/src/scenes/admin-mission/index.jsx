import { useEffect, useState } from "react";
import { RiCheckboxCircleFill, RiFileDownloadLine, RiInformationLine } from "react-icons/ri";
import { Link, useSearchParams } from "react-router-dom";

import ErrorIconSvg from "../../assets/svg/error-icon.svg?react";
import Loader from "../../components/Loader";
import Select from "../../components/NewSelect";
import TablePagination from "../../components/NewTablePagination";
import SearchInput from "../../components/SearchInput";
import { LEBONCOIN_STATUS, STATUS_PLR } from "../../constants";
import api from "../../services/api";
import { captureError } from "../../services/error";
import exportCSV from "../../services/utils";

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
    status: searchParams.get("status") || null,
    domain: searchParams.get("domain") || null,
    activity: searchParams.get("activity") || null,
    city: searchParams.get("city") || null,
    organization: searchParams.get("organization") || null,
    leboncoinStatus: searchParams.get("leboncoinStatus") || null,
    search: searchParams.get("search") || "",
  });
  const [options, setOptions] = useState({
    status: [],
    domains: [],
    activities: [],
    cities: [],
    organizations: [],
    leboncoinStatus: [],
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
        captureError(error, "Erreur lors de la récupération des modérateurs");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = {
          size: filters.size,
          from: (filters.page - 1) * filters.size,
        };
        if (filters.status) query.status = filters.status;
        if (filters.domain) query.domain = filters.domain;
        if (filters.activity) query.activity = filters.activity;
        if (filters.city) query.city = filters.city;
        if (filters.organization) query.organization = filters.organization;
        if (filters.leboncoinStatus) query.leboncoinStatus = filters.leboncoinStatus;
        if (filters.search) query.search = filters.search;
        if (filters.sortBy) query.sort = filters.sortBy;
        const res = await api.post("/mission/search", { ...query });

        if (!res.ok) throw res;
        setData(res.data);
        setOptions(res.aggs);
        setTotal(res.total);

        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set("size", filters.size);
        newSearchParams.set("page", filters.page);
        if (filters.status) newSearchParams.set("status", filters.status);
        if (filters.domain) newSearchParams.set("domain", filters.domain);
        if (filters.activity) newSearchParams.set("activity", filters.activity);
        if (filters.city) newSearchParams.set("city", filters.city);
        if (filters.organization) newSearchParams.set("organization", filters.organization);
        if (filters.leboncoinStatus) newSearchParams.set("leboncoinStatus", filters.leboncoinStatus);
        if (filters.search) newSearchParams.set("search", filters.search);
        setSearchParams(newSearchParams);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };

    fetchData();
  }, [filters]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const query = {
        size: total,
        from: 0,
      };

      if (filters.status) query.status = filters.status;
      if (filters.domain) query.domain = filters.domain;
      if (filters.activity) query.activity = filters.activity;
      if (filters.city) query.city = filters.city;
      if (filters.organization) query.organization = filters.organization;
      if (filters.leboncoinStatus) query.leboncoinStatus = filters.leboncoinStatus;
      if (filters.search) query.search = filters.search;
      if (filters.sortBy) query.sort = filters.sortBy;

      const res = await api.post("/mission/search", { ...query });

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
        d["Description"] = `"${mission.description}"`;
        d["Organisation"] = mission.organizationName;
        d["Ville"] = `${mission.city} - ${mission.country}`;
        d["Domaine"] = mission.domain;
        d["Activité"] = mission.activity;
        d["Statut"] = mission.statusCode;
        d["Commentaire statut"] = mission.statusComment;
        d["Statut leboncoin"] = mission.leboncoinStatus;
        d["Commentaire leboncoin"] = mission.leboncoinStatusComment;
        d["Url leboncoin"] = mission.leboncoinUrl;
        d["Créée le"] = new Date(mission.createdAt).toLocaleDateString("fr");
        d["Modifiée le"] = new Date(mission.updatedAt).toLocaleDateString("fr");
        d["Publiée le"] = new Date(mission.postedAt).toLocaleDateString("fr");
        data.push(d);
      });
      exportCSV("missions", data);
    } catch (error) {
      captureError(error, "Erreur lors de l'export des missions");
    }
    setExporting(false);
  };

  return (
    <div className="space-y-12 p-12 bg-white shadow-lg">
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
        </div>
        <div className="flex items-center gap-4">
          <Select
            options={options.cities.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.value })}
            placeholder="Ville"
          />
          <Select
            options={options.organizations.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.organization}
            onChange={(e) => setFilters({ ...filters, organization: e.value })}
            placeholder="Organisation"
          />
          <Select
            options={options.leboncoinStatus.filter((e) => Boolean(e.key)).map((e) => ({ value: e.key, label: LEBONCOIN_STATUS[e.key], count: e.doc_count }))}
            value={filters.leboncoinStatus}
            onChange={(e) => setFilters({ ...filters, leboncoinStatus: e.value })}
            placeholder="Statut leboncoin"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1 max-w-[60%]">
            <h2 className="text-2xl font-bold ">{total.toLocaleString("fr")} missions partagées</h2>
            <div className="flex items-center gap-2">
              <p className="text-base text-[#666666]">Dernière synchronisation le {lastImport ? new Date(lastImport.startedAt).toLocaleDateString("fr") : "N/A"}</p>
              {lastImport && new Date(lastImport.startedAt) > new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1) ? (
                <RiCheckboxCircleFill className="text-green-main text-base" />
              ) : (
                <ErrorIconSvg alt="error" className="w-4 h-4 fill-[#e1000f]" />
              )}
            </div>
          </div>
          <button className="button border border-[#dddddd] flex items-center text-blue-dark hover:bg-gray-hover" onClick={handleExport}>
            {exporting ? <Loader /> : <RiFileDownloadLine className="mr-2" />}
            Exporter
          </button>
        </div>

        <TablePagination
          header={TABLE_HEADER}
          page={filters.page}
          pageSize={filters.size}
          onPageChange={(page) => setFilters({ ...filters, page })}
          total={total}
          loading={loading}
          sortBy={filters.sortBy}
          onSort={(sortBy) => setFilters({ ...filters, sortBy })}
        >
          {data.map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
              <td className="p-4" colSpan={4}>
                <Link to={`/mission/${item._id}`} className="line-clamp-3 text-blue-dark">
                  {item.title}
                </Link>
                {item.organizationName && <p className="text-sm">{item.organizationName}</p>}
              </td>
              <td className="px-4">{item.places}</td>
              <td className="px-4" colSpan={2}>
                {item.city}
              </td>
              <td className="px-4">{new Date(item.createdAt).toLocaleDateString("fr")}</td>
              <td className="px-6">
                <div className="flex items-center gap-1">
                  {item.statusCode === "ACCEPTED" ? <RiCheckboxCircleFill className="text-green-main text-2xl" /> : <ErrorIconSvg alt="error" className="w-6 h-6 fill-[#e1000f]" />}
                  {item.statusComment && (
                    <div className="relative group">
                      <RiInformationLine className="text-gray-dark text-2xl" />

                      <div className="hidden group-hover:block absolute right-8 -translate-y-1/2 -top-1/2 z-10 w-64 border border-gray-border bg-white p-4 shadow-lg">
                        <p className="text-sm">{item.statusComment}</p>
                      </div>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </TablePagination>
      </div>
    </div>
  );
};

export default AdminMission;
