import { AggregationData } from "../types";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { generateRequestId, REQUEST_ID_HEADER } from "./requestId";

const apiGet = async <T>(url: string, signal?: AbortSignal): Promise<{ ok: boolean; data: T; total?: number; request?: string }> => {
  const response = await fetch(url, { method: "GET", signal });
  if (!response.ok) {
    throw new Error(`API error ${response.status} on ${url}`);
  }
  return response.json();
};

export const searchMissions = async (apiUrl: string, widgetId: string, params: URLSearchParams, signal?: AbortSignal) => {
  return apiGet<any[]>(`${apiUrl}/iframe/${widgetId}/search?${params.toString()}`, signal);
};

export const fetchAggs = async (apiUrl: string, widgetId: string, params: URLSearchParams, signal?: AbortSignal) => {
  return apiGet<AggregationData>(`${apiUrl}/iframe/${widgetId}/aggs?${params.toString()}`, signal);
};

export const fetchWidgetConfig = async (apiUrl: string, query: string, requestId: string) => {
  const rawRes = await fetchWithTimeout(`${apiUrl}/iframe/widget?${query}`, { label: "iframe-widget", requestId }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  if (!rawRes.ok) {
    throw new Error(`Widget API error: ${rawRes.status}`);
  }
  return rawRes.json();
};
