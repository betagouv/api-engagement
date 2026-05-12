const formatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return value ?? "";
  }
  return number.toLocaleString("fr");
};

const getValue = (item, key) => {
  if (!item || key === undefined || key === null) {
    return undefined;
  }
  return item[key];
};

const getSeriesLabel = (key, seriesLabelMap = {}) => {
  return seriesLabelMap[key] || key;
};

const ChartDescription = ({
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
}) => {
  if (mode === "none" || mode === "external" || !id || !data.length) {
    return null;
  }

  const visibilityClass = mode === "sr-only" ? "sr-only" : "";
  const tableClassName = `${visibilityClass} ${className}`.trim();
  const caption = title ? `Description détaillée du graphique : ${title}` : "Description détaillée du graphique";
  const captionText = description ? `${caption}. ${description}` : caption;

  if (type === "stacked") {
    return (
      <table id={id} className={`mt-4 w-full table-auto text-xs ${tableClassName}`}>
        <caption className={mode === "sr-only" ? "" : "mb-2 text-left font-semibold"}>{captionText}</caption>
        <thead className="text-text-mention text-left text-[10px] uppercase">
          <tr>
            <th className="px-2 py-1">Catégorie</th>
            {stackedKeys.map((key) => (
              <th key={key} className="px-2 py-1 text-right">
                {getSeriesLabel(key, seriesLabelMap)}
              </th>
            ))}
            <th className="px-2 py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, index) => {
            const total = stackedKeys.reduce((sum, key) => sum + (Number(getValue(entry, key)) || 0), 0);
            return (
              <tr key={`${entry?.[nameKey] || "categorie"}-${index}`}>
                <th scope="row" className="px-2 py-1 text-left font-normal">
                  {entry?.[nameKey]}
                </th>
                {stackedKeys.map((key) => (
                  <td key={key} className="px-2 py-1 text-right">
                    {formatNumber(getValue(entry, key))}
                  </td>
                ))}
                <td className="px-2 py-1 text-right">{formatNumber(total)}</td>
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
              {entry?.[nameKey]}
            </th>
            <td className="px-2 py-1 text-right">{formatNumber(getValue(entry, dataKey))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ChartDescription;
