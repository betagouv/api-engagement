import { SourceReader } from "../process-definition";

/**
 * Provider PostHog — SEUL fichier qui connaît PostHog.
 * Lecteur d'évènements basé sur l'API Query (HogQL).
 *
 * Pagination par curseur (timestamp, uuid) :
 *  - premier appel d'un run : rescan inclusif depuis `floor` (état - lookback, ou borne plancher) ;
 *  - appels suivants : comparaison stricte de tuple pour garantir la progression.
 *
 * L'upsert en aval (PK uuid) rend le recouvrement du lookback idempotent.
 */

const DEFAULT_SYNC_SINCE = "2020-01-01 00:00:00.000";
const DEFAULT_LOOKBACK_MINUTES = 60;

interface PosthogConfig {
  host: string;
  projectId: string;
  apiKey: string;
  syncSince: string;
  lookbackMinutes: number;
}

const getConfig = (): PosthogConfig => {
  const host = process.env.POSTHOG_HOST;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_API_KEY;

  if (!host) {
    throw new Error("POSTHOG_HOST must be defined");
  }
  if (!projectId) {
    throw new Error("POSTHOG_PROJECT_ID must be defined");
  }
  if (!apiKey) {
    throw new Error("POSTHOG_API_KEY must be defined");
  }

  const lookbackMinutes = process.env.POSTHOG_LOOKBACK_MINUTES ? Number(process.env.POSTHOG_LOOKBACK_MINUTES) : DEFAULT_LOOKBACK_MINUTES;

  return {
    host: host.replace(/\/+$/, ""),
    projectId,
    apiKey,
    syncSince: process.env.POSTHOG_SYNC_SINCE || DEFAULT_SYNC_SINCE,
    lookbackMinutes: Number.isFinite(lookbackMinutes) && lookbackMinutes >= 0 ? lookbackMinutes : DEFAULT_LOOKBACK_MINUTES,
  };
};

const pad = (value: number, size = 2) => value.toString().padStart(size, "0");

const formatDateTime = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
  `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;

const subtractMinutes = (value: string, minutes: number): string => {
  const parsed = new Date(value.includes("T") ? value : value.replace(" ", "T") + "Z");
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return formatDateTime(new Date(parsed.getTime() - minutes * 60_000));
};

const COLUMNS = ["uuid", "event", "timestamp", "distinct_id", "person_id", "session_id", "current_url", "pathname", "properties"];

/**
 * Curseur tronqué à la milliseconde (le state PG est en TIMESTAMP(3)) avec
 * `toString(uuid)` comme tie-breaker. ORDER BY et WHERE utilisent strictement la
 * même expression pour garantir une pagination stable et progressive.
 */
const buildQuery = (limit: number, firstCall: boolean) => `
  SELECT
    toString(uuid) AS uuid,
    event AS event,
    toString(toDateTime64(timestamp, 3)) AS timestamp,
    distinct_id AS distinct_id,
    toString(person_id) AS person_id,
    properties['$session_id'] AS session_id,
    properties['$current_url'] AS current_url,
    properties['$pathname'] AS pathname,
    properties AS properties
  FROM events
  WHERE ${firstCall ? "toDateTime64(timestamp, 3) >= toDateTime64({floor}, 3)" : "(toDateTime64(timestamp, 3), toString(uuid)) > (toDateTime64({cv}, 3), {cid})"}
  ORDER BY toDateTime64(timestamp, 3) ASC, toString(uuid) ASC
  LIMIT ${Math.max(1, Math.floor(limit))}
`;

/**
 * Construit un `SourceReader` PostHog à brancher sur `runIncrementalSync`.
 * Renvoie des lignes dont les clés correspondent aux colonnes de `analytics_raw.tracking_event`.
 */
export const createPosthogEventReader = (): SourceReader => {
  const config = getConfig();
  const url = `${config.host}/api/projects/${config.projectId}/query/`;
  let firstCall = true;

  return async (cursorValue, cursorId, batchSize) => {
    const isFirstCall = firstCall;
    firstCall = false;

    let values: Record<string, unknown>;
    if (isFirstCall) {
      const floor = cursorValue ? subtractMinutes(cursorValue, config.lookbackMinutes) : config.syncSince;
      values = { floor };
    } else {
      values = { cv: cursorValue, cid: cursorId ?? "" };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: buildQuery(batchSize, isFirstCall),
          values,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`PostHog query failed (${response.status}): ${body.slice(0, 500)}`);
    }

    const data = (await response.json()) as { results?: unknown[][]; columns?: string[] };
    const results = data.results ?? [];
    const columns = data.columns ?? COLUMNS;

    return results.map((row) => {
      const record: Record<string, any> = {};
      columns.forEach((column, index) => {
        record[column] = row[index] ?? null;
      });
      return record;
    });
  };
};
