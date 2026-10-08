export function getCanonicalRedirectUrl(requestUrl: string, canonicalHostname?: string): string | null {
  if (!canonicalHostname) return null;

  const url = new URL(requestUrl);
  if (!url.hostname.startsWith("www.")) return null;

  url.protocol = "https:";
  url.hostname = canonicalHostname;
  url.port = "";

  return url.toString();
}

export function getLegacyHostRedirectUrl(requestUrl: string, legacyHostname?: string, canonicalHostname?: string): string | null {
  if (!legacyHostname || !canonicalHostname) return null;

  const url = new URL(requestUrl);
  if (url.hostname !== legacyHostname) return null;

  url.protocol = "https:";
  url.hostname = canonicalHostname;
  url.port = "";

  return url.toString();
}
