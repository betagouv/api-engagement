export const normalizeQueryArray = (query?: string | string[]): string[] | undefined => {
  if (!query) {
    return undefined;
  }
  if (Array.isArray(query)) {
    return query.map((value) => value.trim()).filter(Boolean);
  }
  if (query.includes(",")) {
    return query
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  const trimmed = query.trim();
  return trimmed ? [trimmed] : undefined;
};

export const parseDateFilter = (query?: string): { gt?: Date; lt?: Date } | undefined => {
  try {
    if (!query) {
      return undefined;
    }
    const operation = query.slice(0, 3);
    const date = query.slice(3);
    if (!date) {
      return undefined;
    }
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return undefined;
    }
    return operation === "gt:" ? { gt: parsed } : { lt: parsed };
  } catch {
    return undefined;
  }
};
