import { describe, expect, it, vi } from "vitest";

import { MissionDiffusionCountCache } from "@/services/mission-diffusion/count-cache";

describe("MissionDiffusionCountCache", () => {
  it("réutilise et coalesce un count pendant sa durée de vie", async () => {
    const loader = vi.fn().mockResolvedValue(42);
    const cache = new MissionDiffusionCountCache({ ttlMs: 1_000, maxEntries: 10, now: () => 100 });

    const first = cache.getOrLoad("publisher", loader);
    const second = cache.getOrLoad("publisher", loader);

    await expect(Promise.all([first, second])).resolves.toEqual([42, 42]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("recalcule une entrée expirée", async () => {
    let now = 100;
    const loader = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const cache = new MissionDiffusionCountCache({ ttlMs: 10, maxEntries: 10, now: () => now });

    await expect(cache.getOrLoad("publisher", loader)).resolves.toBe(1);
    now = 111;
    await expect(cache.getOrLoad("publisher", loader)).resolves.toBe(2);
  });

  it("ne conserve pas une promesse rejetée", async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error("count failed")).mockResolvedValueOnce(3);
    const cache = new MissionDiffusionCountCache({ ttlMs: 1_000, maxEntries: 10 });

    await expect(cache.getOrLoad("publisher", loader)).rejects.toThrow("count failed");
    await expect(cache.getOrLoad("publisher", loader)).resolves.toBe(3);
  });

  it("borne le nombre d'entrées", async () => {
    const loader = vi.fn().mockResolvedValue(1);
    const cache = new MissionDiffusionCountCache({ ttlMs: 1_000, maxEntries: 1 });

    await cache.getOrLoad("first", loader);
    await cache.getOrLoad("second", loader);
    await cache.getOrLoad("first", loader);

    expect(loader).toHaveBeenCalledTimes(3);
  });
});
