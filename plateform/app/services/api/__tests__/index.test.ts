import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpstreamApiError, api, upstreamErrorResponse } from "../index";

const mockFetch = (status: number, body: unknown, ok = status >= 200 && status < 300) => {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
};

const mockFetchNetworkError = () => vi.fn().mockRejectedValue(new Error("Network error"));

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch(200, { ok: true, data: { id: 1 } }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api.get", () => {
  it("appelle fetch avec la méthode GET et l'URL correcte", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: { id: 1 } });
    vi.stubGlobal("fetch", fetchMock);

    await api.get("/missions");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://fake-api.test/missions",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("inclut le header x-api-key", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: {} });
    vi.stubGlobal("fetch", fetchMock);

    await api.get("/missions");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).toMatchObject({ "x-api-key": "test-key" });
  });

  it("retourne data de l'enveloppe JSON", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { ok: true, data: { id: 42, title: "Test" } }));

    const result = await api.get<{ id: number; title: string }>("/missions/42");

    expect(result).toEqual({ id: 42, title: "Test" });
  });

  it("lève UpstreamApiError si response.ok est false", async () => {
    vi.stubGlobal("fetch", mockFetch(404, { ok: false, code: "NOT_FOUND" }, false));

    await expect(api.get("/missions/999")).rejects.toThrow(UpstreamApiError);
    await expect(api.get("/missions/999")).rejects.toMatchObject({ status: 404 });
  });

  it("lève UpstreamApiError si json.ok est false même avec HTTP 200", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { ok: false, code: "BUSINESS_ERROR" }));

    await expect(api.get("/missions")).rejects.toThrow(UpstreamApiError);
  });

  it("lève UpstreamApiError(502) en cas d'erreur réseau", async () => {
    vi.stubGlobal("fetch", mockFetchNetworkError());

    await expect(api.get("/missions")).rejects.toMatchObject({ status: 502 });
  });

  it("gère un body 401 sans JSON valide (retourne UNAUTHORIZED)", async () => {
    vi.stubGlobal("fetch", {
      ...vi.fn(),
      mockResolvedValue: undefined,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.reject(new Error("no json")),
    } as unknown as Response));

    const err = await api.get("/missions").catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamApiError);
    expect(err.body.code).toBe("UNAUTHORIZED");
  });
});

describe("api.post", () => {
  it("sérialise le body en JSON et pose Content-Type", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: { id: 1 } });
    vi.stubGlobal("fetch", fetchMock);

    await api.post("/user-scoring", { answers: [] });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(options.body).toBe(JSON.stringify({ answers: [] }));
  });

  it("n'inclut pas Content-Type si pas de body", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: {} });
    vi.stubGlobal("fetch", fetchMock);

    await api.post("/user-scoring");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers?.["Content-Type"]).toBeUndefined();
  });
});

describe("api.put", () => {
  it("appelle fetch avec la méthode PUT", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: {} });
    vi.stubGlobal("fetch", fetchMock);

    await api.put("/user-scoring/123", { answers: [] });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("PUT");
  });
});

describe("upstreamErrorResponse", () => {
  it("retourne une Response avec le status et le body de l'erreur upstream", async () => {
    const error = new UpstreamApiError(404, { ok: false, code: "NOT_FOUND" });
    const response = upstreamErrorResponse(error);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("retourne 502 pour une erreur inconnue", async () => {
    const response = upstreamErrorResponse(new Error("unknown"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: "upstream_error" });
  });
});
