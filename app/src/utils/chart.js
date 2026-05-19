export const formatChartValue = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return value ?? "";
  }
  return number.toLocaleString("fr");
};

export const getChartValue = (item, key) => {
  if (!item || key === undefined || key === null) {
    return undefined;
  }
  return item[key];
};

export const getChartSeriesLabel = (key, seriesLabelMap = {}) => {
  return seriesLabelMap[key] || key;
};
