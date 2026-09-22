import { Prisma } from "@/db/core";
import { buildWhere, missionService } from "@/services/mission";
import { MissionRecord, MissionSearchFilters } from "@/types/mission";

const DEFAULT_BATCH_SIZE = 500;

interface CursorOptions {
  batchSize?: number;
  orderBy?: Prisma.MissionOrderByWithRelationInput | Prisma.MissionOrderByWithRelationInput[];
  limit?: number; // Plafond global d'items émis (les feeds cappés, ex. Service Civique).
}

/**
 * Parcourt les missions correspondant aux `filters` par lots (`batchSize`), pour éviter de tout
 * charger en mémoire. `limit` borne le nombre total d'items émis. Utilisé par les jobs de feed.
 */
export async function* getMissionsCursor(filters: Omit<MissionSearchFilters, "limit" | "skip">, options: CursorOptions = {}): AsyncGenerator<MissionRecord> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const orderBy = options.orderBy ?? { createdAt: Prisma.SortOrder.asc };
  const where = await buildWhere({ ...filters, limit: batchSize, skip: 0 });
  const total = options.limit ?? (await missionService.countBy(where));

  let skip = 0;
  while (skip < total) {
    const take = Math.min(batchSize, total - skip);
    const missions = await missionService.findMissionsBy(where, { limit: take, skip, orderBy });
    if (!missions.length) {
      break;
    }
    for (const mission of missions) {
      yield mission;
    }
    skip += missions.length;
  }
}
