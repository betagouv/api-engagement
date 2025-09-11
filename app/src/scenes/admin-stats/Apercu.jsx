import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { HiChevronRight } from "react-icons/hi";
import { Link, useSearchParams } from "react-router-dom";

import EmptySVG from "../../assets/svg/empty-info.svg";
import Pie, { COLORS, LineChart, StackedBarchart } from "../../components/Chart";
import Loader from "../../components/Loader";
import DateRangePicker from "../../components/NewDateRangePicker";
import { MONTHS } from "../../constants";
import api from "../../services/api";
import { captureError } from "../../services/error";

const Apercu = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stickyVisible, setStickyVisible] = useState(false);
  const [filterSection, setFilterSection] = useState(null);

  const [filters, setFilters] = useState({
    from: searchParams.has("from") ? new Date(searchParams.get("from")) : new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()),
    to: searchParams.has("to") ? new Date(searchParams.get("to")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 0, 0, 0, -1),
    type: searchParams.get("type") || "",
  });

  useEffect(() => {
    const query = new URLSearchParams();
    if (filters.from) query.append("from", filters.from.toISOString());
    if (filters.to) query.append("to", filters.to.toISOString());
    setSearchParams(query);
  }, [filters, location.pathname]);

  useEffect(() => {
    if (!filterSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(filterSection);

    return () => {
      if (filterSection) {
        observer.unobserve(filterSection);
      }
    };
  }, [filterSection]);

  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title>Aperçu - Statistiques - Administration - API Engagement</title>
      </Helmet>

      {stickyVisible && (
        <div className="fixed top-0 left-0 w-full bg-white shadow-lg z-50 px-48 items-center justify-center py-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <DateRangePicker value={filters} onChange={(value) => setFilters({ ...filters, from: value.from, to: value.to })} />
            </div>
            <label htmlFor="mission-type-sticky" className="sr-only">
              Type de mission
            </label>
            <select id="mission-type-sticky" className="select w-80" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="">Tous les types de missions</option>
              <option value="benevolat">Toutes les missions de bénévolat</option>
              <option value="volontariat">Toutes les missions de volontariat</option>
            </select>
          </div>
        </div>
      )}

      <div ref={(node) => setFilterSection(node)}>
        <div className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm text-gray-425 uppercase font-semibold">Période</label>
            <DateRangePicker value={filters} onChange={(value) => setFilters({ ...filters, from: value.from, to: value.to })} />
          </div>
          <label htmlFor="mission-type" className="sr-only">
            Type de mission
          </label>
          <select id="mission-type" className="select w-80" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Tous les types de missions</option>
            <option value="benevolat">Toutes les missions de bénévolat</option>
            <option value="volontariat">Toutes les missions de volontariat</option>
          </select>
        </div>
      </div>
      <div className="border-b border-b-gray-900" />

      <Engagement filters={filters} />
      <Mission filters={filters} />
      <Patners filters={filters} />
    </div>
  );
};

const Engagement = ({ filters }) => {
  const [data, setData] = useState({
    totalClicks: 0,
    totalApplies: 0,
    totalBenevolatClicks: 0,
    totalVolontariatClicks: 0,
    totalBenevolatApplies: 0,
    totalVolontariatApplies: 0,
    histogram: [],
  });
  const [activeMissionData, setActiveMissionData] = useState({ histogram: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.from) query.append("from", filters.from.toISOString());
        if (filters.to) query.append("to", filters.to.toISOString());
        if (filters.type) query.append("type", filters.type);

        const res = await api.get(`/stats-admin/views?${query.toString()}`);
        if (!res.ok) throw res;
        setData(res.data);

        const resA = await api.get(`/stats-admin/active-missions?${query.toString()}`);
        if (!resA.ok) throw resA;
        setActiveMissionData(resA.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters]);

  const buildLine = (dataStats, dataMissions) => {
    if (!dataStats || !dataMissions) return [];
    const res = {};
    const diff = (filters.to.getTime() - filters.from.getTime()) / (1000 * 60 * 60 * 24);

    dataStats.forEach((d) => {
      const date = new Date(d.key);
      const name = diff < 61 ? date.toLocaleDateString("fr") : `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      res[d.key] = {
        date,
        name,
        Redirections: filters.type === "volontariat" ? d.clicks.volontariat : filters.type === "benevolat" ? d.clicks.benevolat : d.clicks.total,
        Candidatures: filters.type === "volontariat" ? d.applies.volontariat : filters.type === "benevolat" ? d.applies.benevolat : d.applies.total,
        "Missions actives": 0,
      };
    });

    dataMissions.forEach((d) => {
      const date = new Date(d.key);
      const name = diff < 61 ? date.toLocaleDateString("fr") : `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

      if (res[d.key]) {
        res[d.key]["Missions actives"] = filters.type === "volontariat" ? d.volontariat : filters.type === "benevolat" ? d.benevolat : d.doc_count;
      } else {
        res[d.key] = {
          date,
          name,
          Redirections: 0,
          Candidatures: 0,
          "Missions actives": filters.type === "volontariat" ? d.volontariat : filters.type === "benevolat" ? d.benevolat : d.doc_count,
        };
      }
    });
    return Object.values(res).sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const buildHistogram = (data, type = "clicks") => {
    const res = [];
    if (!data) return res;
    const diff = (filters.to.getTime() - filters.from.getTime()) / (1000 * 60 * 60 * 24);
    data.forEach((d) => {
      const date = new Date(d.key);
      const name = diff < 61 ? date.toLocaleDateString("fr") : `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      const obj = { name, Bénévolat: d[type].benevolat, Volontariat: d[type].volontariat };

      res.push(obj);
    });
    return res;
  };

  const histogramClicks = buildHistogram(data.histogram, "clicks");
  const histogramApplies = buildHistogram(data.histogram, "applies");
  const lineData = buildLine(data.histogram, activeMissionData.histogram);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">🫶 Engagement généré</h2>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          <div className="border border-gray-900 p-4">
            <div className="flex justify-between mb-4">
              <div>
                <span className="text-lg font-bold mr-2">{data.totalClicks.toLocaleString("fr")}</span>
                <span className="text-gray-600 text-lg">redirections</span>
              </div>
              <div>
                {filters.type === "" || filters.type === "benevolat" ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-6 bg-[rgba(117,165,236,1)]"></span> <span className="font-bold text-gray-600">Bénévolat - </span>
                    <span className="text-gray-500">{data.totalBenevolatClicks.toLocaleString("fr")}</span>
                  </div>
                ) : null}
                {filters.type === "" || filters.type === "volontariat" ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-6 bg-[rgba(251,146,107,1)]"></span>
                    <span className="font-bold text-gray-600">Volontariat - </span>
                    <span className="text-gray-500">{data.totalVolontariatClicks.toLocaleString("fr")}</span>
                  </div>
                ) : null}
              </div>
            </div>
            {!histogramClicks.length ? (
              <div className="w-full h-[248px] bg-[#f6f6f6] flex flex-col justify-center items-center border border-dashed border-[#ddddd]">
                <img src={EmptySVG} alt="empty" className="w-16 h-16" />
                <p className="text-base text-[#666]">Aucune donnée disponible pour la période</p>
              </div>
            ) : (
              <div className="h-[420px] w-full">
                <StackedBarchart data={histogramClicks} dataKey={["Bénévolat", "Volontariat"]} color={["rgba(117,165,236,1)", "rgba(251,146,107,1)"]} legend={false} />
              </div>
            )}
          </div>

          <div className="border border-gray-900 p-4">
            <div className="flex justify-between mb-4">
              <div>
                <span className="text-lg font-bold mr-2">{data.totalApplies.toLocaleString("fr")}</span>
                <span className="text-gray-600 text-lg">candidatures</span>
              </div>
              <div>
                {filters.type === "" || filters.type === "benevolat" ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-6 bg-[rgba(117,165,236,1)]"></span> <span className="font-bold text-gray-600">Bénévolat - </span>
                    <span className="text-gray-500">{data.totalBenevolatApplies.toLocaleString("fr")}</span>
                  </div>
                ) : null}
                {filters.type === "" || filters.type === "volontariat" ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-6 bg-[rgba(251,146,107,1)]"></span>
                    <span className="font-bold text-gray-600">Volontariat - </span>
                    <span className="text-gray-500">{data.totalVolontariatApplies.toLocaleString("fr")}</span>
                  </div>
                ) : null}
              </div>
            </div>
            {!histogramApplies.length ? (
              <div className="w-full h-[248px] bg-[#f6f6f6] flex flex-col justify-center items-center border border-dashed border-[#ddddd]">
                <img src={EmptySVG} alt="empty" className="w-16 h-16" />
                <p className="text-base text-[#666]">Aucune donnée disponible pour la période</p>
              </div>
            ) : (
              <div className="h-[420px] w-full">
                <StackedBarchart data={histogramApplies} dataKey={["Bénévolat", "Volontariat"]} color={["rgba(117,165,236,1)", "rgba(251,146,107,1)"]} legend={false} />
              </div>
            )}
          </div>

          <div className="border border-gray-900 p-4">
            <div className="flex justify-between mb-6">
              <div className="">
                <span className="text-lg font-bold">Evolution de l'engagement</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-6 bg-[#fdc639]"></span> <span className="font-bold text-gray-600">Missions actives</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-6 bg-[#6a6af4]"></span>
                  <span className="font-bold text-gray-600">Redirections </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-6 bg-[#4cb4bd]"></span> <span className="font-bold text-gray-600">Candidatures</span>
                </div>
              </div>
            </div>
            <div className="h-[420px] w-full">
              <LineChart data={lineData} dataKey={["Redirections", "Candidatures", "Missions actives"]} nameKey="name" color={["#6a6af4", "#4cb4bd", "#fdc639"]} legend={false} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Mission = ({ filters }) => {
  const [data, setData] = useState({
    totalActiveMissions: 0,
    activeBenevolatMissions: 0,
    activeVolontariatMissions: 0,
    totalMission: 0,
    totalBenevolatMissions: 0,
    totalVolontariatMissions: 0,
    histogram: [],
  });
  const [activeMissionData, setActiveMissionData] = useState({ histogram: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.from) query.append("from", filters.from.toISOString());
        if (filters.to) query.append("to", filters.to.toISOString());

        const res = await api.get(`/stats-admin/created-missions?${query.toString()}`);
        if (!res.ok) throw res;
        setData(res.data);

        const resA = await api.get(`/stats-admin/active-missions?${query.toString()}`);
        if (!resA.ok) throw resA;
        setActiveMissionData(resA.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters]);

  const buildHistogram = (data) => {
    const res = [];
    if (!data) return res;
    data.forEach((d) => {
      const date = new Date(d.key);
      const label = date.toLocaleDateString("fr");
      const obj = { name: label };
      if (!filters.type || filters.type === "benevolat") obj["Bénévolat"] = d.benevolat;
      if (!filters.type || filters.type === "volontariat") obj["Volontariat"] = d.volontariat;
      res.push(obj);
    });
    return res;
  };

  const histogramActives = buildHistogram(activeMissionData.histogram);
  const histogramCreated = buildHistogram(data.histogram);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">🚀 Missions</h2>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          <div className="border border-gray-900 p-4">
            <div className="flex justify-between mb-4">
              <div>
                <span className="text-lg font-bold mr-2">
                  {filters.type === ""
                    ? data.totalActiveMissions.toLocaleString("fr")
                    : filters.type === "benevolat"
                      ? data.activeBenevolatMissions.toLocaleString("fr")
                      : data.activeVolontariatMissions.toLocaleString("fr")}
                </span>
                <span className="text-gray-600 text-lg">missions actives</span>
              </div>
              <div>
                {filters.type === "" || filters.type === "benevolat" ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-6 bg-[rgba(117,165,236,1)]"></span> <span className="font-bold text-gray-600">Bénévolat - </span>
                    <span className="text-gray-500">{data?.activeBenevolatMissions.toLocaleString("fr")}</span>
                  </div>
                ) : null}
                {filters.type === "" || filters.type === "volontariat" ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-6 bg-[rgba(251,146,107,1)]"></span>
                    <span className="font-bold text-gray-600">Volontariat - </span>
                    <span className="text-gray-500">{data?.activeVolontariatMissions.toLocaleString("fr")}</span>
                  </div>
                ) : null}
              </div>
            </div>
            {!histogramActives.length ? (
              <div className="w-full h-[248px] bg-[#f6f6f6] flex flex-col justify-center items-center border border-dashed border-[#ddddd]">
                <img src={EmptySVG} alt="empty" className="w-16 h-16" />
                <p className="text-base text-[#666]">Aucune donnée disponible pour la période</p>
              </div>
            ) : (
              <div className="h-[420px] w-full">
                <StackedBarchart data={histogramActives} dataKey={["Bénévolat", "Volontariat"]} color={["rgba(117,165,236,1)", "rgba(251,146,107,1)"]} legend={false} />
              </div>
            )}
          </div>
          <div className="border border-gray-900 p-4">
            <div className="flex justify-between mb-4">
              <div>
                <span className="text-lg font-bold mr-2">
                  {filters.type === ""
                    ? data.totalMission.toLocaleString("fr")
                    : filters.type === "benevolat"
                      ? data.totalBenevolatMissions.toLocaleString("fr")
                      : data.totalVolontariatMissions.toLocaleString("fr")}
                </span>
                <span className="text-gray-600 text-lg">missions créées</span>
              </div>

              <div>
                {filters.type === "" || filters.type === "benevolat" ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-6 bg-[rgba(117,165,236,1)]"></span>
                    <span className="font-bold text-gray-600">Bénévolat</span>
                    <span className="text-gray-500"> - {data?.totalBenevolatMissions.toLocaleString("fr")}</span>
                  </div>
                ) : null}
                {filters.type === "" || filters.type === "volontariat" ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-6 bg-[rgba(251,146,107,1)]"></span>
                    <span className="font-bold text-gray-600">Volontariat</span>
                    <span className="text-gray-500"> - {data?.totalVolontariatMissions.toLocaleString("fr")}</span>
                  </div>
                ) : null}
              </div>
            </div>
            {!histogramCreated.length ? (
              <div className="w-full h-[248px] bg-[#f6f6f6] flex flex-col justify-center items-center border border-dashed border-[#ddddd]">
                <img src={EmptySVG} alt="empty" className="w-16 h-16" />
                <p className="text-base text-[#666]">Aucune donnée disponible pour la période</p>
              </div>
            ) : (
              <div className="h-[420px] w-full">
                <StackedBarchart data={histogramCreated} dataKey={["Bénévolat", "Volontariat"]} color={["rgba(117,165,236,1)", "rgba(251,146,107,1)"]} legend={false} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const Patners = ({ filters }) => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState({
    broadcasters: 0,
    announcers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.from) query.append("from", filters.from.toISOString());
        if (filters.to) query.append("to", filters.to.toISOString());
        if (filters.type) query.append("type", filters.type);

        const res = await api.get(`/stats-admin/publishers-views?${query.toString()}`);
        if (!res.ok) throw res;
        setData(res.data);
        setTotal(res.total);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters]);

  const buildPie = (data, key = "applyFrom") => {
    const res = [];
    if (!data) return res;
    data.sort((a, b) => b[key] - a[key]);
    data.slice(0, 5).forEach((d) => {
      res.push({ name: d.name, value: d[key], color: COLORS[res.length % COLORS.length] });
    });
    res.push({ name: "Autres", value: data.slice(5).reduce((acc, curr) => acc + curr[key], 0) });
    return res;
  };

  const broadcastPie = buildPie(
    data.filter((d) => d.hasApiRights || d.hasWidgetRights || d.hasCampaignRights),
    "applyFrom",
  );
  const announcePie = buildPie(
    data.filter((d) => d.isAnnonceur),
    "applyTo",
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">🤝 Partenaires</h2>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          <div className="border border-gray-900 p-4 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold">
                {total.broadcasters.toLocaleString("fr")}
                <span className="text-[#666] ml-2 font-normal text-lg">diffuseurs</span>
              </h3>
              <p className="text-[#666] text-sm">Top des diffuseurs ayant généré le plus de candidatures</p>
            </div>
            {!data.filter((d) => d.hasApiRights || d.hasWidgetRights || d.hasCampaignRights).length ? (
              <div className="w-full h-[248px] bg-[#f6f6f6] flex flex-col justify-center items-center border border-dashed border-[#ddddd]">
                <img src={EmptySVG} alt="empty" className="w-16 h-16" />
                <p className="text-base text-[#666]">Aucune donnée disponible pour la période</p>
              </div>
            ) : (
              <div className="flex justify-between gap-4">
                <div className="w-2/3">
                  <table className="w-full table-fixed">
                    <thead className="text-left">
                      <tr className="text-gray-500 text-xs uppercase">
                        <th colSpan={3} className="px-4">
                          Diffuseur
                        </th>
                        <th className="px-4 text-right">Redirections</th>
                        <th className="px-4 text-right">Candidatures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data
                        .filter((d) => d.hasApiRights || d.hasWidgetRights || d.hasCampaignRights)
                        .sort((a, b) => b.applyFrom - a.applyFrom)
                        .slice(0, 5)
                        .map((item, i) => (
                          <tr key={i}>
                            <td colSpan={3} className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-4 mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <div className="flex-1 text-sm font-semibold">{item.name}</div>
                              </div>
                            </td>
                            <td className="px-4 text-right text-sm">{item.clickFrom.toLocaleString("fr")}</td>
                            <td className="px-4 text-right text-sm">{item.applyFrom.toLocaleString("fr")}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div className="flex gap-1 mt-2">
                    <Link to={`/admin-stats/diffuseur?from=${filters.from.toISOString()}&to=${filters.to.toISOString()}`} className="text-blue-900 text-sm px-4 flex items-center">
                      Tout voir
                      <HiChevronRight className="flex items-center pt-1" />
                    </Link>
                  </div>
                </div>
                <div className="w-1/3 flex justify-center items-center ml-24 mr-8">
                  <div className="w-full h-56">
                    <Pie data={broadcastPie} innerRadius="0%" unit="missions" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border border-gray-900 p-4 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold">
                {total.announcers.toLocaleString("fr")}
                <span className="text-[#666] ml-2 font-normal text-lg">annonceurs</span>
              </h3>
              <p className="text-[#666] text-sm">Top des annonceurs ayant reçu le plus de candidatures</p>
            </div>
            {!data.filter((d) => d.isAnnonceur).length ? (
              <div className="w-full h-[248px] bg-[#f6f6f6] flex flex-col justify-center items-center border border-dashed border-[#ddddd]">
                <img src={EmptySVG} alt="empty" className="w-16 h-16" />
                <p className="text-base text-[#666]">Aucune donnée disponible pour la période</p>
              </div>
            ) : (
              <div className="flex justify-between gap-4">
                <div className="w-2/3">
                  <table className="w-full table-fixed">
                    <thead className="text-left">
                      <tr className="text-gray-500 text-xs uppercase">
                        <th colSpan={3} className="px-4">
                          Annonceur
                        </th>
                        <th className="px-4 text-right">Redirections</th>
                        <th className="px-4 text-right">Candidatures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data
                        .filter((d) => d.isAnnonceur)
                        .sort((a, b) => b.applyTo - a.applyTo)
                        .slice(0, 5)
                        .map((item, i) => (
                          <tr key={i}>
                            <td colSpan={3} className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-4 mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <div className="flex-1 text-sm font-semibold">{item.name}</div>
                              </div>
                            </td>
                            <td className="px-4 text-right text-sm">{item.clickTo.toLocaleString("fr")}</td>
                            <td className="px-4 text-right text-sm">{item.applyTo.toLocaleString("fr")}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div className="flex gap-1 mt-2">
                    <Link to={`/admin-stats/annonceur?from=${filters.from.toISOString()}&to=${filters.to.toISOString()}`} className="text-blue-900 text-sm px-4 flex items-center">
                      Tout voir
                      <HiChevronRight className="flex items-center pt-1" />
                    </Link>
                  </div>
                </div>
                <div className="w-1/3 flex justify-center items-center ml-24 mr-8">
                  <div className="w-full h-56">
                    <Pie data={announcePie} innerRadius="0%" unit="missions" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Apercu;
