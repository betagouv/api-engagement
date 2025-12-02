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
