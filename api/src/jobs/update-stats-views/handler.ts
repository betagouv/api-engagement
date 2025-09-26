import { prismaCore } from "../../db/postgres";
import { captureException } from "../../error";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";

const VIEWS = [
  "PublicStatsGraphMonthly",
  "PublicStatsGraphYearlyOrganizations",
  "PublicStatsDomains",
  "PublicStatsDepartments",
  "StatsGlobalEvents",
  "StatsGlobalMissionActivity",
] as const;

export interface UpdateStatsViewsJobResult extends JobResult {
  refreshed: string[];
}

export class UpdateStatsViewsHandler implements BaseHandler<void, UpdateStatsViewsJobResult> {
  name = "Mise à jour des vues materialized des stats publiques";

  async handle(): Promise<UpdateStatsViewsJobResult> {
    const refreshed: string[] = [];

    for (const view of VIEWS) {
      try {
        await prismaCore.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY "${view}"`);
        refreshed.push(view);
      } catch (error) {
        captureException(error, { extra: { view } });
        throw error;
      }
    }

    return {
      success: true,
      timestamp: new Date(),
      message: `Vues mises à jour: ${refreshed.join(", ")}`,
      refreshed,
    };
  }
}

export default UpdateStatsViewsHandler;
