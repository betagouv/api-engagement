import importCampaigns from "./utils/campaign";
import importPartners from "./utils/partner";

import { BaseHandler } from "../base/handler";
import { JobResult } from "../types";

export interface MetabaseJobPayload {
  jobs?: string;
}

export interface MetabaseJobResult extends JobResult {
  stats: {
    [key: string]: {
      created: number;
      updated: number | null;
    };
  };
}
export class MetabaseHandler implements BaseHandler<MetabaseJobPayload, MetabaseJobResult> {
  name = "Export data to Metabase";

  public async handle(payload: MetabaseJobPayload): Promise<MetabaseJobResult> {
    const stats = {
      partners: { created: 0, updated: 0 },
      campaigns: { created: 0, updated: 0 },
      organization_name_matches: { created: 0, updated: 0 },
      requests: { created: 0, updated: null },
    };

    const jobs = payload?.jobs ? payload.jobs.split(",") : null;

    if (jobs === null || jobs.includes("partners")) {
      const partners = await importPartners();
      stats.partners.created += partners?.created || 0;
      stats.partners.updated += partners?.updated || 0;
    }

    if (jobs === null || jobs.includes("campaigns")) {
      const campaigns = await importCampaigns();
      stats.campaigns.created += campaigns?.created || 0;
      stats.campaigns.updated += campaigns?.updated || 0;
    }

    // Send message to slack
    const text = `${Object.entries(stats)
      .map(([key, value]) => `${key}: ${value.created} created${value.updated !== null ? `, ${value.updated} updated` : ""}`)
      .join("\n")}`;

    return {
      stats,
      success: true,
      timestamp: new Date(),
      message: text,
    };
  }
}
