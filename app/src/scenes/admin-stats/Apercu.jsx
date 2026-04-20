import { useEffect, useState } from "react";
import { HiChevronRight } from "react-icons/hi";
import { Link, useSearchParams } from "react-router-dom";

import DateRangePicker from "@/components/DateRangePicker";
import { StackedBarchart } from "@/components/Chart";
import Loader from "@/components/Loader";
import AnalyticsCard from "@/scenes/performance/AnalyticsCard";
import { useAnalyticsProvider } from "@/services/analytics/provider";
import { captureError } from "@/services/error";
import EmptySVG from "@/assets/svg/empty-info.svg";
import { METABASE_CARD_ID, MISSION_TYPE_OPTIONS } from "@/constants";

const CHART_COLORS = ["rgba(117,165,236,1)", "rgba(251,146,107,1)", "#fdc639"];

const toEndOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, -1);

const buildDefaultFilters = (searchParams) => {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const defaultFrom = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const defaultTo = toEndOfDay(yesterday);

  const fromValue = searchParams.get("from");
  const toValue = searchParams.get("to");

  const from = fromValue ? new Date(fromValue) : defaultFrom;
  const to = toValue ? new Date(toValue) : defaultTo;

  return {
    from: Number.isNaN(from.getTime()) ? defaultFrom : from,
    to: Number.isNaN(to.getTime()) ? defaultTo : to,
    type: searchParams.get("type") || "",
  };
};

const Filters = ({ filters, onChange, idPrefix, showLabel = true }) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        {showLabel ? <label className="text-gray-425 text-sm font-semibold uppercase">Période</label> : null}
        <DateRangePicker value={filters} onChange={(value) => onChange({ ...filters, ...value })} />
      </div>
      <label htmlFor={`${idPrefix}-mission-type`} className="sr-only">
        Type de mission
      </label>
      <select id={`${idPrefix}-mission-type`} className="select w-full sm:w-80" value={filters.type} onChange={(event) => onChange({ ...filters, type: event.target.value })}>
        <option value="">Tous les types de missions</option>
        {MISSION_TYPE_OPTIONS.map((missionType) => (
          <option key={missionType.value} value={missionType.value}>
            {missionType.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const ChartFallback = ({ title }) => (
  <div className="flex h-[420px] w-full flex-col items-center justify-center border border-dashed border-gray-900 bg-[#f6f6f6] px-6 text-center">
    <p className="text-base font-semibold">{title}</p>
    <p className="mt-2 text-sm text-[#666]">Renseigner le `cardId` Metabase dans `METABASE_CARD_ID`.</p>
  </div>
);

const ChartBlock = ({ title, subtitle, cardId, filters, type = "stacked", chartProps, adapterOptions, showLegend = false, loaderHeight = "420px", includeMissionTypeFilter = true }) => {
  const variables = {};
  if (includeMissionTypeFilter && filters.type) {
    variables.type = filters.type;
  }

  return (
    <div className="overflow-x-auto border border-gray-900 p-4">
      <div className="min-w-[600px]">
        <div className="mb-4 flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          {subtitle ? <p className="text-sm text-[#666]">{subtitle}</p> : null}
        </div>
        {cardId ? (
          <AnalyticsCard
            cardId={cardId}
            filters={filters}
            type={type}
            variables={variables}
            chartProps={chartProps}
            adapterOptions={adapterOptions}
            showLegend={showLegend}
            loaderHeight={loaderHeight}
          />
        ) : (
          <ChartFallback title={title} />
        )}
      </div>
    </div>
  );
};

const TrafficByAnnouncerChart = ({ filters, cardId, title, subtitle }) => {
  const analyticsProvider = useAnalyticsProvider();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cardId || !analyticsProvider?.query) {
      setRows([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const variables = {};
        if (filters.from) {
          variables.from = filters.from.toISOString();
        }
        if (filters.to) {
          variables.to = filters.to.toISOString();
        }
        if (filters.type) {
          variables.type = filters.type;
        }

        const raw = await analyticsProvider.query({
          cardId,
          variables,
          signal: controller.signal,
        });

        const rawRows = raw?.data?.rows || raw?.rows || [];
        const cols = raw?.data?.cols || raw?.cols || [];
        const indexOf = (...candidates) => cols.findIndex((c) => candidates.includes(c.name) || candidates.includes(c.display_name));

        const bucketIndex = indexOf("bucket", "month_start", "event_month", "created_at_month");
        const publisherIndex = indexOf("publisher_bucket", "publisher_name", "to_publisher_name", "publisher");
        const countIndex = indexOf("doc_count", "event_count", "count", "total_stat_event", "value");

        const parsed = rawRows.map((row) => {
          if (row && !Array.isArray(row)) {
            return {
              bucket: row.bucket ?? row.month_start ?? row.event_month ?? row.created_at_month,
              publisher: row.publisher_bucket ?? row.publisher_name ?? row.to_publisher_name ?? row.publisher ?? "Autres",
              count: Number(row.doc_count ?? row.event_count ?? row.count ?? row.total_stat_event ?? row.value) || 0,
            };
          }
          return {
            bucket: row?.[bucketIndex >= 0 ? bucketIndex : 0],
            publisher: row?.[publisherIndex >= 0 ? publisherIndex : 1] || "Autres",
            count: Number(row?.[countIndex >= 0 ? countIndex : 2]) || 0,
          };
        });
        setRows(parsed);
      } catch (error) {
        if (error.name !== "AbortError") {
          captureError(error, { extra: { filters, cardId } });
          setRows([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [filters, analyticsProvider, cardId]);

  const buildHistogram = (data) => {
    const map = new Map();
    const keysSet = new Set();
    const diff = filters?.from && filters?.to ? (filters.to.getTime() - filters.from.getTime()) / (1000 * 60 * 60 * 24) : 0;

    data.forEach((row) => {
      if (!row?.bucket) {
        return;
      }
      const date = row.bucket instanceof Date ? row.bucket : new Date(row.bucket);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = date.getTime();
      const entry = map.get(key) || {
        name: diff < 61 ? date.toLocaleDateString("fr") : date.toLocaleDateString("fr", { month: "long", year: "numeric" }),
      };
      const publisher = row.publisher || "Autres";
      entry[publisher] = (entry[publisher] || 0) + (Number(row.count) || 0);
      keysSet.add(publisher);
      map.set(key, entry);
    });

    const keys = Array.from(keysSet).filter((key) => key !== "Autres");
    if (keysSet.has("Autres")) {
      keys.push("Autres");
    }

    const histogram = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, entry]) => {
        keys.forEach((key) => {
          if (entry[key] === undefined) {
            entry[key] = 0;
          }
        });
        return entry;
      });

    return { histogram, keys };
  };

  const { histogram, keys } = buildHistogram(rows);

  return (
    <div className="overflow-x-auto border border-gray-900 p-4">
      <div className="min-w-[600px]">
        <div className="mb-4 flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-sm text-[#666]">{subtitle}</p>
        </div>
        {loading ? (
          <div className="flex h-[420px] items-center justify-center">
            <Loader />
          </div>
        ) : !histogram.length ? (
          <div className="flex h-[248px] w-full flex-col items-center justify-center border border-dashed border-gray-900 bg-[#f6f6f6]">
            <img src={EmptySVG} alt="" aria-hidden="true" className="h-16 w-16" />
            <p className="text-base text-[#666]">Aucune donnée disponible pour la période</p>
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

const EngagementSection = ({ filters }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">🫶 Engagement généré</h2>
      <TrafficByAnnouncerChart
        filters={filters}
        cardId={METABASE_CARD_ID.ADMIN_STATS_ENGAGEMENT_REDIRECTIONS}
        title="Redirections"
        subtitle="Trafic que vous avez généré pour vos partenaires annonceurs"
      />
      <TrafficByAnnouncerChart
        filters={filters}
        cardId={METABASE_CARD_ID.ADMIN_STATS_ENGAGEMENT_CANDIDATURES}
        title="Candidatures"
        subtitle="Candidatures que vous avez générées pour vos partenaires annonceurs"
      />
    </div>
  );
};

const MissionsSection = ({ filters }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">🚀 Missions</h2>
      <ChartBlock
        title="Missions actives"
        subtitle="Répartition par type de mission sur la période"
        cardId={METABASE_CARD_ID.ADMIN_STATS_MISSIONS_ACTIVES}
        filters={filters}
        type="stacked"
        chartProps={{
          color: CHART_COLORS.slice(0, 2),
          legend: true,
          seriesLabelMap: { mission_active_count: "Total Missions" },
        }}
      />
      <ChartBlock
        title="Missions créées"
        subtitle="Répartition par type de mission sur la période"
        cardId={METABASE_CARD_ID.ADMIN_STATS_MISSIONS_CREEES}
        filters={filters}
        type="stacked"
        chartProps={{ color: CHART_COLORS.slice(0, 2), legend: false }}
      />
    </div>
  );
};

const PartnersSection = ({ filters }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">🤝 Partenaires</h2>
      <div className="space-y-4">
        <ChartBlock
          title="Top diffuseurs"
          subtitle="Diffuseurs ayant généré le plus de candidatures"
          cardId={METABASE_CARD_ID.ADMIN_STATS_TOP_DIFFUSEURS}
          filters={filters}
          type="pie"
          showLegend={true}
          loaderHeight="22rem"
        />
        <ChartBlock
          title="Top annonceurs"
          subtitle="Annonceurs ayant reçu le plus de candidatures"
          cardId={METABASE_CARD_ID.ADMIN_STATS_TOP_ANNONCEURS}
          filters={filters}
          type="pie"
          showLegend={true}
          loaderHeight="22rem"
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <Link to={`/admin-stats/diffuseur?from=${filters.from.toISOString()}&to=${filters.to.toISOString()}`} className="flex items-center px-4 text-sm text-blue-900">
          Voir tous les diffuseurs
          <HiChevronRight className="pt-1" />
        </Link>
        <Link to={`/admin-stats/annonceur?from=${filters.from.toISOString()}&to=${filters.to.toISOString()}`} className="flex items-center px-4 text-sm text-blue-900">
          Voir tous les annonceurs
          <HiChevronRight className="pt-1" />
        </Link>
      </div>
    </div>
  );
};

const Apercu = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stickyVisible, setStickyVisible] = useState(false);
  const [filterSection, setFilterSection] = useState(null);
  const [filters, setFilters] = useState(() => buildDefaultFilters(searchParams));

  useEffect(() => {
    const query = new URLSearchParams();
    if (filters.from) {
      query.set("from", filters.from.toISOString());
    }
    if (filters.to) {
      query.set("to", filters.to.toISOString());
    }
    if (filters.type) {
      query.set("type", filters.type);
    }
    setSearchParams(query, { replace: true });
  }, [filters.from, filters.to, filters.type, setSearchParams]);

  useEffect(() => {
    if (!filterSection) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(filterSection);
    return () => observer.disconnect();
  }, [filterSection]);

  return (
    <div className="space-y-12 p-4 sm:p-12">
      <title>Aperçu - Statistiques - Administration - API Engagement</title>

      {stickyVisible ? (
        <div className="fixed top-0 left-0 z-50 w-full bg-white px-4 py-4 shadow-lg sm:px-48">
          <Filters filters={filters} onChange={setFilters} idPrefix="sticky" showLabel={false} />
        </div>
      ) : null}

      <div ref={(node) => setFilterSection(node)}>
        <Filters filters={filters} onChange={setFilters} idPrefix="main" />
      </div>

      <div className="border-b border-b-gray-900" />

      <EngagementSection filters={filters} />
      <MissionsSection filters={filters} />
      <PartnersSection filters={filters} />
    </div>
  );
};

export default Apercu;
