import { useState } from "react";
import { HiChevronDown } from "react-icons/hi";

import { formatChartValue, getChartSeriesLabel, getChartValue } from "@/utils/chart";

const ChartDetailsTable = ({
  id,
  title,
  description,
  mode = "none",
  type,
  data = [],
  dataKey = "value",
  nameKey = "name",
  stackedKeys = [],
  seriesLabelMap = {},
  className = "",
  nameFormatter,
  valueFormatter,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (mode === "none" || mode === "external" || !id || !data.length) {
    return (
      <p id={id} aria-label="Aucune donnée" className="sr-only">
        Aucune donnée
      </p>
    );
  }

  const tableClassName = className.trim();
  const caption = title ? `Description détaillée du graphique : ${title}` : "Description détaillée du graphique";
  const captionText = description ? `${caption}. ${description}` : caption;
  const formatName = (value) => (nameFormatter ? nameFormatter(value) : value);
  const formatValue = (value) => (valueFormatter ? valueFormatter(value) : formatChartValue(value));
  // sr-only doit être porté par un div englobant : appliqué directement à une <table>,
  // width/height 1px est ignoré (taille min-content) et clip ne masque pas la <caption>
  const toggleLabel = expanded ? "Masquer la description détaillée" : "Afficher la description détaillée";
  const wrap = (table) => {
    if (mode === "sr-only") {
      return <div className="sr-only">{table}</div>;
    }
    if (mode === "collapsible") {
      return (
        <>
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={title ? `${toggleLabel} du graphique : ${title}` : toggleLabel}
            className="mt-2 flex items-center gap-1 text-sm text-blue-900"
            onClick={() => setExpanded(!expanded)}
          >
            {toggleLabel}
            <HiChevronDown className={expanded ? "rotate-180" : ""} aria-hidden="true" />
          </button>
          {expanded ? table : null}
        </>
      );
    }
    return table;
  };

  if (type === "stacked") {
    return wrap(
      <table id={id} className={`mt-4 w-full table-auto text-xs ${tableClassName}`}>
        <caption className={mode === "sr-only" ? "" : "mb-2 text-left font-semibold"}>{captionText}</caption>
        <thead className="text-text-mention text-left text-[10px] uppercase">
          <tr>
            <th className="px-2 py-1">Catégorie</th>
            {stackedKeys.map((key) => (
              <th key={key} className="px-2 py-1 text-right">
                {getChartSeriesLabel(key, seriesLabelMap)}
              </th>
            ))}
            <th className="px-2 py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, index) => {
            const total = stackedKeys.reduce((sum, key) => sum + (Number(getChartValue(entry, key)) || 0), 0);
            return (
              <tr key={`${entry?.[nameKey] || "categorie"}-${index}`}>
                <th scope="row" className="px-2 py-1 text-left font-normal">
                  {formatName(entry?.[nameKey])}
                </th>
                {stackedKeys.map((key) => (
                  <td key={key} className="px-2 py-1 text-right">
                    {formatValue(getChartValue(entry, key))}
                  </td>
                ))}
                <td className="px-2 py-1 text-right">{formatValue(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>,
    );
  }

  return wrap(
    <table id={id} className={`mt-4 w-full table-auto text-xs ${tableClassName}`}>
      <caption className={mode === "sr-only" ? "" : "mb-2 text-left font-semibold"}>{captionText}</caption>
      <thead className="text-text-mention text-left text-[10px] uppercase">
        <tr>
          <th className="px-2 py-1">Libellé</th>
          <th className="px-2 py-1 text-right">Valeur</th>
        </tr>
      </thead>
      <tbody>
        {data.map((entry, index) => (
          <tr key={`${entry?.[nameKey] || "valeur"}-${index}`}>
            <th scope="row" className="px-2 py-1 text-left font-normal">
              {formatName(entry?.[nameKey])}
            </th>
            <td className="px-2 py-1 text-right">{formatValue(getChartValue(entry, dataKey))}</td>
          </tr>
        ))}
      </tbody>
    </table>,
  );
};

export default ChartDetailsTable;
