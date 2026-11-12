import { ProxyAgent } from "undici";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PROXY_URL = "https://proxy-user:proxy-pass@proxy.example.com:443";

describe("demarches-simplifiees GraphQL client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: { ok: true } }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("route les requêtes GraphQL via le proxy public quand PUBLIC_PROXY_URL est configuré", async () => {
    vi.stubEnv("PUBLIC_PROXY_URL", PROXY_URL);
    const { query } = await import("@/services/demarches-simplifiees/client");

    const result = await query("query { __typename }", {}, "test-token");

    expect(result).toEqual({ ok: true, data: { ok: true } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v2/graphql");
    expect(init.dispatcher).toBeInstanceOf(ProxyAgent);
    // Seul l'hôte est journalisé : les identifiants du proxy ne doivent jamais l'être.
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("proxy.example.com"));
    expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toContain("proxy-pass");
  });

  it("appelle l'API GraphQL directement quand PUBLIC_PROXY_URL n'est pas configuré", async () => {
    vi.stubEnv("PUBLIC_PROXY_URL", "");
    const { query } = await import("@/services/demarches-simplifiees/client");

    await query("query { __typename }", {}, "test-token");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.dispatcher).toBeUndefined();
  });

  it("ne proxifie pas les appels hors GraphQL (schéma public de préremplissage)", async () => {
    vi.stubEnv("PUBLIC_PROXY_URL", PROXY_URL);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ revision: { champDescriptors: [] } }), { status: 200, headers: { "content-type": "application/json" } }));
    const { getPublicChampDescriptors } = await import("@/services/demarches-simplifiees/functions");

    const result = await getPublicChampDescriptors("ma-demarche");

    expect(result).toEqual({ ok: true, data: [] });
    // Aucune option passée à fetch : donc aucun dispatcher (proxy) sur cet appel.
    const [, init] = fetchMock.mock.calls[0];
    expect(init).toBeUndefined();
  });
});
