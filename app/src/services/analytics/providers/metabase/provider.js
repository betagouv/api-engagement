import { queryCard } from "./client";
import { adaptBarFromMetabase, adaptKpiFromMetabase, adaptPieFromMetabase, adaptStackedBarFromMetabase, adaptTableFromMetabase } from "./adapters";

const DEFAULT_ADAPTERS = {
  pie: adaptPieFromMetabase,
  bar: adaptBarFromMetabase,
  kpi: adaptKpiFromMetabase,
  stacked: adaptStackedBarFromMetabase,
  table: adaptTableFromMetabase,
};

const query = async ({ cardId, variables = {}, signal } = {}) => {
  if (!cardId) {
    throw new Error("Identifiant de carte manquant");
  }
  const hasVariables = variables && Object.keys(variables).length > 0;
  const res = await queryCard(cardId, { variables: hasVariables ? variables : undefined, signal });

  if (!res.ok) {
    throw new Error(`Metabase renvoie ${res.status || "une erreur"}`);
  }

  return res.data || res;
};

const metabaseProvider = {
  query,
  adapters: DEFAULT_ADAPTERS,
};

export default metabaseProvider;
