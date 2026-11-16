import { PUBLISHER_IDS } from "@/config";
import { organizationPage } from "@/jobs/linkedin/dispositifs/organization-page";
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
  page: organizationPage,
  title: (mission) => `Mission de bénévolat : ${mission.title.trim()}`,
  intro: (mission) => `<p>Mission proposée par ${mission.organizationName}</p>`,
};
