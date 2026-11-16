import { PUBLISHER_IDS } from "@/config";
import { LINKEDIN_PAGES, LINKEDIN_PARTNER_PAGES } from "@/jobs/linkedin/config";
import { DispositifDefinition } from "@/jobs/linkedin/types";

export const partner: DispositifDefinition = {
  id: "partner",
  label: "Partenaires",
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
  jobType: "VOLUNTEER",
  maxMissions: 50,
  // Page propre du partenaire si elle existe, sinon page JVA.
  page: (mission) => {
    const companyId = LINKEDIN_PARTNER_PAGES[mission.organizationName as string];
    return companyId ? { company: mission.organizationName as string, companyId } : LINKEDIN_PAGES.JVA;
  },
  title: (mission) => `Mission de bénévolat : ${mission.title.trim()}`,
  intro: (mission) => `<p>Mission proposée par ${mission.organizationName}</p>`,
};
