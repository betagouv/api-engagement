import { useEffect, useState } from "react";
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
  { title: "Redirections", key: "clickTo" },
  { title: "Candidatures", key: "applyTo" },
  { title: "Taux de conversion", key: "rate" },
];

const Announcer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    from: searchParams.has("from") ? new Date(searchParams.get("from")) : new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()),
    to: searchParams.has("to") ? new Date(searchParams.get("to")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 0, 0, 0, -1),
    type: searchParams.get("type") || "",
    publishers: [],
    search: searchParams.get("search") || "",
  });
  const [sortBy, setSortBy] = useState("clickTo");
  const [data, setData] = useState([]);
  const [total, setTotal] = useState({
    announcers: 0,
    clicks: 0,
    applys: 0,
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
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
        if (filters.publishers.length > 0) query.set("announcer", filters.publishers.join(","));

        const res = await api.get(`/stats-admin/publishers-views?${query.toString()}`);

        if (!res.ok) throw res;
        const announcers = res.data
          .filter((item) => item.isAnnonceur)
          .map((item) => ({
            ...item,
            rate: item.clickTo === 0 ? 0 : item.applyTo / item.clickTo,
          }));

        setPartners(announcers.map((p) => ({ label: p.name, value: p._id })));
        setData(announcers);
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
      });

      if (filters.publishers.length > 0) {
        query.set("announcer", filters.publishers.join(","));
      }

      const res = await api.get(`/stats-admin/publishers-views?${query.toString()}`);
      if (!res.ok) throw res;

      const csv =
        "Id;Nom du partenaire;Nombre de redirections;Nombre de candidatures;Taux de conversion\n" +
        res.data
          .filter((item) => item.isAnnonceur)
          .map((item) => `${item._id};${item.name};${item.clickTo};${item.applyTo};${item.clickTo === 0 ? "0 %" : ((item.applyTo / item.clickTo) * 100).toFixed(1) + " %"}`)
          .join("\n");

      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "statistiques_annonceur.csv");
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
      <title>Annonceurs - Statistiques - Administration - API Engagement</title>
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">{total.announcers} annonceurs</h2>
        <button className="hover:bg-gray-975 flex items-center border px-4 py-2 text-blue-900 transition delay-50" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader className="h- w-4" />
          ) : (
            <>
              <RiFileDownloadLine className="mr-2 inline align-middle" /> Exporter
            </>
          )}
        </button>
      </div>
      <div className="box-border flex">
        <div className="flex w-full justify-between gap-2">
          <DateInput value={{ from: filters.from, to: filters.to }} onChange={(v) => setFilters({ ...filters, from: v.from, to: v.to })} />
          <MultiSearchSelect options={partners} value={filters.publishers} onChange={(e) => setFilters({ ...filters, publishers: e.value })} placeholder="Partenaires" />
          <label htmlFor="mission-type" className="sr-only">
            Type de mission
          </label>
          <select id="mission-type" className="select min-w-[27.5em]" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Type de mission</option>
            <option value="benevolat">Toutes les missions de bénévolat</option>
            <option value="volontariat">Toutes les missions de volontariat</option>
          </select>
        </div>
      </div>

      <Table header={TABLE_HEADER} loading={loading} sortBy={sortBy} onSort={setSortBy} pageSize={500}>
        <tr className="table-header">
          <th className="p-4" colSpan={2}>
            <h4 className="text-base font-medium">Total</h4>
          </th>
          <th className="px-4">{total.clicks.toLocaleString("fr")}</th>
          <th className="px-4">{total.applys.toLocaleString("fr")}</th>
          <th className="px-4">{total.clicks === 0 ? "0 %" : (total.applys / total.clicks).toLocaleString("fr", { style: "percent", minimumFractionDigits: 1 })}</th>
        </tr>
        {data
          .filter((p) => p.clickTo !== 0)
          .sort((a, b) => (sortBy === "name" ? a.name.localeCompare(b.name) : b[sortBy] - a[sortBy]))
          .map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
              <td className="p-4" colSpan={2}>
                <div className="flex flex-1 flex-wrap gap-x-2 text-left">
                  <div>
                    <div className="mb-1 cursor-pointer" onClick={() => handleRedirect(item._id)}>
                      <span className="text-base font-medium text-blue-800 hover:font-semibold hover:text-blue-900">{item.name}</span>
                    </div>
                    <>
                      <div className="flex flex-wrap gap-2">
                        {item.isAnnonceur && (
                          <span className="rounded-xl bg-[#fee2b5] px-2 py-1 text-gray-700" style={{ fontSize: "12px" }}>
                            Annonceur
                          </span>
                        )}
                        {item.hasApiRights && (
                          <span className="rounded-xl bg-[#dae6fd] px-2 py-1 text-gray-700" style={{ fontSize: "12px" }}>
                            Diffuseur API
                          </span>
                        )}
                        {item.hasCampaignRights && (
                          <span className="rounded-xl bg-[#dae6fd] px-2 py-1 text-gray-700" style={{ fontSize: "12px" }}>
                            Diffuseur Campagne
                          </span>
                        )}
                        {item.hasWidgetRights && (
                          <span className="rounded-xl bg-[#dae6fd] px-2 py-1 text-gray-700" style={{ fontSize: "12px" }}>
                            Diffuseur Widget
                          </span>
                        )}
                      </div>
                    </>
                  </div>
                </div>
              </td>
              <td className="px-4">{(item.clickTo || 0).toLocaleString("fr")}</td>
              <td className="px-4">{(item.applyTo || 0).toLocaleString("fr")}</td>
              <td className="px-4">{item.rate.toLocaleString("fr", { style: "percent", minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
      </Table>
    </div>
  );
};

export default Announcer;
