import importAccounts from "./utils/account";
import importApplies from "./utils/apply";
import updateBotHuman from "./utils/bot-human";
import importClicks from "./utils/click";
import importImpressions from "./utils/print";

import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";

export interface ExportStatsToPgJobPayload {
  jobs?: string;
}

export interface ExportStatsToPgJobResult extends JobResult {
  stats: {
    [key: string]: {
      created: number;
      updated: number | null;
    };
  };
}

export class ExportStatsToPgHandler implements BaseHandler<ExportStatsToPgJobPayload, ExportStatsToPgJobResult> {
  name = "Export stats to PG";

  public async handle(payload: ExportStatsToPgJobPayload): Promise<ExportStatsToPgJobResult> {
    const stats = {
      prints: { created: 0, updated: null },
      clicks: { created: 0, updated: null },
      applies: { created: 0, updated: null },
      accounts: { created: 0, updated: 0 },
      botHuman: { bot: 0, human: 0 },
    } as any;

    const jobs = payload?.jobs ? payload.jobs.split(",") : null;

    if (jobs === null || jobs.includes("prints")) {
      const impressions = await importImpressions();
      stats.prints.created += impressions?.created || 0;
    }

    if (jobs === null || jobs.includes("clicks")) {
      const clicks = await importClicks();
      stats.clicks.created += clicks?.created || 0;
    }

    if (jobs === null || jobs.includes("applies")) {
      const applies = await importApplies();
      stats.applies.created += applies?.created || 0;
    }

    if (jobs === null || jobs.includes("accounts")) {
      const accounts = await importAccounts();
      stats.accounts.created += accounts?.created || 0;
      stats.accounts.updated += accounts?.updated || 0;
    }

    if (jobs === null || jobs.includes("bot-human")) {
      const botHuman = await updateBotHuman();
      stats.botHuman.bot += botHuman?.updatedBot || 0;
      stats.botHuman.human += botHuman?.updatedHuman || 0;
    }

    return {
      stats,
      success: true,
      timestamp: new Date(),
      message: JSON.stringify(stats),
    };
  }
}
