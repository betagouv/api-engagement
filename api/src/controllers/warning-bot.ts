import { Router } from "express";
import passport from "passport";

import { NOT_FOUND } from "../error";
import WarningBotModel from "../models/warning-bot";
import { statEventService } from "../services/stat-event";
import { publisherService } from "../services/publisher";
import { statsBotService } from "../services/stats-bot";

const router = Router();

router.post("/search", passport.authenticate("admin", { session: false }), async (req, res, next) => {
  try {
    const data = await WarningBotModel.find({}).sort({ createdAt: -1 }).lean();

    return res.status(200).send({ ok: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/stat", passport.authenticate("admin", { session: false }), async (req, res, next) => {
  try {
    const { id } = req.params;

    const warningBot = await WarningBotModel.findOne({ _id: id });
    if (!warningBot) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const aggregations = await statEventService.aggregateStatEventWarningBotByUser(warningBot.hash);

    const publisherIds = Array.from(new Set([...aggregations.publisherTo, ...aggregations.publisherFrom].map((bucket) => bucket.key).filter((key): key is string => Boolean(key))));

    const publishers = await publisherService.findPublishersByIds(publisherIds);
    const publisherMap = new Map(publishers.map((publisher) => [publisher.id, publisher.name]));

    const aggs = {
      type: aggregations.type.map((bucket) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
      })),
      publisherTo: aggregations.publisherTo.map((bucket) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
        name: publisherMap.get(bucket.key ?? ""),
      })),
      publisherFrom: aggregations.publisherFrom.map((bucket) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
        name: publisherMap.get(bucket.key ?? ""),
      })),
    };

    const statsBot = await statsBotService.findStatsBotByUser(warningBot.hash);

    return res.status(200).send({ ok: true, data: statsBot || null, aggs });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/block", passport.authenticate("admin", { session: false }), async (req, res, next) => {
  try {
    const { id } = req.params;

    const warningBot = await WarningBotModel.findOne({ _id: id });
    if (!warningBot) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    let statsBot = await statsBotService.findStatsBotByUser(warningBot.hash);
    if (!statsBot) {
      statsBot = await statsBotService.createStatsBot({
        user: warningBot.hash,
        userAgent: warningBot.userAgent,
      });
    }

    await statEventService.updateStatEventsBotFlagForUser(warningBot.hash, true);

    return res.status(200).send({ ok: true, data: statsBot });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/unblock", passport.authenticate("admin", { session: false }), async (req, res, next) => {
  try {
    const { id } = req.params;

    const warningBot = await WarningBotModel.findOne({ _id: id });
    if (!warningBot) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    await statsBotService.deleteStatsBotByUser(warningBot.hash);

    await statEventService.updateStatEventsBotFlagForUser(warningBot.hash, false);

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
