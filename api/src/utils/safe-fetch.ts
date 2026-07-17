import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const MAX_REDIRECTS = 3;
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const BLOCKED_CIDRS = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "::/128",
  "::1/128",
  "100::/64",
  "fc00::/7",
  "fe80::/10",
] as const;

const blockedIps = new BlockList();
for (const cidr of BLOCKED_CIDRS) {
  const [network, prefix] = cidr.split("/") as [string, string];
  blockedIps.addSubnet(network, Number(prefix), isIP(network) === 4 ? "ipv4" : "ipv6");
}

export class UnsafeFetchUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeFetchUrlError";
  }
}

const isBlockedIp = (address: string): boolean => {
  const family = isIP(address);
  return family !== 0 && blockedIps.check(address, family === 4 ? "ipv4" : "ipv6");
};

export const validateExternalUrl = async (input: string | URL): Promise<URL> => {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new UnsafeFetchUrlError("Invalid URL");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (!hostname || url.username || url.password || !["http:", "https:"].includes(url.protocol)) {
    throw new UnsafeFetchUrlError("Invalid URL");
  }

  const addresses = isIP(hostname) ? [hostname] : (await lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address);
  if (!addresses.length || addresses.some(isBlockedIp)) {
    throw new UnsafeFetchUrlError("URL resolves to a blocked IP address");
  }

  return url;
};

const withoutSensitiveHeaders = (headersInit: HeadersInit | undefined): Headers => {
  const headers = new Headers(headersInit);
  ["authorization", "cookie", "proxy-authorization"].forEach((header) => headers.delete(header));
  return headers;
};

export const safeFetch = async (input: string | URL, init: RequestInit = {}): Promise<Response> => {
  let url = await validateExternalUrl(input);
  let headers = init.headers;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetch(url, { ...init, headers, redirect: "manual" });
    if (!REDIRECT_STATUS_CODES.has(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location || redirectCount === MAX_REDIRECTS) {
      throw new UnsafeFetchUrlError("Invalid redirect response");
    }

    url = await validateExternalUrl(new URL(location, url));
    headers = withoutSensitiveHeaders(init.headers);
  }

  throw new UnsafeFetchUrlError("Too many redirects");
};
