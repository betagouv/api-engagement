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
    public readonly body: ApiEnvelope
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
    throw new UpstreamApiError(502, { ok: false, code: "upstream_error", message: "Invalid upstream response" });
  }
};

async function serverRequest<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  if (body !== undefined) headers["Content-Type"] = "application/json";

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

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => serverRequest<T>("GET", path, undefined, signal),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) => serverRequest<T>("POST", path, body, signal),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) => serverRequest<T>("PUT", path, body, signal),
};
