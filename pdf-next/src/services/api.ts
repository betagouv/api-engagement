import { API_KEY, API_URL } from "./config";

class APIHandler {
  name: string;
  baseUrl: string;
  headers: { "Content-Type": string; "x-api-key": string };

  constructor() {
    this.name = "APIHandler";
    this.baseUrl = API_URL;
    this.headers = {
      "Content-Type": "application/json",
      "x-api-key": API_KEY || "",
    };
  }
  async get<T>(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        ...this.headers,
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
