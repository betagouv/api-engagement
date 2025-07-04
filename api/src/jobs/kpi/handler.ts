import { Kpi } from "../../types";
import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";
import { buildKpi } from "./kpi";
import { buildKpiBotless } from "./kpi-botless";

export interface KpiJobPayload {
  date?: Date;
}

export interface KpiJobResult extends JobResult {
  success: boolean;
  result: {
    date: Date;
    kpiBotless: Kpi | null;
    kpi: Kpi | null;
  }[];
}

export class KpiHandler implements BaseHandler<KpiJobPayload, KpiJobResult> {
  public async handle(payload: KpiJobPayload): Promise<KpiJobResult> {
    const { date } = payload;
    const today = date || new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    const result: KpiJobResult["result"] = [];

    // build kpi for the last 10 days if not already exists
    for (let i = 0; i < 10; i++) {
      const fromDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - i);

      const kpiBotless = await buildKpiBotless(fromDate);
      const kpi = await buildKpi(fromDate);

      result.push({
        date: fromDate,
        kpiBotless,
        kpi,
      });
    }

    return {
      success: result.every((e) => e.kpiBotless !== null && e.kpi !== null) ? true : false,
      timestamp: new Date(),
      result,
    };
  }
}
