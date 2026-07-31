import { MissionBrowseFacets } from "@/types";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { REQUEST_ID_HEADER } from "./requestId";

type MissionBrowseResponse = {
  ok: boolean;
  data: Array<{
    id: string;
    title: string | null;
    domain: string | null;
    domainLogo: string | null;
    organizationName: string | null;
    city: string | null;
    country: string | null;
    remote: string | null;
    places: number | null;
    tags: string[];
    addresses: Array<{
      city: string | null;
      country: string | null;
      location: { lat: number; lon: number } | null;
    }>;
  }>;
  total: number;
  page: number;
  pageSize: number;
  facets: MissionBrowseFacets;
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
  return apiGet<MissionBrowseResponse>(`${apiUrl}/missions/browse/widget/${widgetId}?${params.toString()}`, signal);
};

export const fetchWidgetConfig = async (apiUrl: string, query: string, requestId: string) => {
  const rawRes = await fetchWithTimeout(`${apiUrl}/iframe/widget?${query}`, { label: "iframe-widget", requestId }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  if (!rawRes.ok) {
    throw new Error(`Widget API error: ${rawRes.status}`);
  }
  return rawRes.json();
};
