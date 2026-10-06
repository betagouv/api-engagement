import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createValueCache } from "../value-cache";

describe("createValueCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("réutilise la valeur jusqu'à expiration du TTL", async () => {
    const cache = createValueCache<number>(() => 1000);
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await cache.get(load)).toBe(1);
    expect(await cache.get(load)).toBe(1);
    vi.advanceTimersByTime(1001);
    expect(await cache.get(load)).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("partage un seul chargement entre appels concurrents", async () => {
    const cache = createValueCache<number>(() => 1000);
    const load = vi.fn().mockResolvedValue(1);

    await Promise.all([cache.get(load), cache.get(load)]);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("calcule le TTL selon la valeur", async () => {
    const cache = createValueCache<number>((value) => (value > 0 ? 1000 : 10));
    const load = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(5);

    expect(await cache.get(load)).toBe(0);
    vi.advanceTimersByTime(11);
    expect(await cache.get(load)).toBe(5);
    vi.advanceTimersByTime(500);
    expect(await cache.get(load)).toBe(5);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("ne mémorise pas une erreur", async () => {
    const cache = createValueCache<number>(() => 1000);
    const load = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(1);

    await expect(cache.get(load)).rejects.toThrow("boom");
    expect(await cache.get(load)).toBe(1);
  });
});
