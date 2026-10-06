import { describe, expect, it, vi } from "vitest";

const createApi = vi.hoisted(() => vi.fn());
vi.mock("~/services/api", () => ({ createApi }));

import { loadPublicStats } from "../public-stats";

describe("loadPublicStats", () => {
  it("n'hérite pas du signal d'annulation de la requête qui déclenche le chargement partagé", async () => {
    const post = vi.fn().mockResolvedValue({ data: { rows: [], cols: [] } });
    createApi.mockReturnValue({ post });
    const controller = new AbortController();
    const request = new Request("http://localhost/statistiques", { headers: { "x-envoy-external-address": "1.2.3.4" }, signal: controller.signal });

    const promise = loadPublicStats(request);
    controller.abort();
    await promise;

    const apiRequest = createApi.mock.calls[0][0] as Request;
    expect(apiRequest.signal.aborted).toBe(false);
    expect(apiRequest.headers.get("x-envoy-external-address")).toBe("1.2.3.4");
  });
});
