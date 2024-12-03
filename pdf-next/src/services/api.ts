import { API_URL } from "./config";

class APIHandler {
  name: string;
  baseUrl: string;
  headers: { "Content-Type": string };

  constructor() {
    this.name = "APIHandler";
    this.baseUrl = API_URL;
    this.headers = {
      "Content-Type": "application/json",
    };
  }
  async get<T>(endpoint: string, options?: { headers?: { "x-api-key": string } }) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        ...this.headers,
        ...options?.headers,
      },
      credentials: "include",
    });
    if (response.status === 401) {
      return { ok: false, data: null };
    }
    return (await response.json()) as { ok: boolean; data: T };
  }
}

const api = new APIHandler();
export default api;
