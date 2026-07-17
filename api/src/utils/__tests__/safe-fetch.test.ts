import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

import { safeFetch, UnsafeFetchUrlError, validateExternalUrl } from "@/utils/safe-fetch";

const publicAddress = [{ address: "93.184.216.34", family: 4 }];

describe("safeFetch", () => {
  beforeEach(() => {
    lookupMock.mockResolvedValue(publicAddress);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["file:///etc/passwd", "ftp://example.org/feed.xml", "http://169.254.169.254/latest/meta-data", "http://127.0.0.1/feed.xml", "http://[::1]/feed.xml", "http://[::ffff:127.0.0.1]/feed.xml"]) (
    "rejects unsafe URL %s",
    async (url) => {
      await expect(validateExternalUrl(url)).rejects.toBeInstanceOf(UnsafeFetchUrlError);
    },
  );

  it("rejects a hostname resolving to an internal IP address", async () => {
    lookupMock.mockResolvedValue([{ address: "10.0.0.42", family: 4 }]);

    await expect(validateExternalUrl("https://partner.example/feed.xml")).rejects.toThrow("blocked IP");
  });

  it("rejects a hostname when one of its addresses is internal", async () => {
    lookupMock.mockResolvedValue([...publicAddress, { address: "192.168.1.10", family: 4 }]);

    await expect(validateExternalUrl("https://partner.example/feed.xml")).rejects.toThrow("blocked IP");
  });

  it("allows the globally reachable NAT64 prefix", async () => {
    await expect(validateExternalUrl("https://[64:ff9b::808:808]/feed.xml")).resolves.toBeInstanceOf(URL);
  });

  it("validates every redirect and omits authorization from redirected requests", async () => {
    lookupMock.mockImplementation(async (hostname: string) => (hostname === "feed.example" ? publicAddress : [{ address: "1.1.1.1", family: 4 }]));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://cdn.example/feed.xml" } }))
      .mockResolvedValueOnce(new Response("<xml />", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await safeFetch("https://feed.example/feed.xml", { headers: { Authorization: "Basic secret" } });

    expect(await response.text()).toBe("<xml />");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("authorization")).toBe("Basic secret");
    expect(new Headers(fetchMock.mock.calls[1][1].headers).has("authorization")).toBe(false);
  });

  it("does not request a redirect target that resolves to an internal IP address", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(safeFetch("https://feed.example/feed.xml")).rejects.toThrow("blocked IP");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
