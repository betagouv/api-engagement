async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
  const json = (await res.json()) as { ok: boolean; data?: T; code?: string };
  if (!res.ok || !json.ok) throw new Error(json.code ?? `fetch error on ${method} ${path}`);
  return json.data as T;
}

export const client = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>("GET", path, undefined, signal),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>("POST", path, body, signal),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>("PUT", path, body, signal),
};
