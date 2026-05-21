import { API_URL } from "~/services/config";

const apiKey = process.env.PUBLISHER_API_KEY;
// SERVER_API_URL permet d'utiliser le hostname Docker interne (ex: http://api:3002)
// quand le SSR s'exécute dans un container qui ne peut pas résoudre localhost comme le navigateur.
// Fallback sur VITE_API_URL pour le dev local sans Docker.
const serverBaseUrl = process.env.SERVER_API_URL ?? API_URL;

async function serverRequest<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${serverBaseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!response.ok) throw new Error(`API error ${response.status} on ${method} ${path}`);

  const json = (await response.json()) as { ok: boolean; data?: T; code?: string };
  if (!json.ok) throw new Error(json.code ?? `API error on ${method} ${path}`);
  return json.data as T;
}

export const serverApi = {
  get: <T>(path: string, signal?: AbortSignal) => serverRequest<T>("GET", path, undefined, signal),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) => serverRequest<T>("POST", path, body, signal),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) => serverRequest<T>("PUT", path, body, signal),
};
