import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpstreamApiError, createApi, upstreamErrorResponse } from "../index";

const fakeRequest = (ip?: string) =>
  new Request("http://localhost", {
    headers: ip ? { "x-envoy-external-address": ip } : {},
  });

const mockFetch = (status: number, body: unknown, ok = status >= 200 && status < 300, headers?: Record<string, string>) => {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
  } as Response);
};

const mockFetchNetworkError = () => vi.fn().mockRejectedValue(new Error("Network error"));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", mockFetch(200, { ok: true, data: { id: 1 } }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("api.get", () => {
  it("appelle fetch avec la méthode GET et l'URL correcte", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: { id: 1 } });
    vi.stubGlobal("fetch", fetchMock);

    await createApi(fakeRequest()).get("/missions");

    expect(fetchMock).toHaveBeenCalledWith("http://fake-api.test/missions", expect.objectContaining({ method: "GET" }));
  });

  it("inclut le header x-api-key", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: {} });
    vi.stubGlobal("fetch", fetchMock);

    await createApi(fakeRequest()).get("/missions");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).toMatchObject({ "x-api-key": "test-key" });
  });

  it("retourne data de l'enveloppe JSON", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { ok: true, data: { id: 42, title: "Test" } }));

    const result = await createApi(fakeRequest()).get<{ id: number; title: string }>("/missions/42");

    expect(result).toEqual({ id: 42, title: "Test" });
  });

  it("lève UpstreamApiError si response.ok est false", async () => {
    vi.stubGlobal("fetch", mockFetch(404, { ok: false, code: "NOT_FOUND" }, false));
    const api = createApi(fakeRequest());

    await expect(api.get("/missions/999")).rejects.toThrow(UpstreamApiError);
    await expect(api.get("/missions/999")).rejects.toMatchObject({ status: 404 });
  });

  it("lève UpstreamApiError(502) si json.ok est false même avec HTTP 200", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { ok: false, code: "BUSINESS_ERROR" }));

    await expect(createApi(fakeRequest()).get("/missions")).rejects.toMatchObject({ name: "UpstreamApiError", status: 502 });
  });

  it("lève UpstreamApiError(502) en cas d'erreur réseau", async () => {
    vi.stubGlobal("fetch", mockFetchNetworkError());

    await expect(createApi(fakeRequest()).get("/missions")).rejects.toMatchObject({ status: 502 });
  });

  it("gère un body 401 sans JSON valide (retourne UNAUTHORIZED)", async () => {
    vi.stubGlobal("fetch", {
      ...vi.fn(),
      mockResolvedValue: undefined,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () => Promise.reject(new Error("no json")),
      } as unknown as Response),
    );

    const err = await createApi(fakeRequest())
      .get("/missions")
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UpstreamApiError);
    expect((err as UpstreamApiError).body.code).toBe("UNAUTHORIZED");
  });

  it("forwarde x-platform-client-ip quand l'IP est fournie via x-envoy-external-address", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: {} });
    vi.stubGlobal("fetch", fetchMock);

    await createApi(fakeRequest("1.2.3.4")).get("/missions");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).toMatchObject({ "x-platform-client-ip": "1.2.3.4" });
  });

  it("n'inclut pas x-platform-client-ip si x-envoy-external-address est absent", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: {} });
    vi.stubGlobal("fetch", fetchMock);

    await createApi(fakeRequest()).get("/missions");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers?.["x-platform-client-ip"]).toBeUndefined();
  });

  it("expose les timings du proxy et de l'ingress API sur la réponse", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { ok: true, data: {} }, true, { "x-envoy-upstream-service-time": "87" }));
    const api = createApi(fakeRequest());

    await api.get("/missions");
    const response = api.json({ ok: true, data: {} });

    expect(response.headers.get("server-timing")).toMatch(
      /upstream-ttfb;dur=\d+\.\d, api-envoy;dur=87\.0, upstream-body;dur=\d+\.\d, upstream;dur=\d+\.\d, serialize;dur=\d+\.\d, proxy;dur=\d+\.\d/,
    );
  });

  it("n'ajoute pas api-envoy quand l'ingress ne fournit pas son timing", async () => {
    const api = createApi(fakeRequest());

    await api.get("/missions");
    const response = api.json({ ok: true, data: {} });

    expect(response.headers.get("server-timing")).not.toContain("api-envoy");
  });
});

describe("api.post", () => {
  it("sérialise le body en JSON et pose Content-Type", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: { id: 1 } });
    vi.stubGlobal("fetch", fetchMock);

    await createApi(fakeRequest()).post("/user-scoring", { answers: [] });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(options.body).toBe(JSON.stringify({ answers: [] }));
  });

  it("n'inclut pas Content-Type si pas de body", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: {} });
    vi.stubGlobal("fetch", fetchMock);

    await createApi(fakeRequest()).post("/user-scoring");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers?.["Content-Type"]).toBeUndefined();
  });
});

describe("api.put", () => {
  it("appelle fetch avec la méthode PUT", async () => {
    const fetchMock = mockFetch(200, { ok: true, data: {} });
    vi.stubGlobal("fetch", fetchMock);

    await createApi(fakeRequest()).put("/user-scoring/123", { answers: [] });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("PUT");
  });
});

describe("upstreamErrorResponse", () => {
  it.each([
    ["JSON invalide", "not-json"],
    ["enveloppe en échec", '{"ok":false,"code":"BUSINESS_ERROR"}'],
    ["JSON null", "null"],
    ["enveloppe sans ok", "{}"],
    ["ok non booléen", '{"ok":"true"}'],
  ])("journalise un HTTP 200 avec %s malgré un fallback et renvoie 502 sans doublon", async (_reason, body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    const api = createApi(fakeRequest());
    let upstreamError: unknown;
    const result = await api.get("/missions/browse").catch((error: unknown) => {
      upstreamError = error;
      return [];
    });

    expect(result).toEqual([]);
    expect(upstreamError).toBeInstanceOf(UpstreamApiError);
    expect(upstreamError).toMatchObject({ status: 502 });
    expect(console.error).toHaveBeenCalledOnce();
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0] as string)).toMatchObject({ event: "upstream_error", status: 502 });
    const response = api.error(upstreamError);
    expect(response.status).toBe(502);
    expect(response.headers.get("server-timing")).toContain("upstream;dur=");
    expect(console.error).toHaveBeenCalledOnce();
  });

  it.each([401, 404, 500, 503])("conserve le statut upstream %s même pour une réponse non JSON", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json", { status })));
    const api = createApi(fakeRequest());
    const error = await api.get("/missions/browse").catch((error: unknown) => error);
    expect(api.error(error).status).toBe(status);
    if (status >= 500) expect(console.error).toHaveBeenCalledOnce();
    else expect(console.error).not.toHaveBeenCalled();
  });

  it("journalise aussi un échec backend absorbé par un fallback de loader", async () => {
    vi.stubGlobal("fetch", mockFetch(500, { ok: false, code: "INTERNAL_ERROR" }));
    await createApi(fakeRequest())
      .get("/missions/browse")
      .catch(() => []);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0] as string)).toMatchObject({ event: "upstream_error", error: { code: "INTERNAL_ERROR" } });
  });

  it("journalise un 500 une seule fois et corrèle la réponse et l'appel upstream", async () => {
    const request = new Request("http://localhost/api/missions/match?email=private@example.test", { headers: { "x-request-id": "trace-123" } });
    vi.stubGlobal("fetch", mockFetch(500, { ok: false, code: "INTERNAL_ERROR", message: "private@example.test" }));
    const error = await createApi(request)
      .get("/missions/match?userScoringId=private-id")
      .catch((error: unknown) => error);
    const response = upstreamErrorResponse(error, request);
    upstreamErrorResponse(error, request);

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe("trace-123");
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: expect.objectContaining({ "x-request-id": "trace-123" }) }));
    expect(console.error).toHaveBeenCalledTimes(1);
    const line = vi.mocked(console.error).mock.calls[0][0] as string;
    expect(JSON.parse(line)).toMatchObject({
      event: "upstream_error",
      status: 500,
      request_id: "trace-123",
      path: "/api/missions/match",
      upstream: { method: "GET", path: "/missions/match", duration_ms: expect.any(Number) },
    });
    expect(line).not.toContain("private@example.test");
    expect(line).not.toContain("private-id");
    expect(line).not.toContain("test-key");
  });

  it("conserve le code de la cause réseau sans l'exposer dans la réponse", async () => {
    const request = fakeRequest();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed", { cause: Object.assign(new Error("private address"), { code: "ECONNREFUSED" }) })));
    const error = await createApi(request)
      .get("/missions/match")
      .catch((error: unknown) => error);
    const response = upstreamErrorResponse(error, request);

    expect(response.status).toBe(502);
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0] as string).error.cause).toMatchObject({ name: "TypeError", cause: { code: "ECONNREFUSED" } });
    expect(JSON.stringify(await response.json())).not.toContain("ECONNREFUSED");
  });

  it("ne journalise pas les 4xx attendues ni les requêtes annulées", () => {
    upstreamErrorResponse(new UpstreamApiError(404, { ok: false }), fakeRequest());
    const controller = new AbortController();
    const request = new Request("http://localhost/api/user-scoring", { signal: controller.signal });
    controller.abort();
    upstreamErrorResponse(new UpstreamApiError(502, { ok: false }), request);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("retourne une Response avec le status et le body de l'erreur upstream", async () => {
    const error = new UpstreamApiError(404, { ok: false, code: "NOT_FOUND" });
    const response = upstreamErrorResponse(error, fakeRequest());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("retourne 502 pour une erreur inconnue", async () => {
    const response = upstreamErrorResponse(new Error("unknown"), fakeRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ ok: false, code: "upstream_error" });
  });

  it("conserve les informations d'observabilité sur une erreur de la façade", async () => {
    vi.stubGlobal("fetch", mockFetch(504, { ok: false, code: "TIMEOUT" }));
    const request = new Request("http://localhost/api/missions/match", { headers: { "x-request-id": "trace-timeout" } });
    const api = createApi(request);
    const error = await api.get("/missions/match").catch((error: unknown) => error);

    const response = api.error(error);

    expect(response.status).toBe(504);
    expect(response.headers.get("x-request-id")).toBe("trace-timeout");
    expect(response.headers.get("server-timing")).toContain("upstream-ttfb;dur=");
    expect(response.headers.get("server-timing")).toContain("proxy;dur=");
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("conserve les timings et la cause réseau dans api.error", async () => {
    vi.stubGlobal("fetch", mockFetchNetworkError());
    const api = createApi(fakeRequest());
    const error = await api.get("/missions/match").catch((error: unknown) => error);
    const response = api.error(error);

    expect(response.status).toBe(502);
    expect(response.headers.get("server-timing")).toContain("upstream;dur=");
    expect(response.headers.get("server-timing")).toContain("proxy;dur=");
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
