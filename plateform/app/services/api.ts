import { API_URL } from "~/services/config";

// En SSR (loaders), utiliser process.env.API_URL directement.
// Ce wrapper est destiné aux appels côté client uniquement.
const baseUrl = typeof window !== "undefined" ? API_URL : (process.env.API_URL ?? "");

async function get<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status} on GET ${endpoint}`);
  }

  return response.json() as Promise<T>;
}

const api = { get };
export default api;
