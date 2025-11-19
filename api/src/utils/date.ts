const normalizeBoundary = (value?: Date, endOfDay = false): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = new Date(value);

  if (endOfDay) {
    normalized.setUTCHours(23, 59, 59, 999);
    return normalized;
  }

  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};

export const normalizeDateRange = (from?: Date | undefined, to?: Date | undefined) => ({
  from: normalizeBoundary(from),
  to: normalizeBoundary(to, true),
});
