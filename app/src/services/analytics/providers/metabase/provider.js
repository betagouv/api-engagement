import { queryCard } from "./client";
import { adaptBarFromMetabase, adaptKpiFromMetabase, adaptPieFromMetabase, adaptStackedBarFromMetabase, adaptTableFromMetabase } from "./adapters";

const DEFAULT_ADAPTERS = {
  pie: adaptPieFromMetabase,
  bar: adaptBarFromMetabase,
  kpi: adaptKpiFromMetabase,
  stacked: adaptStackedBarFromMetabase,
  table: adaptTableFromMetabase,
};

const CACHE_TTL_MS = 30000;
const cache = new Map();

const buildCacheKey = (cardId, variables = {}) => {
  const entries = Object.keys(variables)
    .sort()
    .map((key) => [key, variables[key]]);
  return JSON.stringify([cardId, entries]);
};

const createAbortError = () => {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
};

const wrapWithAbort = (promise, signal) => {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(createAbortError());

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(createAbortError());
    };
    signal.addEventListener("abort", onAbort);
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      }
    );
  });
};

const query = async ({ cardId, variables = {}, signal } = {}) => {
  if (!cardId) {
    throw new Error("Identifiant de carte manquant");
  }
  const hasVariables = variables && Object.keys(variables).length > 0;
  const cacheKey = buildCacheKey(cardId, variables);
  const cached = cache.get(cacheKey);
  if (cached?.data) {
    if (!cached.expiresAt || cached.expiresAt > Date.now()) {
      return cached.data;
    }
    cache.delete(cacheKey);
  }
  if (cached?.promise) {
    return wrapWithAbort(cached.promise, signal);
  }

  const fetchPromise = (async () => {
    const res = await queryCard(cardId, { variables: hasVariables ? variables : undefined });
    if (!res.ok) {
      throw new Error(`Metabase renvoie ${res.status || "une erreur"}`);
    }
    const data = res.data || res;
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  })();

  cache.set(cacheKey, { promise: fetchPromise });

  try {
    return await wrapWithAbort(fetchPromise, signal);
  } catch (error) {
    cache.delete(cacheKey);
    throw error;
  }
};

const metabaseProvider = {
  query,
  adapters: DEFAULT_ADAPTERS,
};

export default metabaseProvider;
