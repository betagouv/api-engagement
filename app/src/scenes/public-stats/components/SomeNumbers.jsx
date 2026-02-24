import { useEffect, useMemo, useState } from "react";
import { RiQuestionLine } from "react-icons/ri";

import Loader from "@/components/Loader";
import Tooltip from "@/components/Tooltip";
import { DEPARTMENT_NAMES, METABASE_CARD_ID, MONTHS } from "@/constants";
import { useAnalyticsProvider } from "@/services/analytics/provider";
import { captureError } from "@/services/error";
import AnalyticsCard from "@/scenes/performance/AnalyticsCard";

const SomeNumbers = ({ filters, onFiltersChange }) => {
  const CHART_COLOR = "#000091";
  const formatMonthLabel = (value) => {
    if (!value) return value;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const monthIdx = date.getMonth();
      return MONTHS[monthIdx] || value;
    }
    const monthNumber = Number(value);
    if (!Number.isNaN(monthNumber) && monthNumber >= 1 && monthNumber <= 12) {
      return MONTHS[monthNumber - 1];
    }
    return value;
  };
  const formatTooltipValue = (val) => (Number(val) || 0).toLocaleString("fr");

  const analyticsProvider = useAnalyticsProvider();
  const [graphTotal, setGraphTotal] = useState({
    clicks: 0,
    applies: 0,
    organizations: 0,
    missions: 0,
  });
  const [loading, setLoading] = useState(true);

  const metabaseVariables = useMemo(
    () => ({
      year: filters.year ? String(filters.year) : "",
      department: filters.department || "all",
      mission_type: filters.type || "all",
    }),
    [filters],
  );

  useEffect(() => {
    if (!analyticsProvider?.query) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const globalResult = await analyticsProvider.query({
          cardId: METABASE_CARD_ID.PUBLIC_STATS_GLOBAL,
          variables: metabaseVariables,
          signal: controller.signal,
        });

        const getRowsAndCols = (result) => ({
          rows: result?.data?.rows || result?.rows || [],
          cols: result?.data?.cols || result?.cols || [],
        });

        const findIndex = (cols, names, fallback) => {
          if (!cols || !cols.length) return fallback;
          const candidates = Array.isArray(names) ? names : [names];
          for (const candidate of candidates) {
            const idx = cols.findIndex((c) => c.name === candidate || c.display_name === candidate);
            if (idx >= 0) return idx;
          }
          return fallback;
        };

        const sumByIndex = (rows, idx) => {
          if (idx === undefined || idx < 0) return 0;
          return rows.reduce((acc, row) => acc + (Number(row[idx]) || 0), 0);
        };

        const { rows: globalRows, cols: globalCols } = getRowsAndCols(globalResult);

        setGraphTotal({
          clicks: sumByIndex(globalRows, findIndex(globalCols, ["clicks", "redirection_count", "redirections", "event_count"], 1)),
          applies: sumByIndex(globalRows, findIndex(globalCols, ["applies", "candidature_count", "applications", "event_count"], 2)),
          organizations: sumByIndex(globalRows, findIndex(globalCols, ["organizations", "organization_count"], 3)),
          missions: sumByIndex(globalRows, findIndex(globalCols, ["missions", "mission_count"], 4)),
        });
      } catch (error) {
        captureError(error, { extra: { filters } });
      }
      setLoading(false);
    };
    fetchData();
    return () => controller.abort();
  }, [analyticsProvider, metabaseVariables, filters]);

  return (
    <div className="border-grey-border mx-auto my-14 w-4/5 max-w-[1200px] flex-1 border bg-white p-12">
      <div className="flex justify-between">
        <div className="">
          <h2 className="text-3xl font-bold">En quelques chiffres</h2>
        </div>

        <div className="flex">
          <div className="ml-4 flex items-center gap-4">
            <label htmlFor="year" className="sr-only">
              Année
            </label>
            <select id="year" className="input w-48" value={filters.year} onChange={(e) => onFiltersChange({ ...filters, year: parseInt(e.target.value, 10) })}>
              <option value={2020}>2020</option>
              <option value={2021}>2021</option>
              <option value={2022}>2022</option>
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
            <label htmlFor="department" className="sr-only">
              Département
            </label>
            <select id="department" className="input w-48" value={filters.department} onChange={(e) => onFiltersChange({ ...filters, department: e.target.value })}>
              <option value="">Départements</option>
              {Object.entries(DEPARTMENT_NAMES)
                .sort((a, b) => a[0].localeCompare(b[0], "fr", { numeric: true }))
                .map(([code, value]) => (
                  <option key={value[0]} value={code}>
                    {code} - {value[0]}
                  </option>
                ))}
            </select>
            <label htmlFor="mission-type" className="sr-only">
              Type de mission
            </label>
            <select id="mission-type" className="input w-48" value={filters.type} onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}>
              <option value="">Type de mission</option>
              <option value="benevolat">Bénévolat</option>
              <option value="volontariat">Volontariat</option>
            </select>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="border-grey-border border p-8">
            <div className="flex justify-between">
              <h2 className="mb-2 text-2xl font-semibold">
                {graphTotal.organizations ? `${graphTotal.organizations.toLocaleString("fr")} organisations actives` : "Pas de données"}
              </h2>
              <Tooltip
                ariaLabel="Voir la définition des organisations actives"
                triggerClassName="text-text-mention"
                tooltipClassName="border-grey-border w-56 border bg-white p-4 text-xs text-black shadow-lg"
                content="Il s'agit des structures ayant au moins 1 mission en cours sur la période sélectionnée"
              >
                <RiQuestionLine className="text-lg" aria-hidden="true" />
              </Tooltip>
            </div>
            <p className="text-text-mention text-lg font-semibold">Evolution {filters.year}</p>
            <div className="mt-4 mb-1 h-px bg-gray-900" />
            <AnalyticsCard
              cardId={METABASE_CARD_ID.PUBLIC_STATS_ACTIVE_ORGANIZATIONS}
              filters={filters}
              variables={metabaseVariables}
              type="bar"
              adapterOptions={{ labelColumn: "month_start", valueColumn: "organizations" }}
              chartProps={{
                dataKey: "value",
                color: CHART_COLOR,
                nameFormatter: formatMonthLabel,
                tooltipName: "Organisations",
                tooltipValueFormatter: formatTooltipValue,
              }}
              loaderHeight="15rem"
            />
          </div>

          <div className="border-grey-border border p-8">
            <div className="flex justify-between">
              <h2 className="mb-2 text-2xl font-semibold">{graphTotal.missions ? `${graphTotal.missions.toLocaleString("fr")} missions partagées` : "Pas de données"}</h2>

              <Tooltip
                ariaLabel="Voir la définition des missions partagées"
                triggerClassName="text-text-mention"
                tooltipClassName="border-grey-border w-56 border bg-white p-4 text-xs text-black shadow-lg"
                content="Il s'agit des missions partagées sur l'API Engagement et en cours au moins un jour de la période sélectionnée"
              >
                <RiQuestionLine className="text-lg" aria-hidden="true" />
              </Tooltip>
            </div>
            <p className="text-text-mention text-lg font-semibold">Evolution {filters.year}</p>
            <div className="mt-4 mb-1 h-px bg-gray-900" />
            <AnalyticsCard
              cardId={METABASE_CARD_ID.PUBLIC_STATS_ACTIVE_MISSIONS}
              filters={filters}
              variables={metabaseVariables}
              type="bar"
              adapterOptions={{ labelColumn: "month_start", valueColumn: "missions" }}
              chartProps={{
                dataKey: "value",
                color: CHART_COLOR,
                nameFormatter: formatMonthLabel,
                tooltipName: "Missions",
                tooltipValueFormatter: formatTooltipValue,
              }}
              loaderHeight="15rem"
            />
          </div>

          <div className="border-grey-border border p-8">
            <h2 className="mb-2 text-2xl font-semibold">{graphTotal.clicks ? `${graphTotal.clicks.toLocaleString("fr")} redirections` : "Pas de données"}</h2>

            <p className="text-text-mention text-lg font-semibold">Evolution {filters.year}</p>
            <div className="mt-4 mb-1 h-px bg-gray-900" />
            <AnalyticsCard
              cardId={METABASE_CARD_ID.PUBLIC_STATS_GLOBAL_MONTHLY}
              filters={filters}
              variables={metabaseVariables}
              type="bar"
              adapterOptions={{ labelColumn: "month_start", valueColumn: "redirection_count" }}
              chartProps={{
                dataKey: "value",
                color: CHART_COLOR,
                nameFormatter: formatMonthLabel,
                tooltipName: "Redirections",
                tooltipValueFormatter: formatTooltipValue,
              }}
              loaderHeight="15rem"
            />
          </div>

          <div className="border-grey-border border p-8">
            <h2 className="mb-2 text-2xl font-semibold">{graphTotal.applies ? `${graphTotal.applies.toLocaleString("fr")} candidatures` : "Pas de données"}</h2>
            <p className="text-text-mention text-lg font-semibold">Evolution {filters.year}</p>
            <div className="mt-4 mb-1 h-px bg-gray-900" />
            <AnalyticsCard
              cardId={METABASE_CARD_ID.PUBLIC_STATS_GLOBAL_MONTHLY}
              filters={filters}
              variables={metabaseVariables}
              type="bar"
              adapterOptions={{ labelColumn: "month_start", valueColumn: "candidature_count" }}
              chartProps={{
                dataKey: "value",
                color: CHART_COLOR,
                nameFormatter: formatMonthLabel,
                tooltipName: "Candidatures",
                tooltipValueFormatter: formatTooltipValue,
              }}
              loaderHeight="15rem"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SomeNumbers;
