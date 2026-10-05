import type { MetabasePoint, MetabaseQueryResponse } from "../resources/metabase";

type MetabaseColumns = MetabaseQueryResponse["data"]["cols"];
type MetabaseResult = { data?: Partial<MetabaseQueryResponse["data"]>; rows?: unknown[][]; cols?: MetabaseColumns };

const findIndex = (cols: MetabaseColumns, column: number | string, fallback: number) => {
  const index = typeof column === "number" ? column : cols.findIndex((c) => c.name === column || c.display_name === column);
  return index >= 0 ? index : fallback;
};

// Transforme le résultat d'une card Metabase en points { name, value } (colonnes par index ou par nom).
export const adaptMetabasePoints = (result: MetabaseResult | null | undefined, labelColumn: number | string = 0, valueColumn: number | string = 1): MetabasePoint[] => {
  const rows = result?.data?.rows ?? result?.rows ?? [];
  const cols = result?.data?.cols ?? result?.cols ?? [];
  const labelIndex = findIndex(cols, labelColumn, 0);
  const valueIndex = findIndex(cols, valueColumn, 1);
  return rows.map((row) => ({ name: String(row[labelIndex] ?? ""), value: Number(row[valueIndex]) || 0 }));
};
