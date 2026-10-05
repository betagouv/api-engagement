export function getCanonicalRedirectUrl(requestUrl: string, canonicalHostname?: string): string | null {
  if (!canonicalHostname) return null;

  const url = new URL(requestUrl);
  if (!url.hostname.startsWith("www.")) return null;

  url.protocol = "https:";
  url.hostname = canonicalHostname;
  url.port = "";

  return url.toString();
}
