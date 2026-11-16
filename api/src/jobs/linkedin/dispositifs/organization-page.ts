import { LINKEDIN_PAGES, LINKEDIN_PARTNER_PAGES } from "@/jobs/linkedin/config";
import { MissionRecord } from "@/types/mission";

/** Page de l'organisation si elle en a une sur LinkedIn, sinon page JVA. */
export function organizationPage(mission: MissionRecord): { company: string; companyId: string } {
  const organizationName = mission.organizationName as string;
  const companyId = LINKEDIN_PARTNER_PAGES[organizationName];
  return companyId ? { company: organizationName, companyId } : LINKEDIN_PAGES.JVA;
}
