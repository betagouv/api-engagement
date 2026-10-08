import { API_URL } from "~/services/config";
import { getRequestId, logServerError } from "~/services/sentry.server";
import { appendServerTiming, type ServerTimingMetric } from "~/services/server-observability";

type ApiEnvelope<T = unknown> = {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
  error?: unknown;
};

export class UpstreamApiError extends Error {
  public readonly code?: string;

  constructor(
    public readonly status: number,
    public readonly body: ApiEnvelope,
    public readonly diagnostics?: { method: string; path: string; duration_ms: number },
    options?: ErrorOptions,
  ) {
    super(body.code ?? body.message ?? `API error ${status}`, options);
    this.name = "UpstreamApiError";
    this.code = typeof body.code === "string" && /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(body.code) ? body.code : undefined;
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

function logUpstreamError(request: Request, error: UpstreamApiError) {
  if (error.status >= 500) logServerError(request, "upstream_error", error, { status: error.status, upstream: error.diagnostics });
}

const readJsonEnvelope = async <T>(response: Response): Promise<ApiEnvelope<T>> => {
  try {
    const json: unknown = await response.json();
    if (json && typeof json === "object" && "ok" in json && typeof json.ok === "boolean") return json as ApiEnvelope<T>;
  } catch {
    // Une réponse non JSON est traitée comme une enveloppe invalide.
  }
  if (response.status === 401) return { ok: false, code: "UNAUTHORIZED", message: "Unauthorized" };
  return { ok: false, code: "upstream_error", message: "Invalid upstream response" };
};

async function serverRequest<T>(request: Request, method: string, path: string, observability: RequestObservability, body?: unknown): Promise<T> {
  const { signal } = request;
  const clientIp = request.headers.get("x-envoy-external-address");
  const startedAt = performance.now();
  const diagnostics = () => ({ method, path: path.split(/[?#]/, 1)[0], duration_ms: Math.round(performance.now() - startedAt) });
  const headers: Record<string, string> = {};
  headers["x-request-id"] = getRequestId(request);
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
  } catch (cause) {
    recordTiming(observability, "upstream", upstreamStartedAt);
    const error = new UpstreamApiError(502, { ok: false, code: "upstream_error", message: "Upstream API unavailable" }, diagnostics(), { cause });
    logUpstreamError(request, error);
    throw error;
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
    // Une enveloppe en échec sous HTTP 2xx est une erreur de protocole upstream.
    const error = new UpstreamApiError(response.ok ? 502 : response.status, json, diagnostics());
    logUpstreamError(request, error);
    throw error;
  }
  return json.data as T;
}

const jsonResponse = (body: unknown, init: JsonResponseInit = {}, observability?: RequestObservability, request?: Request) => {
  const serializeStartedAt = performance.now();
  const serializedBody = JSON.stringify(body);

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (request) headers.set("x-request-id", getRequestId(request));

  if (observability) {
    recordTiming(observability, "serialize", serializeStartedAt);
    appendServerTiming(headers, [...observability.metrics, { name: "proxy", duration: performance.now() - observability.startedAt }]);
  }

  return new Response(serializedBody, { ...init, headers });
};

export const upstreamErrorResponse = (error: unknown, request: Request, observability?: RequestObservability) => {
  const status = error instanceof UpstreamApiError ? error.status : 502;
  if (status >= 500) {
    logServerError(request, error instanceof UpstreamApiError ? "upstream_error" : "api_route_error", error, {
      status,
      upstream: error instanceof UpstreamApiError ? error.diagnostics : undefined,
    });
  }
  if (error instanceof UpstreamApiError) {
    return jsonResponse(error.body, { status: error.status }, observability, request);
  }
  return jsonResponse({ ok: false, code: "upstream_error", message: "Upstream API unavailable" }, { status: 502 }, observability, request);
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
  const observability: RequestObservability = {
    startedAt: performance.now(),
    metrics: [],
  };

  return {
    get: <T>(path: string) => serverRequest<T>(request, "GET", path, observability),
    post: <T>(path: string, body?: unknown) => serverRequest<T>(request, "POST", path, observability, body),
    put: <T>(path: string, body?: unknown) => serverRequest<T>(request, "PUT", path, observability, body),
    json: (body: unknown, init?: JsonResponseInit) => jsonResponse(body, init, observability, request),
    error: (error: unknown) => upstreamErrorResponse(error, request, observability),
  };
};
