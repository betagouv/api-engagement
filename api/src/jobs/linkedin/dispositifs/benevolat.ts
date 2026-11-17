import { PUBLISHER_IDS } from "@/config";
import { LINKEDIN_ORGANIZATION_PAGES, LINKEDIN_PAGES } from "@/jobs/linkedin/config";
import { descriptionBlock, scheduleBlock } from "@/jobs/linkedin/dispositifs/blocks";
import { DispositifDefinition } from "@/jobs/linkedin/types";
import { getAudienceLabel, getDomainLabel } from "@/jobs/linkedin/utils";

// Bénévolat : même rendu pour JVA et les autres annonceurs, seuls le périmètre et le plafond diffèrent.
const benevolat = {
  jobType: "VOLUNTEER",
  // Page de l'organisation si elle en a une sur LinkedIn, sinon page JVA.
  page: (mission) => {
    const organizationName = mission.organizationName as string;
    const companyId = LINKEDIN_ORGANIZATION_PAGES[organizationName];
    return companyId ? { company: organizationName, companyId } : LINKEDIN_PAGES.JVA;
  },
  title: (mission) => `Bénévolat : ${mission.title.trim()}`,
  description: (mission) => {
    const blocks = [`<p><b>Type de mission : </b>${mission.organizationName} vous propose une mission de bénévolat</p>`];
    if (mission.domain) {
      blocks.push(`<p><b>Domaine d'activité : </b>${getDomainLabel(mission.domain)}</p>`);
    }
    blocks.push("<p><b>Présentation de la mission</b></p>", descriptionBlock(mission));
    if (Array.isArray(mission.audience) && mission.audience.length > 0) {
      blocks.push(`<p><b>Public accompagné durant la mission : </b>${mission.audience.map((a) => getAudienceLabel(a)).join(" - ")}</p>`);
    }
    blocks.push(scheduleBlock(mission));
    if (typeof mission.openToMinors === "boolean") {
      blocks.push(`<p><b>Âge minimum : </b>${mission.openToMinors ? 16 : 18} ans minimum</p>`);
    }
    return blocks.filter(Boolean).join("\n");
  },
} satisfies Pick<DispositifDefinition, "jobType" | "page" | "title" | "description">;

export const jva: DispositifDefinition = {
  ...benevolat,
  id: "jva",
  label: "Bénévolat JeVeuxAider",
  scope: { publisherIds: [PUBLISHER_IDS.JEVEUXAIDER] },
  skipExpired: true,
};

export const annonceurs: DispositifDefinition = {
  ...benevolat,
  id: "benevolat-annonceurs",
  label: "Bénévolat autres annonceurs",
  scope: {
    publisherIds: [
      PUBLISHER_IDS.BENEVOLT,
      PUBLISHER_IDS.FONDATION_RAOUL_FOLLEREAU,
      PUBLISHER_IDS.VILLE_DE_NANTES,
      PUBLISHER_IDS.VACANCES_ET_FAMILLES,
      PUBLISHER_IDS.PREVENTION_ROUTIERE,
      PUBLISHER_IDS.MEDECINS_DU_MONDE,
      PUBLISHER_IDS.EGEE,
      PUBLISHER_IDS.ECTI,
      PUBLISHER_IDS.ADIE,
    ],
  },
  maxMissions: 50,
};
