export interface DailyPublisherUsage {
  publisher_id: string;
  method: string | null;
  route: string;
  status_code: number | null;
  request_count: number;
}

export interface CockpitMetricsConfig {
  environment: string;
  queryUrl: string;
  token: string;
}

export const getCockpitMetricsConfig = (environment?: string, env: NodeJS.ProcessEnv = process.env): CockpitMetricsConfig => {
  const selectedEnvironment = environment ?? env.ENV;
  if (selectedEnvironment !== "staging" && selectedEnvironment !== "production") {
    throw new Error("L'environnement des métriques doit être staging ou production.");
  }
  if (env.ENV && env.ENV !== selectedEnvironment) {
    throw new Error("L'environnement demandé ne correspond pas à ENV. Vérifier la base analytics cible.");
  }

  const otlpUrl = env.COCKPIT_METRICS_OTLP_URL;
  const token = env.COCKPIT_METRICS_TOKEN;

  if (!otlpUrl || !token) {
    throw new Error("COCKPIT_METRICS_OTLP_URL et COCKPIT_METRICS_TOKEN doivent être définis.");
  }

  let url: URL;
  try {
    url = new URL(otlpUrl);
  } catch {
    throw new Error("COCKPIT_METRICS_OTLP_URL doit être une URL HTTPS valide.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !url.pathname.endsWith("/otlp/v1/metrics")) {
    throw new Error("COCKPIT_METRICS_OTLP_URL doit être une URL HTTPS se terminant par /otlp/v1/metrics, sans identifiants ni paramètres.");
  }
  url.pathname = url.pathname.replace(/\/otlp\/v1\/metrics$/, "/prometheus/api/v1/query");

  return { environment: selectedEnvironment, queryUrl: url.toString(), token };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const parseUsage = (payload: unknown): DailyPublisherUsage[] => {
  if (!isRecord(payload) || payload.status !== "success") {
    throw new Error("Cockpit a renvoyé une erreur de requête Prometheus.");
  }
  // Une réponse partielle ne doit pas être validée comme une journée complète.
  if (payload.warnings !== undefined && (!Array.isArray(payload.warnings) || payload.warnings.length > 0)) {
    throw new Error("Cockpit a renvoyé des avertissements : synchronisation interrompue pour éviter des données partielles.");
  }
  const data = payload.data;
  if (!isRecord(data) || data.resultType !== "vector" || !Array.isArray(data.result)) {
    throw new Error("Réponse Cockpit invalide : un vecteur Prometheus est attendu.");
  }

  const seen = new Set<string>();
  return data.result.map((result: unknown) => {
    if (!isRecord(result) || !isRecord(result.metric) || !Array.isArray(result.value) || result.value.length !== 2) {
      throw new Error("Échantillon Cockpit invalide.");
    }
    const { publisher_id, method, route, status_code } = result.metric;
    const [timestamp, rawCount] = result.value;
    const requestCount = typeof rawCount === "string" && rawCount.trim() !== "" ? Number(rawCount) : NaN;
    if (typeof publisher_id !== "string" || !publisher_id || typeof route !== "string" || !route || typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
      throw new Error("Labels ou timestamp Cockpit invalides.");
    }
    const statusCode = status_code === undefined || status_code === "" ? null : status_code;
    let httpMethod: string | null = null;
    if (method !== undefined && method !== "") {
      if (typeof method !== "string" || !/^[!#$%&'*+.^_`|~0-9A-Z-]+$/.test(method)) {
        throw new Error("Méthode HTTP Cockpit invalide.");
      }
      httpMethod = method;
    }
    if (statusCode !== null && (typeof statusCode !== "string" || !/^[1-5]\d{2}$/.test(statusCode))) {
      throw new Error("Code de statut HTTP Cockpit invalide.");
    }
    const roundedCount = Math.round(requestCount);
    if (!Number.isFinite(requestCount) || requestCount < 0 || !Number.isSafeInteger(roundedCount)) {
      throw new Error("Volume de requêtes Cockpit invalide.");
    }
    const key = JSON.stringify([publisher_id, httpMethod, route, statusCode]);
    if (seen.has(key)) {
      throw new Error("Cockpit a renvoyé plusieurs volumes pour un même partenaire, une même méthode, une même route et un même statut HTTP.");
    }
    seen.add(key);
    return { publisher_id, method: httpMethod, route, status_code: statusCode === null ? null : Number(statusCode), request_count: roundedCount };
  });
};

export const createCockpitMetricsReader = (config: CockpitMetricsConfig, request: typeof fetch = fetch) => {
  // increase est appliqué AVANT sum pour traiter les resets de chaque instance.
  const query =
    `sum by (publisher_id, method, route, status_code) (` +
    `increase(api_engagement_http_requests_by_publisher_total{environment=${JSON.stringify(config.environment)},publisher_id!="",route!=""}[1d]))`;

  return async (end: Date): Promise<DailyPublisherUsage[]> => {
    const url = new URL(config.queryUrl);
    url.searchParams.set("query", query);
    url.searchParams.set("time", end.toISOString());
    url.searchParams.set("timeout", "25s");

    const response = await request(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });
    if (!response.ok) {
      // Ne pas exposer le corps de réponse, les labels ou les identifiants.
      throw new Error(`La lecture des métriques Cockpit a échoué (HTTP ${response.status}).`);
    }
    return parseUsage(await response.json());
  };
};
