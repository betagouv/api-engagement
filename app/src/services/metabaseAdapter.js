import { COLORS as CHART_COLORS } from "../components/Chart";

const getColumnIndex = (cols, column) => {
  if (typeof column === "number") return column;
  if (!cols || !cols.length) return -1;
  return cols.findIndex((c) => c.name === column || c.display_name === column);
};

export const adaptPieFromMetabase = (metabaseResult, { labelColumn = 0, valueColumn = 1, colors = CHART_COLORS } = {}) => {
  const rows = metabaseResult?.data?.rows || metabaseResult?.rows || [];
  const cols = metabaseResult?.data?.cols || metabaseResult?.cols || [];

  const labelIndex = getColumnIndex(cols, labelColumn);
  const valueIndex = getColumnIndex(cols, valueColumn);

  const safeLabelIndex = labelIndex >= 0 ? labelIndex : typeof labelColumn === "number" ? labelColumn : 0;
  const safeValueIndex = valueIndex >= 0 ? valueIndex : typeof valueColumn === "number" ? valueColumn : 1;

  return rows.map((row, i) => ({
    name: row[safeLabelIndex] ?? "",
    value: Number(row[safeValueIndex]) || 0,
    color: colors?.length ? colors[i % colors.length] : undefined,
  }));
};

export const adaptBarFromMetabase = (metabaseResult, { labelColumn = 0, valueColumn = 1 } = {}) => {
  const rows = metabaseResult?.data?.rows || metabaseResult?.rows || [];
  const cols = metabaseResult?.data?.cols || metabaseResult?.cols || [];

  const labelIndex = getColumnIndex(cols, labelColumn);
  const valueIndex = getColumnIndex(cols, valueColumn);

  const safeLabelIndex = labelIndex >= 0 ? labelIndex : typeof labelColumn === "number" ? labelColumn : 0;
  const safeValueIndex = valueIndex >= 0 ? valueIndex : typeof valueColumn === "number" ? valueColumn : 1;

  return rows.map((row) => ({
    name: row[safeLabelIndex] ?? "",
    value: Number(row[safeValueIndex]) || 0,
  }));
};
