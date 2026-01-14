import { useEffect, useState } from "react";
import { RiCheckboxCircleFill, RiFileDownloadLine, RiInformationLine } from "react-icons/ri";
import { Link, useSearchParams } from "react-router-dom";

import ErrorIconSvg from "../../assets/svg/error-icon.svg?react";
import InfoAlert from "../../components/InfoAlert";
import Loader from "../../components/Loader";
import Select from "../../components/NewSelect";
import Table from "../../components/NewTable";
import SearchInput from "../../components/SearchInput";
import { STATUS_PLR } from "../../constants";
import api from "../../services/api";
import { captureError } from "../../services/error";
import { compactMissionFilters, searchMissions } from "../../services/mission";
import useStore from "../../services/store";
import exportCSV from "../../services/utils";
import SelectCity from "./components/SelectCity";
import SelectOrganization from "./components/SelectOrganization";

const TABLE_HEADER = [
  { title: "Mission", key: "title.keyword", colSpan: 4 },
  { title: "Places disponibles", key: "places" },
  { title: "Ville", key: "city.keyword", colSpan: 2 },
  { title: "Créée le", key: "createdAt" },
  { title: "Acceptées par l'API ?", key: "statusCode.keyword" },
];

const Flux = ({ moderated }) => {
  const { publisher } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    size: 25,
    page: Number(searchParams.get("page")) || 1,
    sortBy: "createdAt",
    status: searchParams.get("status") || null,
    comment: searchParams.get("comment") || null,
    domain: searchParams.get("domain") || null,
    activity: searchParams.get("activity") || null,
    city: searchParams.get("city") || null,
    organization: searchParams.get("organization") || null,
    search: searchParams.get("search") || "",
  });
  const [options, setOptions] = useState({
    status: [],
    comments: [],
    domains: [],
    activities: [],
  });
  const [lastImport, setLastImport] = useState();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hideAlert, setHideAlert] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/import/search", { publisherId: publisher.id, size: 1 });
        if (!res.ok) throw res;
        setLastImport(res.data.length ? res.data[0] : null);
      } catch (error) {
        captureError(error, { extra: { publisherId: publisher.id } });
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await searchMissions({ ...filters, publisherId: publisher.id }, { signal: controller.signal });

        if (!res.ok) throw res;
        setData(res.data);
        setOptions(res.aggs);
        setTotal(res.total);

        const newSearchParams = new URLSearchParams();
        Object.entries(compactMissionFilters(filters)).forEach(([key, value]) => newSearchParams.append(key, value));
        setSearchParams(newSearchParams);
      } catch (error) {
        captureError(error, { extra: { filters } });
      }
      setLoading(false);
    };

    fetchData();
    return () => controller.abort();
  }, [filters]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await searchMissions({ ...filters, publisherId: publisher.id, size: 10000, page: 1 });

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
      captureError(error, { extra: { filters } });
    }
    setExporting(false);
  };

  return (
    <div className="space-y-12 p-12">
      <title>Missions partagées - Vos Missions - API Engagement</title>
      {moderated && !hideAlert && (
        <InfoAlert onClose={() => setHideAlert(true)}>
          <p className="text-base">Pour toutes les missions acceptées par l’API, JeVeuxAider.gouv.fr pratique une modération avant de les diffuser.</p>
          <Link to="moderated-mission" className="text-blue-france underline">
            Suivre la modération
          </Link>
        </InfoAlert>
      )}
      <div className="space-y-4">
        <SearchInput className="w-96" value={filters.search} onChange={(search) => setFilters({ ...filters, search })} placeholder="Rechercher par mot-clé" />
        <div className="flex items-center gap-4">
          <Select
            options={options.status.map((e) => ({ value: e.key, label: STATUS_PLR[e.key], count: e.doc_count }))}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.value })}
            placeholder="Acceptées par l'API ?"
            loading={loading}
          />
          <Select
            options={options.comments.filter((e) => Boolean(e.key)).map((e) => ({ value: e.key, label: e.key, count: e.doc_count }))}
            value={filters.comment}
            onChange={(e) => setFilters({ ...filters, comment: e.value })}
            placeholder="Motif d'erreur"
            loading={loading}
          />
          <Select
            options={options.domains.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.domain}
            onChange={(e) => setFilters({ ...filters, domain: e.value })}
            placeholder="Domaines"
            loading={loading}
          />
        </div>
        <div className="flex items-center gap-4">
          <Select
            options={options.activities.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
            value={filters.activity}
            onChange={(e) => setFilters({ ...filters, activity: e.value })}
            placeholder="Activités"
            loading={loading}
          />
          <SelectCity value={filters.city} onChange={(city) => setFilters({ ...filters, city })} />
          <SelectOrganization value={filters.organization} onChange={(organization) => setFilters({ ...filters, organization })} />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="max-w-[60%] flex-1 space-y-2">
            <h2 className="text-2xl font-bold">{total.toLocaleString("fr")} missions partagées</h2>
            <div className="flex items-center gap-2">
              <p className="text-text-mention text-base">Dernière synchronisation le {lastImport ? new Date(lastImport.startedAt).toLocaleDateString("fr") : "N/A"}</p>
              {lastImport && new Date(lastImport.startedAt) > new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1) ? (
                <RiCheckboxCircleFill className="text-success text-base" />
              ) : (
                <ErrorIconSvg alt="error" className="fill-error h-4 w-4" />
              )}
              <Link to="/settings" className="link">
                Paraméter mon flux de missions
              </Link>
            </div>
          </div>

          <button className="tertiary-btn" onClick={handleExport}>
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
                {item.organizationName && <p className="text-sm">{item.organizationName}</p>}
              </td>
              <td className="px-4">{item.places}</td>
              <td className="px-4" colSpan={2}>
                {item.city}
              </td>
              <td className="px-4">{new Date(item.createdAt).toLocaleDateString("fr")}</td>
              <td className="px-6">
                <div className="flex items-center gap-1">
                  {item.statusCode === "ACCEPTED" ? <RiCheckboxCircleFill className="text-success text-2xl" /> : <ErrorIconSvg alt="error" className="fill-error h-6 w-6" />}
                  {item.statusComment && (
                    <div className="group relative">
                      <RiInformationLine className="text-text-mention text-2xl" />

                      <div className="border-grey-border absolute -top-1/2 right-8 z-10 hidden w-64 -translate-y-1/2 border bg-white p-4 shadow-lg group-hover:block">
                        <p className="text-sm">{item.statusComment}</p>
                      </div>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

export default Flux;
