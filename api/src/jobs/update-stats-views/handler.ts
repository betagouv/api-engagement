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

type ViewRefreshed = {
  view: string;
  duration: number;
};

export interface UpdateStatsViewsJobResult extends JobResult {
  refreshed: ViewRefreshed[];
  errors: string[];
}

export type UpdateStatsViewsPayload = {
  views?: string[];
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, exponential backoff

export class UpdateStatsViewsHandler implements BaseHandler<UpdateStatsViewsPayload | undefined, UpdateStatsViewsJobResult> {
  name = "Mise à jour des vues materialized des stats publiques";

  async handle(payload?: UpdateStatsViewsPayload): Promise<UpdateStatsViewsJobResult> {
    const refreshed: ViewRefreshed[] = [];
    const errors: string[] = [];

    // Determine which views to refresh
    const allowed = new Set<string>(VIEWS as readonly string[]);
    const requested = payload?.views && payload.views.length > 0 ? payload.views : (VIEWS as readonly string[]);
    const viewsToRefresh = requested.filter((v) => allowed.has(v));

    for (const view of viewsToRefresh) {
      try {
        const startedAt = new Date();
        console.log(`Refreshing view ${view}...`);

        // Retry loop for transient failures (e.g., 57P01 admin shutdown)
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            await prismaCore.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY "${view}"`);
            const duration = (new Date().getTime() - startedAt.getTime()) / 1000;
            console.log(`View ${view} refreshed in ${duration}s`);
            refreshed.push({ view, duration });
            break;
          } catch (err: any) {
            const code = err?.meta?.code || err?.code;
            const message = err?.meta?.message || err?.message;

            if (this.isNotPopulatedError(code, message)) {
              console.warn(`View ${view} is empty, refreshing without CONCURRENTLY to populate it...`);
              try {
                await prismaCore.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW "${view}"`);
                const duration = (new Date().getTime() - startedAt.getTime()) / 1000;
                console.log(`View ${view} refreshed (initial population) in ${duration}s`);
                refreshed.push({ view, duration });
                break;
              } catch (fallbackError) {
                captureException(fallbackError, { extra: { view, concurrent: false } });
              }
            }

            const attemptMsg = `Attempt ${attempt}/${MAX_RETRIES} failed for ${view}${code ? ` (code ${code})` : ""}${message ? `: ${message}` : ""}`;
            console.warn(attemptMsg);

            if (attempt >= MAX_RETRIES) {
              captureException(err, { extra: { view, attempts: attempt } });
              errors.push(view);
              break;
            }

            // Backoff before retrying
            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
            await this.sleep(delay);
          }
        }
      } catch (error) {
        captureException(error, { extra: { view } });
        errors.push(view);
      }
    }

    let message = `Materialized views Postgres mises à jour: ${refreshed.map((v) => `${v.view} (${v.duration}s)`).join(", ")}`;
    if (errors.length > 0) {
      message += `\nErreur(s) lors de la mise à jour des vues materialisées: ${errors.join(", ")}`;
    }

    return {
      success: true,
      timestamp: new Date(),
      message,
      refreshed,
      errors,
    };
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isNotPopulatedError(code?: string, message?: string) {
    if (!code && !message) {
      return false;
    }
    const normalizedCode = code?.toUpperCase();
    if (normalizedCode === "0A000") {
      return true;
    }
    return message?.toLowerCase().includes("materialized view is not populated") ?? false;
  }
}

export default UpdateStatsViewsHandler;
