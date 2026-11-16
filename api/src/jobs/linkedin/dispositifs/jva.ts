import { PUBLISHER_IDS } from "@/config";
import { LINKEDIN_PAGES } from "@/jobs/linkedin/config";
import { DispositifDefinition } from "@/jobs/linkedin/types";

export const jva: DispositifDefinition = {
  id: "jva",
  label: "JeVeuxAider",
  scope: { publisherIds: [PUBLISHER_IDS.JEVEUXAIDER] },
  jobType: "VOLUNTEER",
  skipExpired: true,
  page: () => LINKEDIN_PAGES.JVA,
  title: (mission) => `Mission de bénévolat : ${mission.title.trim()}`,
  intro: (mission) => `<p>Mission proposée par ${mission.organizationName}</p>`,
};
