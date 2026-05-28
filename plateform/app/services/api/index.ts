import { API_URL } from "~/services/config";

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

async function serverRequest<T>(method: string, path: string, body?: unknown, signal?: AbortSignal, clientIp?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // Forwarde l'IP réelle du navigateur (X-Envoy-External-Address injecté par Scaleway,
  // non-spoofable) pour que le rate-limit côté API opère par utilisateur final
  // et non par container plateform.
  if (clientIp) headers["x-platform-client-ip"] = clientIp;

  let response: Response;
  try {
    response = await fetch(`${serverBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new UpstreamApiError(502, { ok: false, code: "upstream_error", message: "Upstream API unavailable" });
  }

  const json = await readJsonEnvelope<T>(response);
  if (!response.ok || !json.ok) {
    throw new UpstreamApiError(response.status, json);
  }
  return json.data as T;
}

export const upstreamErrorResponse = (error: unknown) => {
  if (error instanceof UpstreamApiError) {
    return Response.json(error.body, { status: error.status });
  }
  return Response.json({ ok: false, code: "upstream_error", message: "Upstream API unavailable" }, { status: 502 });
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

  return {
    get: <T>(path: string) => serverRequest<T>("GET", path, undefined, signal, clientIp),
    post: <T>(path: string, body?: unknown) => serverRequest<T>("POST", path, body, signal, clientIp),
    put: <T>(path: string, body?: unknown) => serverRequest<T>("PUT", path, body, signal, clientIp),
  };
};
