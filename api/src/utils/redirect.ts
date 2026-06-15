import { JVA_URL, PUBLISHER_IDS } from "@/config";

import demarchesSimplifiees, { DEMARCHE_MAP } from "@/services/demarches-simplifiees";
import { statBotService } from "@/services/stat-bot";
import { statEventService } from "@/services/stat-event";

const DEMARCHE_NUMERIQUE_HOST = "demarche.numerique.gouv.fr";

// Si l'URL de candidature pointe vers demarche.numerique.gouv.fr, on crée un dossier prérempli côté
// Démarches Simplifiées. On renvoie son numéro (à stocker dans customAttributes) et son URL (cible de
// redirection à la place de l'applicationUrl générique). Le numéro de démarche est résolu depuis le
// slug de l'URL : d'abord via DEMARCHE_MAP, sinon via l'API (getDemarcheNumberBySlug).
export const createDemarcheNumeriqueDossier = async (applicationUrl: string | null | undefined): Promise<{ number: number; url: string } | null> => {
  if (!applicationUrl) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(applicationUrl);
  } catch (error) {
    return null;
  }
  if (parsedUrl.hostname !== DEMARCHE_NUMERIQUE_HOST) {
    return null;
  }

  const slug = parsedUrl.pathname.match(/\/commencer\/([^/?#]+)/)?.[1];
  if (!slug) {
    return null;
  }

  let demarcheNumber = DEMARCHE_MAP[slug];
  if (!demarcheNumber) {
    const found = await demarchesSimplifiees.getDemarcheNumberBySlug(slug);
    if (!found.ok) {
      return null;
    }
    demarcheNumber = found.data;
  }

  const result = await demarchesSimplifiees.createDossier(demarcheNumber);
  if (!result.ok) {
    return null;
  }

  const number = result.data?.dossier_number ?? null;
  const url = result.data?.dossier_url ?? null;
  if (!number || !url) {
    return null;
  }
  return { number, url };
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
  url.searchParams.set(`${trackingPrefix}_source`, tracking.source);
  url.searchParams.set(`${trackingPrefix}_medium`, tracking.medium);
  url.searchParams.set(`${trackingPrefix}_campaign`, tracking.campaign);

  return url;
};

export const updateBotFlagAfterRedirect = async (user: string, clickId: string) => {
  const statBot = await statBotService.findStatBotByUser(user);
  if (statBot) {
    await statEventService.updateStatEvent(clickId, { isBot: true });
  }
};
