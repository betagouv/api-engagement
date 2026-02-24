import { Filters } from "@/types";

export const buildSearchParams = (filters: Filters, isBenevolat: boolean): URLSearchParams => {
  const params = new URLSearchParams();

  if (isBenevolat) {
    filters.domain?.forEach((item) => params.append("domain", item.value.toString()));
    filters.organization?.forEach((item) => params.append("organization", item.value.toString()));
    filters.department?.forEach((item) => params.append("department", item.value === "" ? "none" : item.value.toString()));
    if (filters.remote?.value) {
      params.append("remote", filters.remote.value.toString());
    }
  } else {
    filters.domain?.forEach((item) => params.append("domain", item.value.toString()));
    filters.schedule?.value && params.append("schedule", filters.schedule.value.toString());
    filters.accessibility?.value && params.append("accessibility", filters.accessibility.value.toString());
    filters.minor?.value && params.append("minor", filters.minor.value.toString());
    filters.action?.forEach((item) => params.append("action", item.value.toString()));
    filters.beneficiary?.forEach((item) => params.append("beneficiary", item.value.toString()));
    filters.country?.forEach((item) => params.append("country", item.value.toString()));
    if (filters.start?.value) {
      params.append("start", filters.start.value.toISOString());
    }
    if (filters.duration?.value) {
      params.append("duration", filters.duration.value.toString());
    }
  }

  params.append("size", filters.size.toString());

  if (filters.page > 1) {
    params.append("from", ((filters.page - 1) * filters.size).toString());
  }

  if (filters.location?.lat && filters.location?.lon) {
    params.append("lat", filters.location.lat.toString());
    params.append("lon", filters.location.lon.toString());
    params.append("city", filters.location.label || "");
  }

  return params;
};
