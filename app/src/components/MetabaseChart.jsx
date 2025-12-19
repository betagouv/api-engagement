import { useEffect, useMemo, useState } from "react";

import EmptySVG from "../assets/svg/empty-info.svg";
import { captureError } from "../services/error";
import metabase from "../services/metabase";
import { adaptBarFromMetabase, adaptPieFromMetabase } from "../services/metabaseAdapter";
import { COLORS as CHART_COLORS, Pie, BarChart as SimpleBarChart } from "./Chart";
import Loader from "./Loader";

const DEFAULT_ADAPTERS = {
  pie: adaptPieFromMetabase,
  bar: adaptBarFromMetabase,
};

const MetabaseChart = ({ cardId, type = "pie", variables = {}, adapter, chartProps = {}, className = "", loaderHeight = "240px", showLegend = false }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const variablesKey = useMemo(() => JSON.stringify(variables || {}), [variables]);
  const effectiveAdapter = adapter || DEFAULT_ADAPTERS[type];

  useEffect(() => {
    if (!cardId) return;
    if (!effectiveAdapter) {
      setError(new Error(`Aucun adapteur défini pour le type de graphique "${type}"`));
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = Object.keys(variables || {}).length
          ? await metabase.queryWithTemplateVars(cardId, variables, { signal: controller.signal })
          : await metabase.queryCard(cardId, { signal: controller.signal });

        if (!res.ok) {
          throw new Error(`Metabase renvoie ${res.status || "une erreur"}`);
        }

        const adapted = effectiveAdapter(res.data || res);
        setData(adapted || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setData([]);
        setError(err);
        captureError(err, { extra: { cardId, type, variables } });
      }
      setLoading(false);
    };
    fetchData();

    return () => controller.abort();
  }, [cardId, type, effectiveAdapter, variablesKey]);

  if (!cardId) return null;

  if (loading) {
    return (
      <div className={`flex w-full items-center justify-center`} style={{ height: loaderHeight }}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex h-[200px] w-full flex-col items-center justify-center border border-dashed border-gray-900 bg-[#f6f6f6] ${className}`}>
        <p className="text-sm text-[#666]">Impossible de charger les données Metabase.</p>
        <p className="text-xs text-[#666]">{error.message}</p>
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
              <table className="w-full table-fixed text-xs">
                <thead className="text-left text-[10px] text-gray-500 uppercase">
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

  return null;
};

export default MetabaseChart;
