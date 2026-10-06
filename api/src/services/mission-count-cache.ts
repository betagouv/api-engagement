import { createTtlCache } from "@/services/cache";
import type { MissionSearchFilters } from "@/types/mission";

const missionCountCache = createTtlCache<number>({ ttlMs: 5 * 60 * 1000, maxEntries: 1_000 });

const buildMissionCountCacheKey = (filters: MissionSearchFilters) => {
  const countFilters: Partial<MissionSearchFilters> = { ...filters };
  delete countFilters.limit;
  delete countFilters.skip;
  return JSON.stringify(countFilters);
};

export const getCachedMissionCount = (filters: MissionSearchFilters, loader: () => Promise<number>) =>
  missionCountCache.getOrLoad(buildMissionCountCacheKey(filters), loader);
