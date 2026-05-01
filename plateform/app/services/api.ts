import { API_URL } from "~/services/config";

const baseUrl = API_URL;

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) throw new Error(`API error ${response.status} on ${method} ${path}`);

  // Enveloppe v0 : { ok, data, … } ou { ok: false, code, message }
  const json = (await response.json()) as { ok: boolean; data?: T; code?: string };
  if (!json.ok) throw new Error(json.code ?? `API error on ${method} ${path}`);
  return json.data as T;
}

const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>("GET", path, undefined, signal),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>("POST", path, body, signal),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>("PUT", path, body, signal),
};

export default api;
