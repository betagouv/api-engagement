import { MissionAddress, MissionRecord } from "@/types/mission";
import { PublisherMissionType } from "@/types/publisher";

export type LinkedInJobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "VOLUNTEER";

export type LinkedInSalaryPeriod = "YEARLY" | "MONTHLY" | "SEMIMONTHLY" | "BIWEEKLY" | "WEEKLY" | "DAILY" | "HOURLY" | "ONCE";

export interface LinkedInJob {
  partnerJobId: string;
  company: string;
  companyId: string;
  title: string;
  description: string;
  applyUrl: string;
  location: string;
  postalCode?: string;
  workplaceTypes: "On-site" | "Hybrid" | "Remote";
  jobtype: LinkedInJobType;
  industryCodes?: { industryCode: number }[];
  salaries?: {
    salary: {
      highEnd: { amount: number; currencyCode: "EUR" };
      lowEnd: { amount: number; currencyCode: "EUR" };
      period: LinkedInSalaryPeriod;
      type: "BASE_SALARY";
    };
  };
  listDate: string; // MM/DD/YYYY
  expirationDate?: string;
}

/**
 * Un dispositif (JVA, Service Civique, SPV…) regroupe tout ce qui lui est spécifique dans le flux :
 * périmètre de missions, page entreprise, titre, introduction et type d'emploi.
 * Pour en ajouter un : créer un fichier dans `dispositifs/` et l'enregistrer dans `dispositifs/index.ts`.
 */
export interface DispositifDefinition {
  id: string;
  label: string;
  /** Périmètre : publishers fixes, ou tous les publishers d'un type de mission. */
  scope: { publisherIds: string[] } | { missionType: PublisherMissionType };
  jobType: LinkedInJobType;
  /** Écarte les missions dont la date de fin est passée. */
  skipExpired?: boolean;
  page(mission: MissionRecord): { company: string; companyId: string };
  /** `address` : adresse du job généré (absente pour une mission à distance sans adresse). */
  title(mission: MissionRecord, address?: MissionAddress): string;
  /** Introduction HTML placée avant la description de la mission. */
  intro(mission: MissionRecord): string;
}
