import { COLORS as CHART_COLORS } from "../../../../components/Chart";

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

export const adaptStackedBarFromMetabase = (metabaseResult, { labelColumn = 0, valueColumns } = {}) => {
  const rows = metabaseResult?.data?.rows || metabaseResult?.rows || [];
  const cols = metabaseResult?.data?.cols || metabaseResult?.cols || [];

  const labelIndex = getColumnIndex(cols, labelColumn);
  const safeLabelIndex = labelIndex >= 0 ? labelIndex : typeof labelColumn === "number" ? labelColumn : 0;

  const resolvedValueColumns =
    valueColumns && valueColumns.length
      ? valueColumns.map((col) => {
          const idx = getColumnIndex(cols, col);
          return { name: typeof col === "number" ? cols[col]?.name || cols[col]?.display_name || `col_${col}` : col, index: idx >= 0 ? idx : col };
        })
      : cols
          .map((col, idx) => ({ name: col.display_name || col.name || `col_${idx}`, index: idx }))
          .filter((col) => col.index !== safeLabelIndex);

  const keys = resolvedValueColumns.map((c) => c.name);

  const data = rows.map((row) => {
    const entry = { name: row[safeLabelIndex] ?? "" };
    resolvedValueColumns.forEach((col) => {
      const value = typeof col.index === "number" ? row[col.index] : row[getColumnIndex(cols, col.index)];
      entry[col.name] = Number(value) || 0;
    });
    return entry;
  });

  return { data, keys };
};

export const adaptTableFromMetabase = (metabaseResult) => {
  const rows = metabaseResult?.data?.rows || metabaseResult?.rows || [];
  const cols = metabaseResult?.data?.cols || metabaseResult?.cols || [];

  const columns = cols.map((c, idx) => ({
    key: c.name || c.display_name || `col_${idx}`,
    title: c.display_name || c.name || `Colonne ${idx + 1}`,
  }));

  return { columns, rows };
};

export const adaptKpiFromMetabase = (metabaseResult) => {
  const rows = metabaseResult?.data?.rows || metabaseResult?.rows || [];
  if (!rows.length) {
    return { value: 0 };
  }

  const firstRow = rows[0];
  if (!Array.isArray(firstRow)) {
    return { value: Number(firstRow) || 0 };
  }

  return { value: Number(firstRow[0]) || 0 };
};
