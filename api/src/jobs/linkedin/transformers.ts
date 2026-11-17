import { DESCRIPTION_MAX_LENGTH, DESCRIPTION_MIN_LENGTH, LINKEDIN_INDUSTRY_CODE, LINKEDIN_PUBLISHER_ID } from "@/jobs/linkedin/config";
import { descriptionBlock } from "@/jobs/linkedin/dispositifs/blocks";
import { DispositifDefinition, LinkedInJob, LinkedInSalaryPeriod } from "@/jobs/linkedin/types";
import { textLength } from "@/jobs/linkedin/utils";
import { MissionAddress, MissionRecord } from "@/types/mission";
import { formatDateMMDDYYYY, getMissionTrackedApplicationUrl } from "@/utils";

const SALARY_PERIODS: Record<string, LinkedInSalaryPeriod> = { hour: "HOURLY", day: "DAILY", month: "MONTHLY", year: "YEARLY" };

export function formatLocation(address: MissionAddress) {
  const country = address.country ?? "FR";
  return `${address.city ? `${address.city}, ` : ""}${country === "FR" ? "France" : country}`;
}

function buildSalary(mission: MissionRecord): LinkedInJob["salaries"] {
  const period = mission.compensationUnit ? SALARY_PERIODS[mission.compensationUnit] : undefined;
  if (!mission.compensationAmount || !period) {
    return undefined;
  }
  // LinkedIn attend des montants entiers.
  const low = Math.round(mission.compensationAmount);
  const high = Math.round(mission.compensationAmountMax ?? mission.compensationAmount);
  return { salary: { highEnd: { amount: high, currencyCode: "EUR" }, lowEnd: { amount: low, currencyCode: "EUR" }, period, type: "BASE_SALARY" } };
}

/** Adresses diffusables (ville renseignée, dédoublonnées). Mission 100 % à distance sans adresse → France. */
function resolveAddresses(mission: MissionRecord): (MissionAddress | null)[] {
  const seen = new Set<string>();
  const keyOf = (a: MissionAddress) => `${a.city}|${a.postalCode}`;
  // Ordre déterministe (l'ordre SQL ne l'est pas) : les suffixes de `partnerJobId` en dépendent.
  const sorted = [...(mission.addresses ?? [])].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  const addresses = sorted.filter((a) => {
    const key = keyOf(a);
    if (!a.city || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  if (addresses.length > 0) {
    return addresses;
  }
  return mission.remote === "full" ? [null] : [];
}

/**
 * Transforme une mission en jobs LinkedIn (un par adresse, LinkedIn n'acceptant qu'un lieu par offre).
 * Doc: https://learn.microsoft.com/en-us/linkedin/talent/job-postings/xml-feeds-development-guide?view=li-lts-2025-04
 * Retourne [] si la mission n'est pas diffusable (champs obligatoires manquants, description hors bornes, pas de lieu).
 */
export function missionToLinkedinJobs(mission: MissionRecord, dispositif: DispositifDefinition): LinkedInJob[] {
  if (!mission.title || !mission.description || !mission.organizationName) {
    return [];
  }
  // Le minimum porte sur la description de la mission, pas sur le texte du dispositif.
  if (textLength(descriptionBlock(mission)) < DESCRIPTION_MIN_LENGTH) {
    return [];
  }
  const description = dispositif.description(mission);
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return [];
  }

  const page = dispositif.page(mission);
  const industryCode = LINKEDIN_INDUSTRY_CODE[mission.domain ?? ""];
  const workplaceTypes = mission.remote === "full" ? "Remote" : mission.remote === "possible" ? "Hybrid" : "On-site";

  return resolveAddresses(mission).map((address, index) => {
    const job: LinkedInJob = {
      // Un id par adresse ≤ 40 caractères (uuid 36 + "-N") ; la 1re garde l'id seul (continuité du flux existant).
      partnerJobId: index === 0 ? mission.id : `${mission.id}-${index}`,
      company: page.company,
      companyId: page.companyId,
      title: dispositif.title(mission, address ?? mission.addresses?.[0]),
      description,
      applyUrl: getMissionTrackedApplicationUrl(mission, LINKEDIN_PUBLISHER_ID),
      location: address ? formatLocation(address) : "France",
      postalCode: address?.postalCode ?? undefined,
      workplaceTypes,
      jobtype: dispositif.jobType,
      industryCodes: industryCode ? [{ industryCode }] : undefined,
      salaries: buildSalary(mission),
      listDate: formatDateMMDDYYYY(mission.postedAt ?? mission.createdAt),
    };
    if (mission.endAt) {
      job.expirationDate = new Date(mission.endAt).toISOString();
    }
    return job;
  });
}
