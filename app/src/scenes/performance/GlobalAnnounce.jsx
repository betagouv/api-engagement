import { useEffect, useState } from "react";
import EmptySVG from "../../assets/svg/empty-info.svg";
import { Pie, StackedBarchart } from "../../components/Chart";
import DateRangePicker from "../../components/DateRangePicker";
import Loader from "../../components/Loader";
import Tabs from "../../components/Tabs";
import { METABASE_CARD_ID, MONTHS } from "../../constants";
import { useAnalyticsProvider } from "../../services/analytics/provider";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import AnalyticsCard from "./AnalyticsCard";

const COLORS = ["rgba(250,117,117,255)", "rgba(252,205,109,255)", "rgba(251,146,107,255)", "rgba(110,213,197,255)", "rgba(114,183,122,255)", "rgba(146,146,146,255)"];
const TYPE = {
  print: "Impressions",
  click: "Redirections",
  account: "Créations de compte",
  apply: "Candidatures",
};

const GlobalAnnounce = ({ filters, onFiltersChange }) => {
  const { publisher } = useStore();
  const [totalMissionAvailable, setTotalMissionAvailable] = useState(0);
  const [loadingMission, setLoadingMission] = useState(true);

  useEffect(() => {
    const fetchAvailableMission = async () => {
      setLoadingMission(true);
      try {
        const res = await api.post("/mission/search", {
          publisherId: publisher.id,
          availableFrom: filters.from,
          availableTo: filters.to,
          size: 0,
        });
        if (!res.ok) throw res;
        setTotalMissionAvailable(res.total);
      } catch (error) {
        captureError(error, { extra: { filters } });
      }
      setLoadingMission(false);
    };
    fetchAvailableMission();
  }, [filters, publisher]);

  return (
    <div className="space-y-12 p-12">
      <div className="space-y-2">
        <p className="text-text-mention text-sm font-semibold uppercase">Période</p>
        <DateRangePicker value={filters} onChange={(value) => onFiltersChange({ ...filters, ...value })} />
      </div>
      <div className="h-px w-full bg-gray-900" />
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Aperçu</h2>
          <p className="text-text-mention text-base">Vos missions partagées et l’impact que vos diffuseurs ont généré pour vous</p>
        </div>
        <div className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border-grey-border border p-6">
              {loadingMission ? (
                <div className="flex w-full justify-center py-10">
                  <Loader />
                </div>
              ) : (
                <>
                  <p className="text-[28px] font-bold">{totalMissionAvailable.toLocaleString("fr")}</p>
                  <p className="text-base">{totalMissionAvailable > 1 ? "missions disponibles sur la période" : "mission disponible sur la période"}</p>
                </>
              )}
            </div>
            <AnalyticsCard
              cardId={METABASE_CARD_ID.ANNONCEUR_TOTAL_MISSIONS}
              filters={filters}
              type="kpi"
              kpiLabel="missions ayant reçu au moins une redirection sur la période"
              variables={{ publisher_id: publisher.id }}
              adapterOptions={{ valueColumn: "total_mission_click" }}
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <AnalyticsCard
              cardId={METABASE_CARD_ID.ANNONCEUR_TOTAL_EVENTS}
              filters={filters}
              type="kpi"
              kpiLabel="impressions"
              kpiTooltip="Les impressions des liens situés dans des emails ou SMS ne sont pas comptabilisés dans ce total"
              variables={{ publisher_id: publisher.id }}
              adapterOptions={{ valueColumn: "total_print" }}
            />
            <AnalyticsCard
              cardId={METABASE_CARD_ID.ANNONCEUR_TOTAL_EVENTS}
              filters={filters}
              type="kpi"
              kpiLabel="redirections"
              variables={{ publisher_id: publisher.id }}
              adapterOptions={{ valueColumn: "total_click" }}
            />
            <AnalyticsCard
              cardId={METABASE_CARD_ID.ANNONCEUR_TOTAL_EVENTS}
              filters={filters}
              type="kpi"
              kpiLabel="créations de compte"
              variables={{ publisher_id: publisher.id }}
              adapterOptions={{ valueColumn: "total_account" }}
            />
            <AnalyticsCard
              cardId={METABASE_CARD_ID.ANNONCEUR_TOTAL_EVENTS}
              filters={filters}
              type="kpi"
              kpiLabel="candidatures"
              variables={{ publisher_id: publisher.id }}
              adapterOptions={{ valueColumn: "total_apply" }}
            />
          </div>
        </div>
      </div>
      <>
        <Evolution filters={filters} defaultType="print" />
        <Announcers filters={filters} defaultType="print" />
      </>
    </div>
  );
};

const Evolution = ({ filters, defaultType = "print" }) => {
  const { publisher } = useStore();
  const analyticsProvider = useAnalyticsProvider();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState(defaultType);
  const tabs = [
    {
      key: "print",
      label: "Impressions",
      isActive: type === "print",
      onSelect: () => setType("print"),
    },
    {
      key: "click",
      label: "Redirections",
      isActive: type === "click",
      onSelect: () => setType("click"),
    },
    {
      key: "account",
      label: "Créations de compte",
      isActive: type === "account",
      onSelect: () => setType("account"),
    },
    {
      key: "apply",
      label: "Candidatures",
      isActive: type === "apply",
      onSelect: () => setType("apply"),
    },
  ].map((tab) => ({
    ...tab,
    id: `announce-evolution-tab-${tab.key}`,
  }));
  const activeTab = tabs.find((tab) => tab.isActive) || tabs[0];
  const activeTabId = activeTab ? activeTab.id : null;

  useEffect(() => {
    if (!analyticsProvider?.query) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const variables = { publisher_id: String(publisher.id), flux: "to", type };
        if (filters.from) variables.from = filters.from.toISOString();
        if (filters.to) variables.to = filters.to.toISOString();

        const raw = await analyticsProvider.query({
          cardId: METABASE_CARD_ID.EVOLUTION_STAT_EVENT,
          variables,
          signal: controller.signal,
        });

        const rawRows = raw?.data?.rows || raw?.rows || [];
        const cols = raw?.data?.cols || raw?.cols || [];

        const getColumnIndex = (column) => {
          if (!cols?.length) return -1;
          return cols.findIndex((c) => c.name === column || c.display_name === column);
        };

        const bucketIndex = getColumnIndex("bucket");
        const publisherIndex = getColumnIndex("publisher_bucket");
        const countIndex = getColumnIndex("doc_count");

        const parsed = rawRows.map((row) => {
          if (row && !Array.isArray(row)) {
            return {
              bucket: row.bucket,
              publisher: row.publisher_bucket,
              count: Number(row.doc_count) || 0,
            };
          }

          const safeBucketIndex = bucketIndex >= 0 ? bucketIndex : 0;
          const safePublisherIndex = publisherIndex >= 0 ? publisherIndex : 1;
          const safeCountIndex = countIndex >= 0 ? countIndex : 2;
          return {
            bucket: row?.[safeBucketIndex],
            publisher: row?.[safePublisherIndex],
            count: Number(row?.[safeCountIndex]) || 0,
          };
        });

        setRows(parsed);
      } catch (error) {
        if (error.name === "AbortError") return;
        captureError(error, { extra: { filters, type } });
        setRows([]);
      }
      setLoading(false);
    };
    fetchData();
    return () => controller.abort();
  }, [filters, type, publisher, analyticsProvider]);

  const buildHistogram = (data) => {
    if (!data) return { histogram: [], keys: [] };
    const keysSet = new Set();
    const map = new Map();
    const diff = filters?.from && filters?.to ? (filters.to.getTime() - filters.from.getTime()) / (1000 * 60 * 60 * 24) : 0;

    data.forEach((row) => {
      if (!row?.bucket) return;
      const date = row.bucket instanceof Date ? row.bucket : new Date(row.bucket);
      if (Number.isNaN(date.getTime())) return;
      const key = date.getTime();
      const entry = map.get(key) || {
        name: diff < 61 ? date.toLocaleDateString("fr") : `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
      };
      const publisher = row.publisher || "Autres";
      entry[publisher] = (entry[publisher] || 0) + (Number(row.count) || 0);
      keysSet.add(publisher);
      map.set(key, entry);
    });

    const keys = Array.from(keysSet).filter((key) => key !== "Autres");
    if (keysSet.has("Autres")) keys.push("Autres");

    const sorted = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, entry]) => {
        keys.forEach((key) => {
          if (entry[key] === undefined) entry[key] = 0;
        });
        return entry;
      });

    return { histogram: sorted, keys };
  };

  const { histogram, keys } = buildHistogram(rows);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Evolution</h2>
        <p className="text-text-mention text-base">Trafic reçu grâce à vos partenaires diffuseurs</p>
      </div>
      <div className="border-grey-border border p-4">
        <Tabs
          tabs={tabs}
          ariaLabel="Trafic reçu grâce à vos partenaires diffuseurs"
          panelId="announce-evolution-panel"
          className="mb-8 flex items-center gap-8 text-sm"
          variant="underline"
        />
        <div id="announce-evolution-panel" role="tabpanel" aria-labelledby={activeTabId || undefined}>
          {loading ? (
            <div className="flex h-[248px] items-center justify-center">
              <Loader />
            </div>
          ) : !histogram.length ? (
            <div className="border-grey-border bg-background-grey-hover flex h-[248px] w-full flex-col items-center justify-center border border-dashed">
              <img src={EmptySVG} alt="empty" className="h-16 w-16" />
              <p className="text-color-gray-425 text-base">Aucune donnée disponible pour la période</p>
            </div>
          ) : (
            <div className="h-[424px] w-full">
              <StackedBarchart data={histogram} dataKey={keys} />
            </div>
          )}
        </div>
        {loading ? (
          <div className="flex h-[248px] items-center justify-center">
            <Loader />
          </div>
        ) : !histogram.length ? (
          <div className="border-grey-border bg-background-grey-hover flex h-[248px] w-full flex-col items-center justify-center border border-dashed">
            <img src={EmptySVG} alt="empty" className="h-16 w-16" />
            <p className="text-color-gray-425 text-base">Aucune donnée disponible pour la période</p>
          </div>
        ) : (
          <div className="h-[424px] w-full">
            <StackedBarchart data={histogram} dataKey={keys} />
          </div>
        )}
      </div>
    </div>
  );
};

const Announcers = ({ filters, defaultType = "print" }) => {
  const { publisher } = useStore();
  const analyticsProvider = useAnalyticsProvider();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState(defaultType);
  const tabs = [
    {
      key: "print",
      label: "Impressions",
      isActive: type === "print",
      onSelect: () => setType("print"),
    },
    {
      key: "click",
      label: "Redirections",
      isActive: type === "click",
      onSelect: () => setType("click"),
    },
    {
      key: "account",
      label: "Créations de compte",
      isActive: type === "account",
      onSelect: () => setType("account"),
    },
    {
      key: "apply",
      label: "Candidatures",
      isActive: type === "apply",
      onSelect: () => setType("apply"),
    },
  ].map((tab) => ({
    ...tab,
    id: `announce-traffic-tab-${tab.key}`,
  }));
  const activeTab = tabs.find((tab) => tab.isActive) || tabs[0];
  const activeTabId = activeTab ? activeTab.id : null;

  useEffect(() => {
    if (!analyticsProvider?.query) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const variables = { publisher_id: publisher.id, type };
        if (filters.from) variables.from = filters.from.toISOString();
        if (filters.to) variables.to = filters.to.toISOString();

        const raw = await analyticsProvider.query({
          cardId: METABASE_CARD_ID.ANNONCEUR_TOP_DIFFUSEURS,
          variables,
          signal: controller.signal,
        });

        const rawRows = raw?.data?.rows || raw?.rows || [];
        const cols = raw?.data?.cols || raw?.cols || [];

        const getColumnIndex = (column) => {
          if (!cols?.length) return -1;
          return cols.findIndex((c) => c.name === column || c.display_name === column);
        };

        const publisherIndex = getColumnIndex("publisher_name");
        const countIndex = getColumnIndex("doc_count");

        const parsed = rawRows.map((row) => {
          if (row && !Array.isArray(row)) {
            return {
              key: row.publisher_name ?? "",
              doc_count: Number(row.doc_count) || 0,
            };
          }

          const safePublisherIndex = publisherIndex >= 0 ? publisherIndex : 0;
          const safeCountIndex = countIndex >= 0 ? countIndex : 1;
          return {
            key: row?.[safePublisherIndex] ?? "",
            doc_count: Number(row?.[safeCountIndex]) || 0,
          };
        });

        setData(parsed);
        setTotal(parsed.length);
      } catch (error) {
        if (error.name === "AbortError") return;
        captureError(error, { extra: { filters, type } });
        setData([]);
        setTotal(0);
      }
      setLoading(false);
    };
    fetchData();
    return () => controller.abort();
  }, [filters, publisher, type, analyticsProvider]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Top partenaires diffuseurs</h2>
        <p className="text-text-mention text-base">{total > 1 ? `${total} partenaires` : `${total} partenaire`} ont diffusé vos missions sur la période</p>
      </div>
      {loading ? (
        <div className="flex w-full justify-center py-10">
          <Loader />
        </div>
      ) : (
        <div className="border-grey-border space-y-4 border p-6">
          <Tabs tabs={tabs} ariaLabel="Top partenaires diffuseurs" panelId="announce-traffic-panel" className="mb-8 flex items-center gap-8 text-sm" variant="underline" />
          <div id="announce-traffic-panel" role="tabpanel" aria-labelledby={activeTabId || undefined}>
            {!data.length ? (
              <div className="border-grey-border bg-background-grey-hover flex h-[248px] w-full flex-col items-center justify-center border border-dashed">
                <img src={EmptySVG} alt="empty" className="h-16 w-16" />
                <p className="text-color-gray-425 text-base">Aucune donnée disponible pour la période</p>
              </div>
            ) : (
              <div className="flex justify-between gap-4">
                <div className="w-2/3">
                  <table className="w-full table-fixed">
                    <thead className="text-left">
                      <tr className="text-text-mention text-xs uppercase">
                        <th colSpan={3} className="px-4">
                          Diffuseurs
                        </th>
                        <th className="px-4 text-right">{TYPE[type]}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 6).map((item, i) => (
                        <tr key={i}>
                          <td colSpan={3} className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="mr-2 h-4 w-6" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <div className="flex-1 text-sm font-semibold">{item.key}</div>
                            </div>
                          </td>
                          <td className="px-4 text-right text-sm">{(item.doc_count || 0).toLocaleString("fr")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mr-8 ml-24 flex w-1/3 items-center justify-center">
                  <div className="h-56 w-full">
                    <Pie
                      data={data?.slice(0, 6).map((d, i) => ({ name: d.key, value: d.doc_count || 0, color: COLORS[i % COLORS.length] }))}
                      innerRadius="0%"
                      unit={TYPE[type].toLowerCase()}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalAnnounce;
