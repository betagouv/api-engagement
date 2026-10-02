import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTtlCache } from "@/services/cache";

describe("createTtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("réutilise la valeur chargée jusqu'à expiration du TTL", async () => {
    const cache = createTtlCache<number>({ ttlMs: 1000 });
    const loader = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await cache.getOrLoad("k", loader)).toBe(1);
    expect(await cache.getOrLoad("k", loader)).toBe(1);
    vi.advanceTimersByTime(1001);
    expect(await cache.getOrLoad("k", loader)).toBe(2);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("partage un seul chargement entre appels concurrents", async () => {
    const cache = createTtlCache<number>({ ttlMs: 1000 });
    const loader = vi.fn().mockResolvedValue(1);

    await Promise.all([cache.getOrLoad("k", loader), cache.getOrLoad("k", loader)]);

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("ne mémorise ni les erreurs ni les valeurs refusées par shouldCache", async () => {
    const cache = createTtlCache<number>({ ttlMs: 1000 });
    const loader = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(0).mockResolvedValueOnce(5);

    await expect(cache.getOrLoad("k", loader)).rejects.toThrow("boom");
    expect(await cache.getOrLoad("k", loader, (value) => value > 0)).toBe(0);
    expect(await cache.getOrLoad("k", loader, (value) => value > 0)).toBe(5);
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it("évince l'entrée la plus ancienne au-delà de maxEntries", async () => {
    const cache = createTtlCache<string>({ ttlMs: 1000, maxEntries: 2 });
    const loader = vi.fn(async () => "v");

    await cache.getOrLoad("a", loader);
    await cache.getOrLoad("b", loader);
    await cache.getOrLoad("c", loader);
    await cache.getOrLoad("b", loader);
    await cache.getOrLoad("a", loader);

    expect(loader).toHaveBeenCalledTimes(4);
  });
});
