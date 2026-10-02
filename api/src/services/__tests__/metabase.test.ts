import { afterEach, describe, expect, it, vi } from "vitest";

import { metabaseService } from "@/services/metabase";

vi.mock("@/config", () => ({
  METABASE_URL: "https://metabase.example",
  METABASE_API_KEY: "test-key",
}));

describe("metabaseService.queryCard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    metabaseService.clearCache();
  });

  it("construit la requête depuis les variables sans transmettre de corps libre", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ parameters: [{ id: "publisher-param", slug: "publisher_id" }] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ rows: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    await metabaseService.queryCard("5494", {
      variables: { publisher_id: "own-publisher" },
      parameters: [{ value: "other-publisher" }],
      body: { parameters: [{ value: "other-publisher" }] },
    } as Parameters<typeof metabaseService.queryCard>[1]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, options] = fetchMock.mock.calls[1];
    expect(JSON.parse(options.body)).toEqual({ parameters: [{ id: "publisher-param", value: "own-publisher" }] });
  });

  const jsonResponse = (rows: unknown[] = []) => ({ ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ rows }) });

  it("met en cache les cartes publiques, par jeu de variables", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal("fetch", fetchMock);

    await metabaseService.queryCard("5525");
    await metabaseService.queryCard("5525");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ne met pas en cache les cartes non publiques", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal("fetch", fetchMock);

    await metabaseService.queryCard("5497");
    await metabaseService.queryCard("5497");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ne met pas en cache une réponse en erreur", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, headers: new Headers({ "content-type": "text/plain" }), text: async () => "error" });
    vi.stubGlobal("fetch", fetchMock);

    await metabaseService.queryCard("5525");
    await metabaseService.queryCard("5525");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
