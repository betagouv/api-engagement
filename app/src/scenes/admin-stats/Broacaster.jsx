import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { DateInput } from "@/components/DateRangePicker";
import Table from "@/components/Table";
import { MISSION_TYPE_OPTIONS } from "@/constants";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { withLegacyPublishers } from "@/utils/publisher";

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
    publisher: searchParams.get("broadcaster") || "",
    source: searchParams.get("source") || "",
  });
  const [sortBy, setSortBy] = useState("clickFrom");
  const [data, setData] = useState([]);
  const [total, setTotal] = useState({
    broadcasters: 0,
    clicks: 0,
    applys: 0,
  });
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState([]);
  const { user, setPublisher } = useStore();

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchPartners = async () => {
      if (!user) return;

      try {
        const query = user.role === "admin" ? {} : { ids: user.publishers };
        const res = await api.post("/publisher/search", query);
        if (!res.ok) {
          throw res;
        }

        const options = withLegacyPublishers(res.data)
          .filter((publisher) => publisher?.id || publisher?._id)
          .filter((publisher) => publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights)
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .map((publisher) => ({
            value: String(publisher.id || publisher._id),
            label: publisher.name || "Partenaire inconnu",
          }));

        setPartners(options);
      } catch (error) {
        captureError(error, { extra: { userRole: user.role, userPublishers: user.publishers } });
      }
    };

    fetchPartners();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.from) query.set("from", filters.from.toISOString());
        if (filters.to) query.set("to", filters.to.toISOString());
        if (filters.type) query.set("type", filters.type);
        if (filters.source) query.set("source", filters.source);
        if (filters.publisher) query.set("broadcaster", filters.publisher);

        const res = await api.get(`/stats-admin/publishers-views?${query.toString()}`);

        if (!res.ok) throw res;
        const broadcasters = res.data
          .filter((item) => item.hasApiRights || item.hasWidgetRights || item.hasCampaignRights)
          .map((item) => ({
            ...item,
            rate: item.clickFrom === 0 ? 0 : item.applyFrom / item.clickFrom,
          }));
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

  return (
    <div className="space-y-12 p-12">
      <title>Diffuseurs - Statistiques - Administration - API Engagement</title>
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">{total.broadcasters} diffuseurs</h2>
      </div>
      <div className="box-border flex bg-white">
        <div className="flex justify-between gap-2">
          <DateInput value={{ from: filters.from, to: filters.to }} onChange={(v) => setFilters({ ...filters, from: v.from, to: v.to })} />
          <label htmlFor="broadcaster" className="sr-only">
            Partenaire diffuseur
          </label>
          <select id="broadcaster" className="select w-[18em]" value={filters.publisher} onChange={(e) => setFilters({ ...filters, publisher: e.target.value })}>
            <option value="">Partenaires</option>
            {partners.map((partner) => (
              <option key={partner.value} value={partner.value}>
                {partner.label}
              </option>
            ))}
          </select>
          <label htmlFor="mission-type" className="sr-only">
            Type de mission
          </label>
          <select className="select w-[18em]" id="mission-type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option className="text-sm" value="">
              Type de mission
            </option>
            {MISSION_TYPE_OPTIONS.map((missionType) => (
              <option key={missionType.value} value={missionType.value}>
                {missionType.label}
              </option>
            ))}
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
          <tr className="table-header bg-gray-50">
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
