import type { NextRouter } from "next/router";
import { useEffect } from "react";

import type { Filters, Widget } from "@/types";
import { getCurrentQuery, normalizeQuery } from "@/utils/routerQuery";

type SyncWidgetQueryParams = {
  widget: Widget | null;
  filters: Filters;
  router: NextRouter;
  isBenevolat: boolean;
};

const buildTargetQuery = (widget: Widget, filters: Filters, router: NextRouter, isBenevolat: boolean) => {
  const query: Record<string, string | number | undefined> = {
    widget: widget.id,
    size: filters.size,
    ...(router.query.notrack && { notrack: String(router.query.notrack) }),
  };

  if (isBenevolat) {
    if (filters.domain?.length) {
      query.domain = filters.domain.map((item) => item.value).join(",");
    }
    if (filters.organization?.length) {
      query.organization = filters.organization.map((item) => item.value).join(",");
    }
    if (filters.department?.length) {
      query.department = filters.department.map((item) => (item.value === "" ? "none" : item.value)).join(",");
    }
    if (filters.remote && filters.remote.value) {
      query.remote = filters.remote.value;
    }
  } else {
    if (filters.accessibility && filters.accessibility.value) {
      query.accessibility = filters.accessibility.value;
    }
    if (filters.minor && filters.minor.value) {
      query.minor = filters.minor.value;
    }
    if (filters.schedule && filters.schedule.value) {
      query.schedule = filters.schedule.value;
    }
    if (filters.duration && filters.duration.value) {
      query.duration = filters.duration.value;
    }
    if (filters.start && filters.start.value) {
      query.start = filters.start.value.toISOString();
    }
    if (filters.action && filters.action.length) {
      query.action = filters.action.map((item) => item.value).join(",");
    }
    if (filters.beneficiary && filters.beneficiary.length) {
      query.beneficiary = filters.beneficiary.map((item) => item.value).join(",");
    }
    if (filters.country && filters.country.length) {
      query.country = filters.country.map((item) => item.value).join(",");
    }
    if (filters.domain && filters.domain.length) {
      query.domain = filters.domain.map((item) => item.value).join(",");
    }
  }

  if (filters.page > 1) {
    query.from = (filters.page - 1) * filters.size;
  }
  if (filters.location?.lat && filters.location?.lon) {
    query.lat = filters.location.lat;
    query.lon = filters.location.lon;
    query.city = filters.location.label;
  }

  return query;
};

const useSyncWidgetQuery = ({ widget, filters, router, isBenevolat }: SyncWidgetQueryParams) => {
  useEffect(() => {
    if (!widget) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const query = buildTargetQuery(widget, filters, router, isBenevolat);
      const target = normalizeQuery(query);
      const current = normalizeQuery(getCurrentQuery(router));

      if (target === current) {
        return;
      }

      router.replace({ pathname: "/", query }, undefined, { shallow: true });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filters, widget?.id, isBenevolat, router]);
};

export default useSyncWidgetQuery;
