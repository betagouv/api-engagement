import api from "@/services/api";

const isEmpty = (value) => value === "" || value === null || value === undefined || (Array.isArray(value) && value.length === 0);

const extractValues = (value) => {
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && "value" in value[0]) {
    return value.map((item) => item.value);
  }
  return value;
};

export const compactMissionFilters = (filters = {}) =>
  Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => !isEmpty(value))
      .map(([key, value]) => [key, extractValues(value)]),
  );

export const buildMissionSearchPayload = (filters = {}) => {
  const { page, sortBy, ...rest } = filters;
  const payload = compactMissionFilters(rest);

  if (sortBy) {
    payload.sort = sortBy;
  }

  if (page !== undefined) {
    const size = typeof payload.size === "number" ? payload.size : typeof filters.size === "number" ? filters.size : undefined;
    if (size !== undefined) {
      payload.from = (page - 1) * size;
      payload.size = size;
    }
  }

  return payload;
};

export const searchMissions = async (filters, options = {}) => {
  const payload = buildMissionSearchPayload(filters);
  return api.post("/mission/search", payload, options);
};
