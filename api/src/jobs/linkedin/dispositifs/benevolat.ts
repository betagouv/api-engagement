import { PUBLISHER_IDS } from "@/config";
import { LINKEDIN_PAGES, LINKEDIN_PARTNER_PAGES } from "@/jobs/linkedin/config";
import { DispositifDefinition } from "@/jobs/linkedin/types";

// Bénévolat : même rendu pour JVA et les partenaires, seuls le périmètre et le plafond diffèrent.
const benevolat = {
  jobType: "VOLUNTEER",
  // Page de l'organisation si elle en a une sur LinkedIn, sinon page JVA.
  page: (mission) => {
    const organizationName = mission.organizationName as string;
    const companyId = LINKEDIN_PARTNER_PAGES[organizationName];
    return companyId ? { company: organizationName, companyId } : LINKEDIN_PAGES.JVA;
  },
  title: (mission) => `Mission de bénévolat : ${mission.title.trim()}`,
  intro: (mission) => `<p>Mission proposée par ${mission.organizationName}</p>`,
} satisfies Pick<DispositifDefinition, "jobType" | "page" | "title" | "intro">;

export const jva: DispositifDefinition = {
  ...benevolat,
  id: "jva",
  label: "Bénévolat JeVeuxAider",
  scope: { publisherIds: [PUBLISHER_IDS.JEVEUXAIDER] },
  skipExpired: true,
};

export const partners: DispositifDefinition = {
  ...benevolat,
  id: "benevolat-partners",
  label: "Bénévolat partenaires",
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
