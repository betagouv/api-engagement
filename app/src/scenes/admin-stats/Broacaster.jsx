import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RiFileDownloadLine } from "react-icons/ri";
import { useNavigate, useSearchParams } from "react-router-dom";

import Loader from "../../components/Loader";
import MultiSearchSelect from "../../components/MultiSearchSelect";
import { DateInput } from "../../components/NewDateRangePicker";
import Table from "../../components/NewTable";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const TABLE_HEADER = [
  { title: "Données", key: "name", colSpan: 2 },
  { title: "Redirections", key: "clickFrom" },
  { title: "Candidatures", key: "applyFrom" },
  { title: "Taux de conversion", key: "rate" },
];

const Broacaster = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    from: searchParams.has("from") ? new Date(searchParams.get("from")) : new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()),
    to: searchParams.has("to") ? new Date(searchParams.get("to")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 0, 0, 0, -1),
    type: searchParams.get("type") || "",
    publishers: [],
    source: searchParams.get("source") || "",
  });
  const [sortBy, setSortBy] = useState("clickFrom");
  const [data, setData] = useState([]);
  const [total, setTotal] = useState({
    broadcasters: 0,
    clicks: 0,
    applys: 0,
  });
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState([]);
  const { setPublisher } = useStore();

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.from) query.set("from", filters.from.toISOString());
        if (filters.to) query.set("to", filters.to.toISOString());
        if (filters.type) query.set("type", filters.type);
        if (filters.source) query.set("source", filters.source);
        if (filters.publishers.length > 0) query.set("broadcaster", filters.publishers.join(","));

        const res = await api.get(`/stats-admin/publishers-views?${query.toString()}`);

        if (!res.ok) throw res;
        const broadcasters = res.data
          .filter((item) => item.hasApiRights || item.hasWidgetRights || item.hasCampaignRights)
          .map((item) => ({
            ...item,
            rate: item.clickFrom === 0 ? 0 : item.applyFrom / item.clickFrom,
          }));
        setPartners(broadcasters.map((p) => ({ value: p._id, label: p.name })));
        setData(broadcasters);
        setTotal(res.total);
        setSearchParams(query);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters]);

  const handleRedirect = (partnerId) => {
    const p = data.find((p) => p._id === partnerId);
    setPublisher(p);
    localStorage.setItem("partnerId", partnerId);
    navigate("/home");
    window.scrollTo(0, 0);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams({
        from: filters.from.toISOString(),
        to: filters.to.toISOString(),
        type: filters.type,
        source: filters.source,
      });

      if (filters.publishers.length > 0) {
        query.set("broadcaster", filters.publishers.join(","));
      }

      const res = await api.get(`/stats-admin/publishers-views?${query.toString()}`);
      if (!res.ok) throw res;

      const csv =
        "Id;Nom du partenaire;Nombre de redirections;Nombre de candidatures;Taux de conversion\n" +
        res.data
          .filter((item) => item.hasApiRights || item.hasWidgetRights || item.hasCampaignRights)
          .map(
            (item) => `${item._id};${item.name};${item.clickFrom};${item.applyFrom};${item.clickFrom === 0 ? "0 %" : ((item.applyFrom / item.clickFrom) * 100).toFixed(1) + " %"}`,
          )
          .join("\n");

      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "statistiques_diffuseur.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      captureError(error, "Erreur lors de l'export des données");
    }
    setExporting(false);
  };

  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title>Diffuseurs - Statistiques - Administration - API Engagement</title>
      </Helmet>
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">{total.broadcasters} diffuseurs</h2>
        <button className="py-2 px-4 flex items-center text-blue-900 hover:bg-gray-hover border transition delay-50 " onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader className="w-4 h-" />
          ) : (
            <>
              <RiFileDownloadLine className="inline align-middle mr-2" /> Exporter
            </>
          )}
        </button>
      </div>
      <div className="flex box-border bg-white">
        <div className="flex gap-2 justify-between">
          <DateInput value={{ from: filters.from, to: filters.to }} onChange={(v) => setFilters({ ...filters, from: v.from, to: v.to })} />
          <MultiSearchSelect options={partners} value={filters.publishers} onChange={(e) => setFilters({ ...filters, publishers: e.value })} placeholder="Partenaires" />
          <label htmlFor="mission-type" className="sr-only">
            Type de mission
          </label>
          <select className="select w-[18em]" id="mission-type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option className="text-sm" value="">
              Type de mission
            </option>
            <option value="benevolat">Toutes les missions de bénévolat</option>
            <option value="volontariat">Toutes les missions de volontariat</option>
          </select>
          <label htmlFor="source" className="sr-only">
            Moyen de diffusion
          </label>
          <select className="select w-[18em]" id="source" value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
            <option className="text-sm" value="">
              Moyen de diffusion
            </option>
            <option value="publisher">API</option>
            <option value="widget">Widget</option>
            <option value="campaign">Campagne</option>
          </select>
        </div>
      </div>
      <div>
        <Table header={TABLE_HEADER} loading={loading} sortBy={sortBy} onSort={setSortBy} pageSize={500}>
          <tr className="bg-gray-50 table-header">
            <th className="p-4" colSpan={2}>
              <h4 className="text-base font-medium">Total</h4>
            </th>
            <th className="px-4">{total.clicks.toLocaleString("fr")}</th>
            <th className="px-4">{total.applys.toLocaleString("fr")}</th>
            <th className="px-4">{total.clicks === 0 ? "0 %" : (total.applys / total.clicks).toLocaleString("fr", { style: "percent", minimumFractionDigits: 1 })}</th>
          </tr>
          {data
            .filter((p) => p.clickFrom !== 0)
            .sort((a, b) => (sortBy === "name" ? a.name.localeCompare(b.name) : b[sortBy] - a[sortBy]))
            .map((item, i) => (
              <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                <td className="p-4" colSpan={2}>
                  <div className="flex flex-1 flex-wrap gap-x-2 text-left">
                    <div>
                      <div className="mb-1 cursor-pointer" onClick={() => handleRedirect(item._id)}>
                        <span className="text-base font-medium text-blue-800 hover:font-semibold hover:text-blue-900">{item.name}</span>
                      </div>
                      <>
                        <div className="flex gap-2 flex-wrap">
                          {item.isAnnonceur && (
                            <span className="text-gray-700 rounded-xl bg-[#fee2b5] px-2 py-1" style={{ fontSize: "12px" }}>
                              Annonceur
                            </span>
                          )}
                          {item.hasApiRights && (
                            <span className="text-gray-700 rounded-xl bg-[#dae6fd] px-2 py-1" style={{ fontSize: "12px" }}>
                              Diffuseur API
                            </span>
                          )}
                          {item.hasCampaignRights && (
                            <span className="text-gray-700 rounded-xl bg-[#dae6fd] px-2 py-1" style={{ fontSize: "12px" }}>
                              Diffuseur Campagne
                            </span>
                          )}
                          {item.hasWidgetRights && (
                            <span className="text-gray-700 rounded-xl bg-[#dae6fd] px-2 py-1" style={{ fontSize: "12px" }}>
                              Diffuseur Widget
                            </span>
                          )}
                        </div>
                      </>
                    </div>
                  </div>
                </td>
                <td className="px-4">{(item.clickFrom || 0).toLocaleString("fr")}</td>
                <td className="px-4">{(item.applyFrom || 0).toLocaleString("fr")}</td>
                <td className="px-4">{item.rate.toLocaleString("fr", { style: "percent", minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
        </Table>
      </div>
    </div>
  );
};

export default Broacaster;
