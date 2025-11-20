const formatDateOnly = (value?: Date) => {
  if (!value) {
    return undefined;
  }

  return value.toISOString().slice(0, 10);
};

export const normalizeDateRange = (from?: Date, to?: Date) => ({
  from: formatDateOnly(from),
  to: formatDateOnly(to),
});
