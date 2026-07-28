import jwt, { JwtPayload } from "jsonwebtoken";

import { JVA_URL, PUBLISHER_IDS, SECRET } from "@/config";

import { generateDemarcheNumeriqueDossierUrl } from "@/services/demarches-simplifiees/utils";
import { statBotService } from "@/services/stat-bot";
import { statEventService } from "@/services/stat-event";
import { MissionRecord, StatEventRecord } from "@/types";

const TRACKING_TOKEN_EXPIRATION = "30d";
const TRACKING_TOKEN_PURPOSE = "tracking";

type TrackingTokenPayload = JwtPayload & {
  clickId?: unknown;
  purpose?: unknown;
};

export const createTrackingToken = (clickId: string) =>
  jwt.sign({ clickId, purpose: TRACKING_TOKEN_PURPOSE }, SECRET, {
    algorithm: "HS256",
    expiresIn: TRACKING_TOKEN_EXPIRATION,
  });

export const isValidTrackingToken = (token: string, clickId: string) => {
  try {
    const payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] }) as TrackingTokenPayload;
    return payload.purpose === TRACKING_TOKEN_PURPOSE && payload.clickId === clickId;
  } catch {
    return false;
  }
};

const ensureUrlProtocol = (href: string) => {
  if (href.indexOf("http://") === 0 || href.indexOf("https://") === 0) {
    return href;
  }
  return `https://${href}`;
};

export const buildTrackedApplicationUrl = (
  href: string,
  missionPublisherId: string | null | undefined,
  clickId: string,
  tracking: {
    source: string;
    medium: string;
    campaign: string;
  }
) => {
  const url = new URL(ensureUrlProtocol(href || JVA_URL));
  const trackingPrefix = missionPublisherId === PUBLISHER_IDS.SERVICE_CIVIQUE ? "mtm" : "utm";

  url.searchParams.set("apiengagement_id", clickId);
  url.searchParams.set("apiengagement_tracking_token", createTrackingToken(clickId));
  url.searchParams.set(`${trackingPrefix}_source`, tracking.source);
  url.searchParams.set(`${trackingPrefix}_medium`, tracking.medium);
  url.searchParams.set(`${trackingPrefix}_campaign`, tracking.campaign);

  return url;
};

// Enregistre le clic et construit l'URL de redirection finale : préremplit l'éventuel dossier Démarches
// Simplifiées avec l'id du clic, puis ajoute les paramètres de tracking. Renvoie l'id du clic et l'URL.
export const createClickRedirect = async (
  event: StatEventRecord,
  mission: MissionRecord,
  fallbackHref: string,
  tracking: { source: string; medium: string; campaign: string }
): Promise<{ clickId: string; url: URL }> => {
  const clickId = await statEventService.createStatEvent(event);
  const demarcheUrl = await generateDemarcheNumeriqueDossierUrl(mission.applicationUrl, mission.publisherId, clickId);
  const url = buildTrackedApplicationUrl(demarcheUrl || fallbackHref, mission.publisherId, clickId, tracking);
  return { clickId, url };
};

export const updateBotFlagAfterRedirect = async (user: string, clickId: string) => {
  const statBot = await statBotService.findStatBotByUser(user);
  if (statBot) {
    await statEventService.updateStatEvent(clickId, { isBot: true });
  }
};
