import { SLACK_WARNING_CHANNEL_ID } from "../../config";
import WarningModel from "../../models/warning";
import statEventRepository from "../../repositories/stat-event";
import { postMessage } from "../../services/slack";
import { Publisher } from "../../types";

const TRACKING_WARNING = "TRACKING_WARNING";

const getStats = async (publisherId: string) => {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const aggs = await statEventRepository.countByTypeSince({
    publisherId,
    from: twoWeeksAgo,
    types: ["click", "apply"],
  });
  return {
    click: aggs.click ?? 0,
    apply: aggs.apply ?? 0,
  };
};

export const checkTracking = async (publishers: Publisher[]) => {
  console.log(`Checking stats from ${publishers.filter((p) => p.isAnnonceur).length} publishers`);

  for (const publisher of publishers.filter((p) => p.isAnnonceur)) {
    const stats = await getStats(publisher._id.toString());
    if (!stats) {
      continue;
    }
    console.log(`[${publisher.name}] ${stats.click} clicks and ${stats.apply} applies`);

    const statsWarning = await WarningModel.findOne({ publisherId: publisher._id.toString(), type: TRACKING_WARNING, fixed: false }, null, { sort: { createdAt: -1 } });
    if (stats.apply === 0 && stats.click >= 70) {
      console.log(`[${publisher.name}] No application but more than 70 redirections`);
      if (statsWarning) {
        statsWarning.title = `Aucune candidature n’a été détectée, alors que ${stats.click} redirections ont été réalisées.`;
        statsWarning.occurrences += 1;
        await statsWarning.save();
        continue;
      } else {
        const obj = {
          type: TRACKING_WARNING,
          title: `Aucune candidature n’a été détectée, alors que ${stats.click} redirections ont été réalisées.`,
          publisherId: publisher._id.toString(),
          publisherName: publisher.name,
          publisherLogo: publisher.logo,
        };
        await WarningModel.create(obj);
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
        statsWarning.fixed = true;
        statsWarning.fixedAt = new Date();
        await statsWarning.save();
      }
    }
  }
};
