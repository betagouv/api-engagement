import { SLACK_WARNING_CHANNEL_ID } from "../../config";
import { postMessage } from "../../services/slack";
import { statEventService } from "../../services/stat-event";
import { warningService } from "../../services/warning";
import type { PublisherRecord } from "../../types/publisher";

const TRACKING_WARNING = "TRACKING_WARNING";

const getStats = async (publisherId: string) => {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const aggs = await statEventService.countStatEventsByTypeSince({
    publisherId,
    from: twoWeeksAgo,
    types: ["click", "apply"],
  });
  return {
    click: aggs.click ?? 0,
    apply: aggs.apply ?? 0,
  };
};

export const checkTracking = async (publishers: PublisherRecord[]) => {
  console.log(`Checking stats from ${publishers.filter((p) => p.isAnnonceur).length} publishers`);

  for (const publisher of publishers.filter((p) => p.isAnnonceur)) {
    const stats = await getStats(publisher.id);
    if (!stats) {
      continue;
    }
    console.log(`[${publisher.name}] ${stats.click} clicks and ${stats.apply} applies`);

    const statsWarning = await warningService.findOneWarning({
      publisherId: publisher.id,
      type: TRACKING_WARNING,
      fixed: false,
    });
    if (stats.apply === 0 && stats.click >= 70) {
      console.log(`[${publisher.name}] No application but more than 70 redirections`);
      if (statsWarning) {
        await warningService.updateWarning(statsWarning.id, {
          title: `Aucune candidature n’a été détectée, alors que ${stats.click} redirections ont été réalisées.`,
          occurrences: statsWarning.occurrences + 1,
        });
        continue;
      } else {
        await warningService.createWarning({
          type: TRACKING_WARNING,
          title: `Aucune candidature n’a été détectée, alors que ${stats.click} redirections ont été réalisées.`,
          publisherId: publisher.id,
        });
        const res = await postMessage({ text: `Alerte détectée: ${publisher.name} - Problème de tracking` }, SLACK_WARNING_CHANNEL_ID);
        if (res.error) {
          console.error(res.error);
        } else {
          console.log("Slack message sent");
        }
        continue;
      }
    } else {
      console.log(`[${publisher.name}] No problem with tracking`);
      if (statsWarning) {
        await warningService.updateWarning(statsWarning.id, {
          fixed: true,
          fixedAt: new Date(),
        });
      }
    }
  }
};
