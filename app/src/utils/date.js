export const formatDateParam = (date) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const appendDateRange = (query, filters) => {
  if (!query || !filters) return query;

  const from = formatDateParam(filters.from);
  const to = formatDateParam(filters.to);

  if (from) query.append("from", from);
  if (to) query.append("to", to);

  return query;
};
