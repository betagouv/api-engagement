import { SLACK_WARNING_CHANNEL_ID } from "../../config";
import { statEventService } from "../../services/stat-event";
import { publisherService } from "../../services/publisher";
import { postMessage } from "../../services/slack";
import { warningBotService } from "../../services/warning-bot";
import type { WarningBotRecord } from "../../types/warning-bot";

const countClick = (user: string) => statEventService.countStatEventsByCriteria({ type: "click", user });

const countApply = (user: string) => statEventService.countStatEventsByCriteria({ type: "apply", clickUser: user });

const countAccount = (user: string) => statEventService.countStatEventsByCriteria({ type: "account", clickUser: user });

export const checkBotClicks = async () => {
  console.log(`Checking bot from stats`);

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const candidates = await statEventService.findStatEventWarningBotCandidatesSince({
    from: oneDayAgo,
    minClicks: 200,
  });

  const suspiciousUsers = [] as typeof candidates;

  for (const candidate of candidates) {
    const applies = await countApply(candidate.user);
    const accounts = await countAccount(candidate.user);
    const publishers = candidate.publishers;

    // Suspicious if: many clicks, no applies, and all clicks from same publisher
    if (candidate.clickCount >= 200 && applies === 0 && accounts === 0 && publishers.length === 1) {
      suspiciousUsers.push(candidate);
    }
  }

  if (suspiciousUsers.length > 0) {
    const newWarnings: WarningBotRecord[] = [];
    for (const candidate of suspiciousUsers) {
      const publisherBucket = candidate.publishers[0];
      const userAgentBucket = candidate.userAgents[0];
      const exists = await warningBotService.findWarningBotByHash(candidate.user);
      if (!exists) {
        if (!publisherBucket?.key) {
          continue;
        }
        const publisher = await publisherService.findOnePublisherByName(publisherBucket.key);
        if (!publisher) {
          continue;
        }
        const newWarning = await warningBotService.createWarningBot({
          hash: candidate.user,
          userAgent: userAgentBucket?.key ?? "",
          clickCount: candidate.clickCount,
          publisherId: publisher.id,
        });
        newWarnings.push(newWarning);
      } else {
        await warningBotService.updateWarningBot(exists.id, {
          clickCount: await countClick(candidate.user),
        });
      }
    }

    if (newWarnings.length > 0) {
      const message = `*Potentiel bot activity detecté*\n\n${newWarnings
        .map((warning: WarningBotRecord) => {
          return `• User \`${warning.hash}\` a fait ${warning.clickCount} clicks avec 0 candidatures en 24h (tous depuis le publisher \`${warning.publisherName}\`)\n\t- User Agent: \`${warning.userAgent}\``;
        })
        .join("\n")}`;

      await postMessage({ text: message }, SLACK_WARNING_CHANNEL_ID);
    }
  }
};
