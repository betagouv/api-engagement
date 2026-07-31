import { useEffect, useRef, useState } from "react";

import { Filters, Mission, MissionBrowseFacets, Widget } from "@/types";
import { searchMissions } from "@/utils/api";
import { buildSearchParams } from "@/utils/buildSearchParams";
import { calculateDistance } from "@/utils/utils";

interface UseMissionsParams {
  widget: Widget | null;
  filters: Filters;
  apiUrl: string;
  notrack: boolean;
}

interface UseMissionsResult {
  missions: Mission[];
  total: number;
  facets: MissionBrowseFacets;
  request: string | null;
  isLoading: boolean;
}

const useMissions = ({ widget, filters, apiUrl, notrack }: UseMissionsParams): UseMissionsResult => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<MissionBrowseFacets>({});
  const [request, setRequest] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!widget) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const isBenevolat = widget.type === "benevolat";
    const params = buildSearchParams(filters, isBenevolat);
    const url = `${apiUrl}/missions/browse/widget/${widget.id}?${params.toString()}`;

    setIsLoading(true);

    searchMissions(apiUrl, widget.id, params, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;

        if (!response.ok) {
          throw new Error("Search error");
        }

        const query = new URLSearchParams({
          widgetId: widget.id,
          requestId: response.request || "",
        });

        const results: Mission[] = response.data.map((h) => ({
          _id: h.id,
          title: h.title ?? "",
          domain: h.domain ?? "",
          domainLogo: h.domainLogo ?? undefined,
          organizationName: h.organizationName ?? "",
          city: h.city,
          country: h.country,
          remote: h.remote ?? undefined,
          places: h.places ?? undefined,
          tags: h.tags,
          addresses: h.addresses.map((address) => ({ ...address, location: address.location ?? undefined })),
          url: `${apiUrl}/r/${notrack ? "notrack" : "widget"}/${h.id}?${query.toString()}`,
        }));

        if (filters.location?.lat && filters.location?.lon) {
          const { lat, lon } = filters.location;
          results.forEach((mission) => {
            if (mission.addresses && mission.addresses.length > 1) {
              mission.addresses.sort((a, b) => {
                if (!a.location || !b.location) return 0;
                return calculateDistance(lat, lon, a.location.lat, a.location.lon) - calculateDistance(lat, lon, b.location.lat, b.location.lon);
              });
            }
          });
        }

        setMissions(results);
        setTotal(response.total);
        setFacets(response.facets);
        setRequest(response.request || null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error(`[useMissions] Failed to fetch ${url}`, {
          message: error?.message,
          status: error?.status,
        });
        setMissions([]);
        setTotal(0);
        setFacets({});
        setRequest(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [widget?.id, filters, apiUrl, notrack]);

  return { missions, total, facets, request, isLoading };
};

export default useMissions;
