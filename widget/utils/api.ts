import type { MissionBrowseResponse } from "@engagement/dto";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { REQUEST_ID_HEADER } from "./requestId";

type WidgetMissionBrowseResponse = MissionBrowseResponse & {
  ok: boolean;
  request?: string;
};

const apiGet = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, { method: "GET", signal });
  if (!response.ok) {
    throw new Error(`API error ${response.status} on ${url}`);
  }
  return response.json();
};

export const searchMissions = async (apiUrl: string, widgetId: string, params: URLSearchParams, signal?: AbortSignal) => {
  return apiGet<WidgetMissionBrowseResponse>(`${apiUrl}/missions/browse/widget/${widgetId}?${params.toString()}`, signal);
};

export const fetchWidgetConfig = async (apiUrl: string, query: string, requestId: string) => {
  const rawRes = await fetchWithTimeout(`${apiUrl}/iframe/widget?${query}`, { label: "iframe-widget", requestId }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  if (!rawRes.ok) {
    throw new Error(`Widget API error: ${rawRes.status}`);
  }
  return rawRes.json();
};
