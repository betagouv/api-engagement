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
  if (mode === "none" || mode === "external" || !id || !data.length) {
    return null;
  }

  const visibilityClass = mode === "sr-only" ? "sr-only" : "";
  const tableClassName = `${visibilityClass} ${className}`.trim();
  const caption = title ? `Description détaillée du graphique : ${title}` : "Description détaillée du graphique";
  const captionText = description ? `${caption}. ${description}` : caption;
  const formatName = (value) => (nameFormatter ? nameFormatter(value) : value);
  const formatValue = (value) => (valueFormatter ? valueFormatter(value) : formatChartValue(value));

  if (type === "stacked") {
    return (
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
      </table>
    );
  }

  return (
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
    </table>
  );
};

export default ChartDetailsTable;
