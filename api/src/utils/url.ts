export const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

export const toUrl = (value: string): string | null => {
  const url = value;
  if (!url) {
    return null;
  }
  if (!url.startsWith("http")) {
    return `https://${url}`;
  }
  if (!isValidUrl(url)) {
    return null;
  }
  return url;
};

export const buildSearchParams = (trackers: { key: string; value: string }[]): string => {
  if (!trackers || trackers.length === 0) {
    return "";
  }
  const searchParams = `${trackers.map((tracker) => `${tracker.key}=${tracker.value.replace(/ /g, "+")}`).join("&")}`;
  return searchParams;
};
