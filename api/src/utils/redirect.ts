import { JVA_URL, PUBLISHER_IDS } from "@/config";

import { statBotService } from "@/services/stat-bot";
import { statEventService } from "@/services/stat-event";

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
