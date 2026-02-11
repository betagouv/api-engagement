import type { NextRouter } from "next/router";

const normalizeQuery = (query: Record<string, string | string[] | number | undefined>) => {
  const params = new URLSearchParams();
  const keys = Object.keys(query).sort();

  keys.forEach((key) => {
    const value = query[key];
    if (value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      value
        .filter((item) => item !== undefined)
        .map((item) => String(item))
        .sort()
        .forEach((item) => params.append(key, item));
      return;
    }
    params.append(key, String(value));
  });

  return params.toString();
};

const getCurrentQuery = (router: NextRouter) => {
  const query: Record<string, string | string[] | number | undefined> = {};
  Object.entries(router.query).forEach(([key, value]) => {
    if (value !== undefined) {
      query[key] = value;
    }
  });
  return query;
};

export { getCurrentQuery, normalizeQuery };
