import { useEffect, useMemo, useState } from "react";
import { RiInformationFill } from "react-icons/ri";

import Tooltip from "@/components/Tooltip";

import EmptySVG from "@/assets/svg/empty-info.svg";
import { useAnalyticsProvider } from "@/services/analytics/provider";
import { captureError } from "@/services/error";
import { COLORS as CHART_COLORS, Pie, BarChart as SimpleBarChart, StackedBarchart } from "@/components/Chart";
import Loader from "@/components/Loader";
import Table from "@/components/Table";

const AnalyticsViz = ({
  cardId,
  type = "pie",
  variables = {},
  adapter,
  adapterOptions,
  chartProps = {},
  tableProps = {},
  className = "",
  loaderHeight = "240px",
  showLegend = false,
  columns: overrideColumns,
  formatCell,
  kpiLabel,
  kpiUnit,
  kpiIcon,
  kpiTooltip,
}) => {
  const analyticsProvider = useAnalyticsProvider();
  const [data, setData] = useState([]);
  const [stackedKeys, setStackedKeys] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [kpiValue, setKpiValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const variablesKey = useMemo(() => JSON.stringify(variables || {}), [variables]);
  const effectiveAdapter = adapter || analyticsProvider?.adapters?.[type];

  useEffect(() => {
    if (!cardId) return;
    if (!effectiveAdapter) {
      setError(new Error(`Aucun adapteur défini pour le type de vue "${type}"`));
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const raw = await analyticsProvider.query({ cardId, variables, signal: controller.signal });
        const adapted = effectiveAdapter(raw, adapterOptions);

        if (type === "stacked") {
          setData(adapted?.data || []);
          setStackedKeys(adapted?.keys || []);
          setKpiValue(null);
        } else if (type === "table") {
          setTableColumns(overrideColumns || adapted?.columns || []);
          setTableRows(adapted?.rows || []);
          setKpiValue(null);
        } else if (type === "kpi") {
          setKpiValue(adapted?.value ?? 0);
        } else {
          setData(adapted || []);
          setKpiValue(null);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setData([]);
        setStackedKeys([]);
        setTableRows([]);
        setTableColumns([]);
        setKpiValue(null);
        setError(err);
        captureError(err, { extra: { cardId, type, variables } });
      }
      setLoading(false);
    };
    fetchData();

    return () => controller.abort();
  }, [cardId, type, effectiveAdapter, variablesKey, adapterOptions, overrideColumns, analyticsProvider]);

  if (!cardId) return null;

  if (loading) {
    return (
      <div className={`flex w-full items-center justify-center ${className}`} style={{ height: loaderHeight }}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex h-[200px] w-full flex-col items-center justify-center border border-dashed border-gray-900 bg-[#f6f6f6] ${className}`}>
        <p className="text-sm text-[#666]">Impossible de charger les données.</p>
        <p className="text-xs text-[#666]">{error.message}</p>
      </div>
    );
  }

  if (type === "table") {
    if (!tableRows.length) {
      return (
        <div className={`flex h-[200px] w-full flex-col items-center justify-center border border-dashed border-gray-900 bg-[#f6f6f6] ${className}`}>
          <img src={EmptySVG} alt="empty" className="h-16 w-16" />
          <p className="text-base text-[#666]">Aucune donnée disponible</p>
        </div>
      );
    }

    const columns = overrideColumns || tableColumns;
    const header = columns.map((col) => ({
      title: col.title || col.name || col.key,
      key: col.key || col.name,
    }));

    const page = tableProps?.page ?? 1;
    const pageSize = tableProps?.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    const visibleRows = tableRows.slice(start, start + pageSize);

    return (
      <Table header={header} total={tableRows.length} loading={false} className={`border border-gray-900 ${className}`} {...tableProps}>
        {visibleRows.map((row, idx) => (
          <tr key={idx} className={`${idx % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
            {columns.map((col, colIdx) => (
              <td key={col.key || colIdx} className="px-4 py-2 text-sm">
                {formatCell ? formatCell(row[colIdx], col, row) : row[colIdx]}
              </td>
            ))}
          </tr>
        ))}
      </Table>
    );
  }

  if (type === "kpi") {
    if (kpiValue === null) {
      return (
        <div className={`flex h-[120px] w-full flex-col items-center justify-center border border-dashed border-gray-900 bg-[#f6f6f6] ${className}`}>
          <img src={EmptySVG} alt="empty" className="h-12 w-12" />
          <p className="text-base text-[#666]">Aucune donnée disponible</p>
        </div>
      );
    }

    return (
      <div className={`border border-gray-900 p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[28px] font-bold">
              {kpiValue.toLocaleString("fr")}
              {kpiUnit ? ` ${kpiUnit}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {kpiTooltip ? (
              <Tooltip
                ariaLabel="Voir l'aide contextuelle"
                triggerClassName="text-color-gray-425 cursor-pointer"
                tooltipClassName="border-grey-border w-80 border bg-white p-4 text-xs shadow-lg"
                content={kpiTooltip}
              >
                <RiInformationFill className="text-2xl" aria-hidden="true" />
              </Tooltip>
            ) : null}
            {kpiIcon && <div className="text-text-mention text-xl">{kpiIcon}</div>}
          </div>
        </div>
        {kpiLabel && <p className="text-base">{kpiLabel}</p>}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={`flex h-[200px] w-full flex-col items-center justify-center border border-dashed border-gray-900 bg-[#f6f6f6] ${className}`}>
        <img src={EmptySVG} alt="empty" className="h-16 w-16" />
        <p className="text-base text-[#666]">Aucune donnée disponible</p>
      </div>
    );
  }

  if (type === "pie") {
    return (
      <div className={className}>
        <div className={showLegend ? "flex flex-col gap-4 md:flex-row" : ""}>
          {showLegend && (
            <div className="md:w-5/12">
              <table className="w-full table-auto text-xs">
                <thead className="text-text-mention text-left text-[10px] uppercase">
                  <tr>
                    <th className="px-2">Légende</th>
                    <th className="px-2 text-right">Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((entry, index) => {
                    const color = entry.color || CHART_COLORS[index % CHART_COLORS.length];
                    return (
                      <tr key={`${entry.name}-${index}`}>
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-4" style={{ backgroundColor: color }} />
                            <span className="truncate">{entry.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1 text-right">{(entry.value || 0).toLocaleString("fr")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className={showLegend ? "md:w-7/12" : ""} style={{ height: loaderHeight }}>
            <Pie data={data} {...chartProps} innerRadius="0%" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "bar") {
    return (
      <div className={className} style={{ height: loaderHeight }}>
        <SimpleBarChart data={data} {...chartProps} />
      </div>
    );
  }

  if (type === "stacked") {
    const { dataKey: _ignored, ...restChartProps } = chartProps || {};
    return (
      <div className={className} style={{ height: loaderHeight }}>
        <StackedBarchart data={data} dataKey={stackedKeys} {...restChartProps} />
      </div>
    );
  }

  return null;
};

export default AnalyticsViz;
