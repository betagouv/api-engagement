import { useEffect, useState } from "react";

import EmptySVG from "../../assets/svg/empty-info.svg";
import { Pie, StackedBarchart } from "../../components/Chart";
import Loader from "../../components/Loader";
import DateRangePicker from "../../components/NewDateRangePicker";
import Table from "../../components/Table";
import Tabs from "../../components/Tabs";
import { METABASE_CARD_ID, MONTHS } from "../../constants";
import { useAnalyticsProvider } from "../../services/analytics/provider";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import AnalyticsCard from "./AnalyticsCard";

const KEYS = {
  api: "API",
  publisher: "API",
  campaign: "Campagne",
  widget: "Widget",
  "": "Autre",
};

const TYPE = {
  print: "Impression",
  click: "Redirection",
  account: "Créations de compte",
  apply: "Candidature",
};

const COLORS = ["rgba(250,117,117,255)", "rgba(252,205,109,255)", "rgba(251,146,107,255)", "rgba(110,213,197,255)", "rgba(114,183,122,255)", "rgba(146,146,146,255)"];

const GlobalDiffuseur = ({ filters, onFiltersChange }) => {
  const { publisher } = useStore();

  return (
    <div className="space-y-12 p-12">
      <title>API Engagement - Au global - Performance</title>
      <div className="space-y-2">
        <p className="text-text-mention text-sm font-semibold uppercase">Période</p>
        <DateRangePicker value={filters} onChange={(value) => onFiltersChange({ ...filters, ...value })} />
      </div>
      <div className="border-b border-b-gray-900" />

      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Aperçu</h2>
          <p className="text-text-mention text-base">Les missions que vous diffusez et l'impact que vous générez pour vos partenaires annonceurs</p>
        </div>
        <div className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <AnalyticsCard
              cardId={METABASE_CARD_ID.DIFFUSEUR_TOTAL_MISSIONS}
              filters={filters}
              type="kpi"
              kpiLabel="missions ayant généré au moins une redirection"
              variables={{ publisher_id: publisher.id }}
              adapterOptions={{ valueColumn: "total_mission_click" }}
            />
            <AnalyticsCard
              cardId={METABASE_CARD_ID.DIFFUSEUR_TOTAL_MISSIONS}
              filters={filters}
              type="kpi"
              kpiLabel="missions ayant généré au moins une candidature"
              variables={{ publisher_id: publisher.id }}
              adapterOptions={{ valueColumn: "total_mission_apply" }}
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <AnalyticsCard
              cardId={METABASE_CARD_ID.DIFFUSEUR_TOTAL_EVENTS}
              filters={filters}
              type="kpi"
              kpiLabel="impressions"
              kpiTooltip="Les impressions des liens situés dans des emails ou SMS ne sont pas comptabilisés dans ce total"
              variables={{ publisher_id: publisher.id }}
              adapterOptions={{ valueColumn: "total_print" }}
            />
            <AnalyticsCard
              cardId={METABASE_CARD_ID.DIFFUSEUR_TOTAL_EVENTS}
              filters={filters}
              type="kpi"
              kpiLabel="redirections"
              variables={{ publisher_id: publisher.id }}
              adapterOptions={{ valueColumn: "total_click" }}
            />
            <AnalyticsCard
              cardId={METABASE_CARD_ID.DIFFUSEUR_TOTAL_EVENTS}
              filters={filters}
              type="kpi"
              kpiLabel="créations de compte"
              variables={{ publisher_id: publisher.id }}
              adapterOptions={{ valueColumn: "total_account" }}
            />
            <AnalyticsCard
              cardId={METABASE_CARD_ID.DIFFUSEUR_TOTAL_EVENTS}
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
        {(publisher.hasApiRights && 1) + (publisher.hasCampaignRights && 1) + (publisher.hasWidgetRights && 1) > 1 && <DistributionMean filters={filters} defaultType="print" />}
        <Evolution filters={filters} defaultType="print" />
        <Announcers filters={filters} />
      </>
    </div>
  );
};

const DistributionMean = ({ filters, defaultType = "print" }) => {
  const { publisher } = useStore();
  const analyticsProvider = useAnalyticsProvider();
  const [data, setData] = useState([]);
  const [type, setType] = useState(defaultType);
  const [loading, setLoading] = useState(true);
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
    id: `distribution-tab-${tab.key}`,
  }));
  const activeTab = tabs.find((tab) => tab.isActive) || tabs[0];
  const activeTabId = activeTab ? activeTab.id : null;

  useEffect(() => {
    if (!analyticsProvider?.query) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const variables = { publisher_id: String(publisher.id), type };
        if (filters.from) variables.from = filters.from.toISOString();
        if (filters.to) variables.to = filters.to.toISOString();

        const raw = await analyticsProvider.query({
          cardId: METABASE_CARD_ID.DIFFUSEUR_REPARITION_PAR_MOYEN_DIFFUSION,
          variables,
          signal: controller.signal,
        });

        const rows = raw?.data?.rows || raw?.rows || [];
        const parsed = rows.map((row) => ({ key: row?.[0] ?? "", doc_count: Number(row?.[1]) || 0 }));
        setData(parsed);
      } catch (error) {
        if (error.name === "AbortError") return;
        captureError(error, { extra: { filters, type } });
        setData([]);
      }
      setLoading(false);
    };
    fetchData();
    return () => controller.abort();
  }, [filters, type, publisher, analyticsProvider]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Répartition par moyen de diffusion</h2>
      <div className="border-grey-border space-y-4 border p-6">
        <Tabs
          tabs={tabs}
          ariaLabel="Répartition par moyen de diffusion"
          panelId="distribution-panel"
          className="mb-8 flex items-center gap-8 text-sm"
          getTabClassName={(tab) => `pb-1 ${tab.isActive ? "border-blue-france text-blue-france border-b-2 font-semibold" : ""}`}
        />
        <div id="distribution-panel" role="tabpanel" aria-labelledby={activeTabId || undefined}>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader />
            </div>
          ) : !data.length ? (
            <div className="border-grey-border bg-background-grey-hover flex h-[248px] w-full flex-col items-center justify-center border border-dashed">
              <img src={EmptySVG} alt="empty" className="h-16 w-16" />
              <p className="text-color-gray-425 text-base">Aucune donnée disponible pour la période</p>
            </div>
          ) : (
            <div className="flex h-64 justify-between gap-4 p-2">
              <div className="w-2/3">
                <table className="w-full table-fixed">
                  <thead className="text-left">
                    <tr className="text-text-mention text-xs uppercase">
                      <th colSpan={3} className="px-4">
                        Répartition par moyen de diffusion
                      </th>
                      <th className="px-4 text-right">{TYPE[type].toUpperCase()}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, i) => (
                      <tr key={i}>
                        <td colSpan={3} className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="mr-2 h-4 w-6" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <div className="flex-1 text-sm font-semibold">{KEYS[item.key]}</div>
                          </div>
                        </td>
                        <td className="px-4 text-right text-sm">{item.doc_count.toLocaleString("fr")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mr-8 ml-24 flex h-56 w-1/3 items-center justify-center">
                <Pie
                  data={data.map((d, i) => ({ name: KEYS[d.key], value: d.doc_count, color: COLORS[i % COLORS.length] }))}
                  innerRadius="0%"
                  unit={`${TYPE[type].toLowerCase()}s`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
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
    id: `evolution-tab-${tab.key}`,
  }));
  const activeTab = tabs.find((tab) => tab.isActive) || tabs[0];
  const activeTabId = activeTab ? activeTab.id : null;

  useEffect(() => {
    if (!analyticsProvider?.query) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const variables = { publisher_id: String(publisher.id), flux: "from", type };
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
    const res = [];
    if (!data) return res;
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
        <p className="text-text-mention text-base">Trafic que vous avez généré pour vos partenaires annonceurs</p>
      </div>
      <div className="border-grey-border border p-4">
        <Tabs
          tabs={tabs}
          ariaLabel="Evolution"
          panelId="evolution-panel"
          className="mb-8 flex items-center gap-8 text-sm"
          getTabClassName={(tab) => `pb-1 ${tab.isActive ? "border-blue-france text-blue-france border-b-2 font-semibold" : ""}`}
        />
        <div id="evolution-panel" role="tabpanel" aria-labelledby={activeTabId || undefined}>
          {loading ? (
            <div className="flex h-[420px] items-center justify-center">
              <Loader />
            </div>
          ) : !histogram.length ? (
            <div className="border-grey-border bg-background-grey-hover flex h-[248px] w-full flex-col items-center justify-center border border-dashed">
              <img src={EmptySVG} alt="empty" className="h-16 w-16" />
              <p className="text-color-gray-425 text-base">Aucune donnée disponible pour la période</p>
            </div>
          ) : (
            <div className="h-[420px] w-full">
              <StackedBarchart data={histogram} dataKey={[...data.topPublishers, "Autres"]} />
            </div>
          )}
        </div>
        {loading ? (
          <div className="flex h-[420px] items-center justify-center">
            <Loader />
          </div>
        ) : !histogram.length ? (
          <div className="border-grey-border bg-background-grey-hover flex h-[248px] w-full flex-col items-center justify-center border border-dashed">
            <img src={EmptySVG} alt="empty" className="h-16 w-16" />
            <p className="text-color-gray-425 text-base">Aucune donnée disponible pour la période</p>
          </div>
        ) : (
          <div className="h-[420px] w-full">
            <StackedBarchart data={histogram} dataKey={keys} />
          </div>
        )}
      </div>
    </div>
  );
};

const TABLE_HEADER = [
  { title: "Annonceurs", key: "publisherId", position: "left", colSpan: 2 },
  { title: "Impressions", key: "printCount", position: "right" },
  { title: "Redirections", key: "clickCount", position: "right" },
  { title: "Créations de compte", key: "accountCount", position: "right" },
  { title: "Candidatures", key: "applyCount", position: "right" },
  { title: "Taux de conversion", key: "rate", position: "right" },
];

const Announcers = ({ filters }) => {
  const { publisher } = useStore();
  const analyticsProvider = useAnalyticsProvider();
  const [announcerData, setAnnouncerData] = useState([]);
  const [missionData, setMissionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableSettings, setTableSettings] = useState({ page: 1, sortBy: "publisherId" });

  useEffect(() => {
    if (!analyticsProvider?.query) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const variables = { publisher_id: String(publisher.id) };
        if (filters.from) variables.from = filters.from.toISOString();
        if (filters.to) variables.to = filters.to.toISOString();

        const raw = await analyticsProvider.query({
          cardId: METABASE_CARD_ID.DIFFUSEUR_PERFORMANCE_ANNONCEURS,
          variables,
          signal: controller.signal,
        });

        const rawRows = raw?.data?.rows || raw?.rows || [];
        const cols = raw?.data?.cols || raw?.cols || [];

        const getColumnIndex = (column) => {
          if (!cols?.length) return -1;
          return cols.findIndex((c) => c.name === column || c.display_name === column);
        };

        const publisherIndex = getColumnIndex("publisher_id");
        const printIndex = getColumnIndex("print_count");
        const clickIndex = getColumnIndex("click_count");
        const accountIndex = getColumnIndex("account_count");
        const applyIndex = getColumnIndex("apply_count");
        const rateIndex = getColumnIndex("conversion_rate");

        const parsed = rawRows.map((row) => {
          if (row && !Array.isArray(row)) {
            return {
              publisherId: row.publisher_id ?? "",
              printCount: Number(row.print_count) || 0,
              clickCount: Number(row.click_count) || 0,
              accountCount: Number(row.account_count) || 0,
              applyCount: Number(row.apply_count) || 0,
              rate: Number(row.conversion_rate) || 0,
            };
          }

          const safePublisherIndex = publisherIndex >= 0 ? publisherIndex : 0;
          const safePrintIndex = printIndex >= 0 ? printIndex : 1;
          const safeClickIndex = clickIndex >= 0 ? clickIndex : 2;
          const safeAccountIndex = accountIndex >= 0 ? accountIndex : 3;
          const safeApplyIndex = applyIndex >= 0 ? applyIndex : 4;
          const safeRateIndex = rateIndex >= 0 ? rateIndex : 5;

          return {
            publisherId: row?.[safePublisherIndex] ?? "",
            printCount: Number(row?.[safePrintIndex]) || 0,
            clickCount: Number(row?.[safeClickIndex]) || 0,
            accountCount: Number(row?.[safeAccountIndex]) || 0,
            applyCount: Number(row?.[safeApplyIndex]) || 0,
            rate: Number(row?.[safeRateIndex]) || 0,
          };
        });

        setAnnouncerData(parsed);

        const missionRaw = await analyticsProvider.query({
          cardId: METABASE_CARD_ID.DIFFUSEUR_REPARITION_PAR_ANNONCEURS,
          variables,
          signal: controller.signal,
        });

        const missionRows = missionRaw?.data?.rows || missionRaw?.rows || [];
        const missionCols = missionRaw?.data?.cols || missionRaw?.cols || [];

        const getMissionIndex = (column) => {
          if (!missionCols?.length) return -1;
          return missionCols.findIndex((c) => c.name === column || c.display_name === column);
        };

        const missionPublisherIndex = getMissionIndex("publisher_name");
        const missionCountIndex = getMissionIndex("mission_count");

        const missionParsed = missionRows.map((row) => {
          if (row && !Array.isArray(row)) {
            return {
              key: row.publisher_name ?? "",
              doc_count: Number(row.mission_count) || 0,
            };
          }

          const safePublisherIndex = missionPublisherIndex >= 0 ? missionPublisherIndex : 0;
          const safeCountIndex = missionCountIndex >= 0 ? missionCountIndex : 1;

          return {
            key: row?.[safePublisherIndex] ?? "",
            doc_count: Number(row?.[safeCountIndex]) || 0,
          };
        });

        setMissionData(missionParsed);
      } catch (error) {
        if (error.name === "AbortError") return;
        captureError(error, { extra: { filters } });
        setAnnouncerData([]);
      }
      setLoading(false);
    };
    fetchData();
    return () => controller.abort();
  }, [filters, publisher, analyticsProvider]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Vos annonceurs</h2>
        <p className="text-text-mention text-base">Vous avez diffusé des missions de {announcerData?.length} partenaires annonceurs</p>
      </div>
      {loading ? (
        <div className="flex w-full justify-center py-10">
          <Loader />
        </div>
      ) : (
        <>
          <div className="border-grey-border space-y-4 border p-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-2xl font-semibold">Performance des annonceurs</h3>
              <Table
                header={TABLE_HEADER}
                pagination
                page={tableSettings.page}
                pageSize={5}
                onPageChange={(page) => setTableSettings({ ...tableSettings, page })}
                total={announcerData.length}
                sortBy={tableSettings.sortBy}
                onSort={(sortBy) => setTableSettings({ ...tableSettings, sortBy })}
              >
                {announcerData
                  .sort((a, b) => (tableSettings.sortBy === "publisherId" ? a.publisherId.localeCompare(b.publisherId) : b[tableSettings.sortBy] - a[tableSettings.sortBy]))
                  .slice((tableSettings.page - 1) * 5, tableSettings.page * 5)
                  .map((item, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
                      <td colSpan={2} className="px-4">
                        {item.publisherId}
                      </td>
                      <td className="px-4 text-right">{item.printCount.toLocaleString("fr")}</td>
                      <td className="px-4 text-right">{item.clickCount.toLocaleString("fr")}</td>
                      <td className="px-4 text-right">{item.accountCount.toLocaleString("fr")}</td>
                      <td className="px-4 text-right">{item.applyCount.toLocaleString("fr")}</td>
                      <td className="px-4 text-right">{(item.rate || 0).toLocaleString("fr", { style: "percent", minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
              </Table>
            </div>
          </div>
          <div className="border-grey-border space-y-4 border p-6">
            <h3 className="text-2xl font-semibold">Répartition des missions par annonceur</h3>
            {!missionData.length ? (
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
                          Annonceurs
                        </th>
                        <th className="px-4 text-right">Nombre de missions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missionData.slice(0, 6).map((item, i) => (
                        <tr key={i}>
                          <td colSpan={3} className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="mr-2 h-4 w-6" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <div className="flex-1 text-sm font-semibold">{item.key}</div>
                            </div>
                          </td>
                          <td className="px-4 text-right text-sm">{item.doc_count.toLocaleString("fr")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mr-8 ml-24 flex w-1/3 items-center justify-center">
                  <div className="h-56 w-full">
                    <Pie data={missionData?.slice(0, 6).map((d, i) => ({ name: d.key, value: d.doc_count, color: COLORS[i % COLORS.length] }))} innerRadius="0%" unit="missions" />
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

export default GlobalDiffuseur;
