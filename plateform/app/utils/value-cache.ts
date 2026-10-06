// Cache mémoire d'une valeur unique, avec TTL calculé par valeur : les appels concurrents partagent un seul chargement.
export function createValueCache<T>(ttlMs: (value: T) => number) {
  let cached: { value: T; expiresAt: number } | null = null;
  let pending: Promise<T> | null = null;

  return {
    get(load: () => Promise<T>): Promise<T> {
      if (cached && cached.expiresAt > Date.now()) {
        return Promise.resolve(cached.value);
      }
      pending ??= load()
        .then((value) => {
          cached = { value, expiresAt: Date.now() + ttlMs(value) };
          return value;
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    clear() {
      cached = null;
    },
  };
}
