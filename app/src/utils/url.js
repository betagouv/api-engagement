export const buildSearchParams = (trackers) => {
  const searchParams = `${trackers.map((tracker) => `${tracker.key}=${tracker.value.replace(/ /g, "+")}`).join("&")}`;
  return searchParams;
};

export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};
