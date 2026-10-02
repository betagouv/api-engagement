import type { MetabasePoint, MetabaseQueryResponse } from "../resources/metabase";

const findIndex = (cols: MetabaseQueryResponse["data"]["cols"], column: number | string) =>
  typeof column === "number" ? column : cols.findIndex((c) => c.name === column || c.display_name === column);

// Transforme le résultat d'une card Metabase en points { name, value } (colonnes par index ou par nom).
export const adaptMetabasePoints = (result: Pick<MetabaseQueryResponse, "data"> | null | undefined, labelColumn: number | string = 0, valueColumn: number | string = 1): MetabasePoint[] => {
  const rows = result?.data?.rows ?? [];
  const cols = result?.data?.cols ?? [];
  const labelIndex = Math.max(findIndex(cols, labelColumn), 0);
  const valueIndex = Math.max(findIndex(cols, valueColumn), 0);
  return rows.map((row) => ({ name: String(row[labelIndex] ?? ""), value: Number(row[valueIndex]) || 0 }));
};
