type CountCacheEntry = {
  expiresAt: number;
  count: Promise<number>;
};

type CountCacheOptions = {
  ttlMs: number;
  maxEntries: number;
  now?: () => number;
};

/** Cache local borné des totaux calculés depuis un snapshot de diffusion. */
export class MissionDiffusionCountCache {
  private readonly entries = new Map<string, CountCacheEntry>();
  private readonly now: () => number;

  constructor(private readonly options: CountCacheOptions) {
    this.now = options.now ?? Date.now;
  }

  getOrLoad(key: string, loader: () => Promise<number>): Promise<number> {
    const now = this.now();
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.count;
    }
    if (cached) {
      this.entries.delete(key);
    }

    if (this.entries.size >= this.options.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey) {
        this.entries.delete(oldestKey);
      }
    }

    const count = loader().catch((error) => {
      if (this.entries.get(key)?.count === count) {
        this.entries.delete(key);
      }
      throw error;
    });
    this.entries.set(key, { expiresAt: now + this.options.ttlMs, count });
    return count;
  }
}
