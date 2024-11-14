import { useEffect, useState } from "react";
import { RiCheckboxCircleFill, RiFileDownloadLine, RiInformationLine } from "react-icons/ri";
import { Link, useSearchParams } from "react-router-dom";

import ErrorIconSvg from "../../assets/svg/error-icon.svg?react";
import InfoAlert from "../../components/InfoAlert";
import Loader from "../../components/Loader";
import Select from "../../components/NewSelect";
import TablePagination from "../../components/NewTablePagination";
import SearchInput from "../../components/SearchInput";
import { STATUS_PLR } from "../../constants";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import exportCSV from "../../services/utils";

const TABLE_HEADER = [
  { title: "Mission", key: "title.keyword", colSpan: 4 },
  { title: "Places disponibles", key: "places" },
  { title: "Ville", key: "city.keyword", colSpan: 2 },
  { title: "Créée le", key: "createdAt" },
  { title: "Statut", key: "statusCode.keyword" },
];

const Flux = () => {
  const { publisher } = useStore();
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
    search: searchParams.get("search") || "",
  });
  const [options, setOptions] = useState({
    status: [],
    domains: [],
    activities: [],
    cities: [],
    organizations: [],
  });
  const [lastImport, setLastImport] = useState();
  const [moderators, setModerators] = useState();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hideAlert, setHideAlert] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resI = await api.post("/import/search", { publisherId: publisher._id, size: 1 });
        if (!resI.ok) throw resI;
        setLastImport(resI.data.length ? resI.data[0] : null);

        const resM = await api.get(`/publisher?moderatorOf=${publisher._id}`);
        if (!resM.ok) throw resM;
        const newHideAlter = {};
        resM.data.forEach((m) => (newHideAlter[m._id] = false));
        setHideAlert(newHideAlter);
        setModerators(resM.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des modérateurs");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = {
          publisherId: publisher._id,
          size: filters.size,
          from: (filters.page - 1) * filters.size,
        };
        if (filters.status) query.status = filters.status;
        if (filters.domain) query.domain = filters.domain;
        if (filters.activity) query.activity = filters.activity;
        if (filters.city) query.city = filters.city;
        if (filters.organization) query.organization = filters.organization;
        if (filters.search) query.search = filters.search;
        if (filters.sortBy) query.sort = filters.sortBy;
        const res = await api.post("/mission/search", { ...query }, { signal: controller.signal });

        if (!res.ok) throw res;
        setData(res.data);
        setOptions(res.aggs);
        setTotal(res.total);

        const newSearchParams = new URLSearchParams();
        newSearchParams.append("size", filters.size);
        newSearchParams.append("page", filters.page);
        if (filters.status) newSearchParams.append("status", filters.status);
        if (filters.domain) newSearchParams.append("domain", filters.domain);
        if (filters.activity) newSearchParams.append("activity", filters.activity);
        if (filters.city) newSearchParams.append("city", filters.city);
        if (filters.organization) newSearchParams.append("organization", filters.organization);
        if (filters.search) newSearchParams.append("search", filters.search);
        setSearchParams(newSearchParams);
      } catch (error) {
        if (error.name === "AbortError") return;
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };

    fetchData();
    return () => controller.abort();
  }, [filters]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const query = {
        publisherId: publisher._id,
        size: 10000,
        from: 0,
      };

      if (filters.status) query.status = filters.status;
      if (filters.domain) query.domain = filters.domain;
      if (filters.activity) query.activity = filters.activity;
      if (filters.city) query.city = filters.city;
      if (filters.organization) query.organization = filters.organization;
      if (filters.search) query.search = filters.search;

      const res = await api.post("/mission/search", { ...query });

      if (!res.ok) throw res;
      const csv = [];
      res.data.forEach((mission) => {
        const val = {};
        val["ClientId"] = mission.clientId;
        val["Titre"] = mission.title;
        val["Place"] = mission.places;
        val["Description"] = `"${mission.description}"`;
        val["Organisation"] = mission.organizationName;
        val["Ville"] = `${mission.city} - ${mission.country}`;
        val["Domaine"] = mission.domain;
        val["Activité"] = mission.activity;
        val["Statut"] = mission.statusCode;
        csv.push(val);
      });
      exportCSV(`missions ${publisher.name}`, csv);
    } catch (error) {
      captureError(error, "Erreur lors de l'export des missions");
    }
    setExporting(false);
  };

  return (
    <div className="space-y-12 p-12">
      <div className="space-y-4">
        <SearchInput className="w-96" value={filters.search} onChange={(search) => setFilters({ ...filters, search })} placeholder="Rechercher par mot-clé" />
        <div className="flex items-center gap-4">
          <Select
            options={options.status.map((e) => ({ value: e.key, label: STATUS_PLR[e.key], count: e.doc_count }))}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.value })}
            placeholder="Statut"
            loading={loading}
          />
          <Select
            options={options.domains.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.domain}
            onChange={(e) => setFilters({ ...filters, domain: e.value })}
            placeholder="Domaine"
            loading={loading}
          />
          <Select
            options={options.activities.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.activity}
            onChange={(e) => setFilters({ ...filters, activity: e.value })}
            placeholder="Activité"
            loading={loading}
          />
          <Select
            options={options.cities.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.value })}
            placeholder="Ville"
            loading={loading}
          />
          <Select
            options={options.organizations.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.organization}
            onChange={(e) => setFilters({ ...filters, organization: e.value })}
            placeholder="Organisation"
            loading={loading}
          />
        </div>
      </div>

      {moderators &&
        moderators.map((m, i) => {
          if (hideAlert[m._id.toString()]) return null;
          return (
            <InfoAlert key={i} onClose={() => setHideAlert({ ...hideAlert, [m._id.toString()]: true })}>
              <div className="text-sm font-bold">Votre partenaire {m.name} pratique une modération de vos missions</div>
              <div>
                <p className="text-xs mb-4">
                  Consultez les
                  <a href={m.moderatorLink} target="_blank" className="ml-1 cursor-pointer text-gray-dark underline">
                    règles de modération du partenaire
                  </a>
                </p>
                <Link to={`moderated-mission/${m._id.toString()}`}>
                  <div className="empty-button w-56">Suivre la modération</div>
                </Link>
              </div>
            </InfoAlert>
          );
        })}

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
              <Link to="/settings" className="link">
                Paraméter mon flux de missions
              </Link>
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

export default Flux;
