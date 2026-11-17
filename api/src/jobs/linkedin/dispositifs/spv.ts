import { LINKEDIN_PAGES } from "@/jobs/linkedin/config";
import { descriptionBlock } from "@/jobs/linkedin/dispositifs/blocks";
import { DispositifDefinition } from "@/jobs/linkedin/types";
import { PublisherMissionType } from "@/types/publisher";

export const spv: DispositifDefinition = {
  id: "spv",
  label: "Sapeurs-Pompiers volontaires",
  scope: { missionType: PublisherMissionType.VOLONTARIAT_SAPEURS_POMPIERS },
  // LinkedIn n'accepte qu'un type d'emploi (la spec souhaitait CONTRACT + PART_TIME).
  jobType: "CONTRACT",
  page: () => LINKEDIN_PAGES.TTM,
  title: (_mission, address) => `Sapeur-Pompier volontaire ${address?.departmentName ? `${address.departmentName} ` : ""}- Secourisme, Assistance, protection de l'environnement…`,
  description: (mission) => `<p>Mission proposée par le ${mission.organizationName}</p>\n${descriptionBlock(mission)}`,
};
