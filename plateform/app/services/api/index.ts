import { API_URL } from "~/services/config";
import { appendServerTiming, type ServerTimingMetric } from "~/services/server-observability";

type ApiEnvelope<T = unknown> = {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
  error?: unknown;
};

export class UpstreamApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiEnvelope,
  ) {
    super(body.code ?? body.message ?? `API error ${status}`);
  }
}

const apiKey = process.env.PUBLISHER_API_KEY;
// SERVER_API_URL permet d'utiliser le hostname Docker interne (ex: http://api:3002)
// quand le SSR s'exécute dans un container qui ne peut pas résoudre localhost comme le navigateur.
// Fallback sur VITE_API_URL pour le dev local sans Docker.
const serverBaseUrl = process.env.SERVER_API_URL ?? API_URL;

type RequestObservability = {
  startedAt: number;
  metrics: ServerTimingMetric[];
};

type JsonResponseInit = NonNullable<ConstructorParameters<typeof Response>[1]>;

const recordTiming = (observability: RequestObservability, name: string, startedAt: number) => {
  observability.metrics.push({ name, duration: performance.now() - startedAt });
};

const readJsonEnvelope = async <T>(response: Response): Promise<ApiEnvelope<T>> => {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    if (response.status === 401) {
      return { ok: false, code: "UNAUTHORIZED", message: "Unauthorized" };
    }
    return { ok: false, code: "upstream_error", message: "Invalid upstream response" };
  }
};

async function serverRequest<T>(
  method: string,
  path: string,
  observability: RequestObservability,
  body?: unknown,
  signal?: AbortSignal,
  clientIp?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // Forwarde l'IP réelle du navigateur (X-Envoy-External-Address injecté par Scaleway,
  // non-spoofable) pour que le rate-limit côté API opère par utilisateur final
  // et non par container plateform.
  if (clientIp) headers["x-platform-client-ip"] = clientIp;

  let response: Response;
  const upstreamStartedAt = performance.now();
  try {
    response = await fetch(`${serverBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    recordTiming(observability, "upstream", upstreamStartedAt);
    throw new UpstreamApiError(502, { ok: false, code: "upstream_error", message: "Upstream API unavailable" });
  }

  recordTiming(observability, "upstream-ttfb", upstreamStartedAt);
  const apiEnvoyHeader = response.headers.get("x-envoy-upstream-service-time");
  if (apiEnvoyHeader !== null) {
    const apiEnvoyDuration = Number(apiEnvoyHeader);
    if (Number.isFinite(apiEnvoyDuration) && apiEnvoyDuration >= 0) {
      observability.metrics.push({ name: "api-envoy", duration: apiEnvoyDuration });
    }
  }
  const bodyStartedAt = performance.now();
  const json = await readJsonEnvelope<T>(response);
  recordTiming(observability, "upstream-body", bodyStartedAt);
  recordTiming(observability, "upstream", upstreamStartedAt);
  if (!response.ok || !json.ok) {
    throw new UpstreamApiError(response.status, json);
  }
  return json.data as T;
}

const jsonResponse = (body: unknown, init: JsonResponseInit = {}, observability?: RequestObservability) => {
  const serializeStartedAt = performance.now();
  const serializedBody = JSON.stringify(body);

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");

  if (observability) {
    recordTiming(observability, "serialize", serializeStartedAt);
    appendServerTiming(headers, [...observability.metrics, { name: "proxy", duration: performance.now() - observability.startedAt }]);
  }

  return new Response(serializedBody, { ...init, headers });
};

export const upstreamErrorResponse = (error: unknown, observability?: RequestObservability) => {
  if (error instanceof UpstreamApiError) {
    return jsonResponse(error.body, { status: error.status }, observability);
  }
  return jsonResponse({ ok: false, code: "upstream_error", message: "Upstream API unavailable" }, { status: 502 }, observability);
};

/**
 * Crée une instance de l'API client liée à la requête entrante.
 * Le signal d'annulation et l'IP cliente (X-Envoy-External-Address) sont
 * extraits automatiquement — les routes n'ont pas à les passer explicitement.
 *
 * Usage dans un loader/action :
 *   const api = createApi(request);
 *   const data = await api.get<MyType>("/path");
 */
export const createApi = (request: Request) => {
  const clientIp = request.headers.get("x-envoy-external-address") ?? undefined;
  const { signal } = request;
  const observability: RequestObservability = {
    startedAt: performance.now(),
    metrics: [],
  };

  return {
    get: <T>(path: string) => serverRequest<T>("GET", path, observability, undefined, signal, clientIp),
    post: <T>(path: string, body?: unknown) => serverRequest<T>("POST", path, observability, body, signal, clientIp),
    put: <T>(path: string, body?: unknown) => serverRequest<T>("PUT", path, observability, body, signal, clientIp),
    json: (body: unknown, init?: JsonResponseInit) => jsonResponse(body, init, observability),
    error: (error: unknown) => upstreamErrorResponse(error, observability),
  };
};
