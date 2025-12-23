export const buildSearchParams = (trackers) => {
  const searchParams = `${trackers.map((tracker) => `${tracker.key}=${tracker.value.replace(/ /g, "+")}`).join("&")}`;
  return searchParams;
};
