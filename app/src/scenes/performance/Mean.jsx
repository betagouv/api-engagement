import { useEffect, useMemo, useState } from "react";

import JessicaSvg from "../../assets/svg/jessica.svg";
import NassimSvg from "../../assets/svg/nassim.svg";
import DateRangePicker from "../../components/DateRangePicker";
import Loader from "../../components/Loader";
import Table from "../../components/Table";
import { METABASE_CARD_ID } from "../../constants";
import { useAnalyticsProvider } from "../../services/analytics/provider";
import { adaptKpiFromMetabase } from "../../services/analytics/providers/metabase/adapters";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import AnalyticsCard from "./AnalyticsCard";

const adaptConversionRate = (raw) => {
  const { value } = adaptKpiFromMetabase(raw, { valueColumn: "conversion_rate" });
  return { value: Number(((value || 0) * 100).toFixed(2)) };
};

const Mean = ({ filters, onFiltersChange }) => {
  const { publisher } = useStore();
  const analyticsProvider = useAnalyticsProvider();
  const [options, setOptions] = useState([]);
  const [source, setSource] = useState("");
  const [dataBySource, setDataBySource] = useState({});
  const [loading, setLoading] = useState(false);
  const [graph, setGraph] = useState({ clickCount: 0, applyCount: 0, printCount: 0, accountCount: 0, conversionRate: 0 });
  const [graphLoading, setGraphLoading] = useState(false);

  const metabaseVariables = useMemo(() => {
    const vars = { publisher_id: publisher.id, source };
    if (filters?.from) vars.from = filters.from instanceof Date ? filters.from.toISOString() : filters.from;
    if (filters?.to) vars.to = filters.to instanceof Date ? filters.to.toISOString() : filters.to;
    return vars;
  }, [filters, publisher.id, source]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const newOptions = [];
        let source = "";

        if (publisher.hasApiRights) {
          source = "api";
          newOptions.push({ label: "API", value: "api" });
        }

        if (publisher.hasCampaignRights) {
          const resC = await api.post("/campaign/search", { fromPublisherId: publisher.id, size: 0 });
          if (!resC.ok) throw resC;
          if (resC.total) {
            source = "campaign";
            newOptions.push({ label: "Campagnes", value: "campaign" });
          }
        }

        if (publisher.hasWidgetRights) {
          const resW = await api.post("/widget/search", { fromPublisherId: publisher.id, size: 0 });
          if (!resW.ok) throw resW;
          if (resW.total) {
            source = "widget";
            newOptions.push({ label: "Widgets", value: "widget" });
          }
        }

        setOptions(newOptions.reverse());
        setSource(source);
      } catch (error) {
        captureError(error, { extra: { publisherId: publisher.id } });
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!options.length) return;
    if (!analyticsProvider?.query) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          options.map(async ({ value }) => {
            const variables = { ...metabaseVariables, source: value };
            const raw = await analyticsProvider.query({
              cardId: METABASE_CARD_ID.DIFFUSEUR_PERFORMANCE_PER_SOURCE,
              variables,
              signal: controller.signal,
            });
            const rows = raw?.data?.rows || raw?.rows || [];
            const cols = raw?.data?.cols || raw?.cols || [];
            const colIndex = (name) => cols.findIndex((c) => c.name === name || c.display_name === name);
            const idxName = colIndex("name");
            const idxPrint = colIndex("print_count");
            const idxClick = colIndex("click_count");
            const idxAccount = colIndex("account_count");
            const idxApply = colIndex("apply_count");
            const idxRate = colIndex("conversion_rate");

            const sources = rows.map((row) => ({
              name: idxName >= 0 ? row[idxName] : row[0],
              printCount: Number(idxPrint >= 0 ? row[idxPrint] : 0) || 0,
              clickCount: Number(idxClick >= 0 ? row[idxClick] : 0) || 0,
              accountCount: Number(idxAccount >= 0 ? row[idxAccount] : 0) || 0,
              applyCount: Number(idxApply >= 0 ? row[idxApply] : 0) || 0,
              rate: Number(idxRate >= 0 ? row[idxRate] : 0) || 0,
            }));

            return [value, sources];
          }),
        );

        const map = results.reduce((acc, [key, sources]) => ({ ...acc, [key]: { sources } }), {});
        setDataBySource(map);
      } catch (error) {
        if (error.name === "AbortError") return;
        captureError(error, { extra: { filters, publisherId: publisher.id } });
      }
      setLoading(false);
    };
    fetchData();
    return () => controller.abort();
  }, [analyticsProvider, metabaseVariables, options, publisher.id]);

  useEffect(() => {
    if (!source) return;
    if (!analyticsProvider?.query) return;
    const controller = new AbortController();
    const fetchGraph = async () => {
      setGraphLoading(true);
      try {
        const raw = await analyticsProvider.query({
          cardId: METABASE_CARD_ID.DIFFUSEUR_MEAN_PUBLISHER_KPI,
          variables: metabaseVariables,
          signal: controller.signal,
        });
        const rows = raw?.data?.rows || raw?.rows || [];
        const cols = raw?.data?.cols || raw?.cols || [];
        const getValue = (name) => {
          const idx = cols.findIndex((c) => c.name === name || c.display_name === name);
          if (idx < 0) return 0;
          const row = rows?.[0] || [];
          return Number(row[idx]) || 0;
        };
        const clickCount = getValue("click_count");
        const applyCount = getValue("apply_count");
        const printCount = getValue("print_count");
        const accountCount = getValue("account_count");
        const conversionRate = getValue("conversion_rate");

        setGraph({ clickCount, applyCount, printCount, accountCount, conversionRate });
      } catch (error) {
        if (error.name === "AbortError") return;
        captureError(error, { extra: { source, filters, publisherId: publisher.id } });
        setGraph({ clickCount: 0, applyCount: 0, printCount: 0, accountCount: 0, conversionRate: 0 });
      }
      setGraphLoading(false);
    };
    fetchGraph();
    return () => controller.abort();
  }, [analyticsProvider, filters, metabaseVariables, publisher.id, source]);

  if (!source)
    return (
      <div className="flex justify-center p-12">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-12 p-12">
      <title>API Engagement - Moyens de diffusion - Performance</title>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <label className="text-text-mention text-sm font-semibold uppercase">Période</label>
          <DateRangePicker value={filters} onChange={(value) => onFiltersChange({ ...filters, ...value })} />
        </div>
        {options.length > 1 && (
          <>
            <div className="mx-10 h-16 w-px bg-gray-900" />
            <div className="flex-1 space-y-2">
              <label htmlFor="mean-of-diffusion" className="text-text-mention text-sm font-semibold uppercase">
                Moyen de diffusion
              </label>
              <select id="mean-of-diffusion" className="select w-full" value={source} onChange={(e) => setSource(e.target.value)}>
                {options.map((option, i) => (
                  <option key={i} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div className="border-b border-b-gray-900" />

      <div className="flex flex-col gap-4">
        <h2 className="text-[28px] font-bold">
          {
            {
              widget:
                (dataBySource[source]?.sources?.length || 0) > 1
                  ? `${dataBySource[source]?.sources?.length || 0} widgets actifs`
                  : `${dataBySource[source]?.sources?.length || 0} widget actif`,
              campaign:
                (dataBySource[source]?.sources?.length || 0) > 1
                  ? `${dataBySource[source]?.sources?.length || 0} campagnes actives`
                  : `${dataBySource[source]?.sources?.length || 0} campagne active`,
              publisher: "Statistiques de votre diffusion par API",
              api: "Statistiques de votre diffusion par API",
            }[source]
          }
        </h2>
        <div className="border-grey-border flex flex-col gap-6 border p-6 md:flex-row">
          {graphLoading ? (
            <div className="flex w-full justify-center py-10">
              <Loader />
            </div>
          ) : (
            <>
              <div className="h-full w-full max-w-[220px] p-4">
                <h1 className="text-4xl font-bold">
                  {graph.conversionRate
                    ? graph.conversionRate.toLocaleString("fr-FR", { style: "percent", maximumFractionDigits: 2 })
                    : graph.clickCount
                      ? (graph.applyCount / graph.clickCount).toLocaleString("fr-FR", { style: "percent", maximumFractionDigits: 2 })
                      : "-"}
                </h1>
                <p className="mt-2 text-base">taux de conversion de l'API</p>
                <p className="text-text-mention mt-4 text-sm">
                  entre le nombre de <span className="font-semibold text-black">redirections</span> et le nombre de <span className="font-semibold text-black">candidatures</span>
                </p>
              </div>
              <div className="flex h-full flex-1 flex-col gap-8 md:flex-row md:items-end">
                <div className="group flex h-full flex-1 flex-col justify-end gap-4 px-4">
                  <Bar value={100} height={BAR_HEIGHT} />
                  <div className="h-24">
                    <h4 className="text-3xl font-semibold text-gray-700 group-hover:text-black">{graph.clickCount.toLocaleString("fr")}</h4>
                    <p className="text-base text-gray-700 group-hover:text-black">redirections vers une mission</p>
                  </div>
                </div>
                <div className="group flex h-full flex-1 flex-col justify-end gap-4 px-4">
                  <Bar value={graph.clickCount ? (graph.applyCount * 100) / graph.clickCount : 0} height={BAR_HEIGHT} />
                  <div className="h-24">
                    <h4 className="text-3xl font-semibold text-gray-700 group-hover:text-black">{graph.applyCount.toLocaleString("fr")}</h4>
                    <p className="text-base text-gray-700 group-hover:text-black">candidatures</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnalyticsCard
            cardId={METABASE_CARD_ID.DIFFUSEUR_MEAN_PUBLISHER_KPI}
            filters={filters}
            type="kpi"
            kpiLabel="impressions"
            variables={{ publisher_id: publisher.id, source }}
            adapterOptions={{ valueColumn: "print_count" }}
          />
          <AnalyticsCard
            cardId={METABASE_CARD_ID.DIFFUSEUR_MEAN_PUBLISHER_KPI}
            filters={filters}
            type="kpi"
            kpiLabel="créations de compte"
            variables={{ publisher_id: publisher.id, source }}
            adapterOptions={{ valueColumn: "account_count" }}
          />
        </div>
      </div>

      <div className="border-grey-border bg-blue-france-975 flex items-center gap-8 border p-8">
        <div className="relative h-full w-[128px]">
          <img src={JessicaSvg} alt="Jessica" className="absolute top-1/2 left-0 h-[72px] w-[72px] -translate-y-1/2 rounded-full" />
          <img src={NassimSvg} alt="Nassim" className="absolute top-1/2 right-0 h-[72px] w-[72px] -translate-y-1/2 rounded-full" />
        </div>
        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">Jessica et Nassim vous accompagnent</h3>
            <p className="text-[18px]">Nous sommes là pour vous aider à optimiser votre parcours utilisateur et votre taux de conversion.</p>
          </div>

          <div>
            <a href={publisher.missionType === "benevolat" ? "mailto:nassim.merzouk@beta.gouv.fr" : "mailto:jessica.maitte@beta.gouv.fr"} className="secondary-btn">
              Nous contacter
            </a>
          </div>
        </div>
      </div>

      {(source === "widget" || source === "campaign") &&
        (loading ? (
          <div className="flex justify-center p-12">
            <Loader />
          </div>
        ) : (
          <SourcePerformance data={dataBySource[source]?.sources || []} source={source} />
        ))}
    </div>
  );
};

const getLabelPosition = (value) => {
  if (value < 10) return "5%";
  if (value > 90) return "94%";
  return `${value - 4}%`;
};

const BAR_HEIGHT = 320;

const Bar = ({ value, height = BAR_HEIGHT }) => {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div className="relative w-full" style={{ height }}>
      <div className="bg-blue-france-main-525/10 absolute bottom-0 h-full w-full rounded" />
      <div
        className="group-hover:bg-blue-france-main-525 bg-blue-france-925-active absolute bottom-0 w-full rounded transition-all duration-300 ease-in-out"
        style={{ height: `${safeValue}%` }}
      />
      <div className="absolute left-1/2 -translate-x-1/2 rounded border bg-white px-2 py-1 text-sm shadow-lg" style={{ bottom: getLabelPosition(safeValue) }}>
        {safeValue.toFixed(0)}%
      </div>
    </div>
  );
};

const TABLE_HEADER = (source) => [
  { title: `Nom ${source === "widget" ? "du widget" : "de la campagne"}`, key: "name", position: "left", colSpan: 2 },
  { title: "Impressions", key: "printCount", position: "right" },
  { title: "Redirections", key: "clickCount", position: "right" },
  { title: "Créations de compte", key: "accountCount", position: "right" },
  { title: "Candidatures", key: "applyCount", position: "right" },
  { title: "Taux de conversion", key: "rate", position: "right" },
];

const SourcePerformance = ({ data, source }) => {
  const [sortBy, setSortBy] = useState("applyCount");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const sorted = [...data].sort((a, b) => (sortBy === "name" ? (a.name || "").localeCompare(b.name || "") : (b[sortBy] || 0) - (a[sortBy] || 0)));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="border-grey-border space-y-4 border p-6">
      <h3 className="text-2xl font-semibold">Performance par {source === "widget" ? "widget" : "campagne"}</h3>
      <Table header={TABLE_HEADER(source)} total={data.length} sortBy={sortBy} onSort={setSortBy} page={page} onPageChange={setPage} pageSize={pageSize}>
        {paginated.map((item, i) => (
          <tr key={`${item.name || "source"}-${(page - 1) * pageSize + i}`} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
            <td colSpan={2} className="px-4">
              {item.name}
            </td>
            <td className="px-4 text-right">{(item.printCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(item.clickCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(item.accountCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(item.applyCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(item.rate || 0).toLocaleString("fr", { style: "percent", minimumFractionDigits: 2 })}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
};

export default Mean;
