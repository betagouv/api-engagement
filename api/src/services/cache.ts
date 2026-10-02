type Entry<T> = { value: T; expiresAt: number };

type TtlCacheOptions = {
  ttlMs: number;
  maxEntries?: number;
};

// Cache mémoire par processus avec TTL : les appels concurrents sur une même clé partagent un seul chargement.
export const createTtlCache = <T>({ ttlMs, maxEntries = 500 }: TtlCacheOptions) => {
  const entries = new Map<string, Entry<T>>();
  const inflight = new Map<string, Promise<T>>();

  const store = (key: string, value: T) => {
    if (entries.size >= maxEntries) {
      // Les clés sont ordonnées par insertion : on évince la plus ancienne.
      entries.delete(entries.keys().next().value as string);
    }
    entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  };

  return {
    // `shouldCache` permet de ne pas mémoriser un résultat (ex. réponse en erreur).
    async getOrLoad(key: string, loader: () => Promise<T>, shouldCache: (value: T) => boolean = () => true): Promise<T> {
      const hit = entries.get(key);
      if (hit && hit.expiresAt > Date.now()) {
        return hit.value;
      }
      entries.delete(key);

      const pending = inflight.get(key);
      if (pending) {
        return pending;
      }

      const promise = loader()
        .then((value) => {
          if (shouldCache(value)) {
            store(key, value);
          }
          return value;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, promise);
      return promise;
    },

    clear() {
      entries.clear();
      inflight.clear();
    },
  };
};
