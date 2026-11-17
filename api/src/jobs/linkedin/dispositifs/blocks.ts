import { sanitizeHtml } from "@/jobs/linkedin/utils";
import { MissionRecord } from "@/types/mission";

/** Description de la mission, nettoyée pour LinkedIn. */
export const descriptionBlock = (mission: MissionRecord) => sanitizeHtml(mission.descriptionHtml || mission.description);

export const scheduleBlock = (mission: MissionRecord) => (mission.schedule ? `<p><b>Durée de la mission : </b>${mission.schedule}</p>` : "");
