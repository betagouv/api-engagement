import { Router } from "express";
import passport from "passport";

import { NOT_FOUND } from "../error";
import PublisherModel from "../models/publisher";
import StatsBotModel from "../models/stats-bot";
import WarningBotModel from "../models/warning-bot";
import statEventRepository from "../repositories/stat-event";

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

    const aggregations = await statEventRepository.aggregateWarningBotStatsByUser(warningBot.hash);

    const publisherIds = Array.from(
      new Set(
        [...aggregations.publisherTo, ...aggregations.publisherFrom]
          .map((bucket) => bucket.key)
          .filter((key): key is string => Boolean(key))
      )
    );

    const publishers = await PublisherModel.find({ _id: { $in: publisherIds } }).lean();

    const aggs = {
      type: aggregations.type.map((bucket) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
      })),
      publisherTo: aggregations.publisherTo.map((bucket) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
        name: publishers.find((p) => p._id.toString() === bucket.key)?.name,
      })),
      publisherFrom: aggregations.publisherFrom.map((bucket) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
        name: publishers.find((p) => p._id.toString() === bucket.key)?.name,
      })),
    };

    const statsBot = await StatsBotModel.findOne({ user: warningBot.hash });

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

    let statsBot = await StatsBotModel.findOne({ user: warningBot.hash });
    if (!statsBot) {
      statsBot = await StatsBotModel.create({
        user: warningBot.hash,
        userAgent: warningBot.userAgent,
      });
    }

    await statEventRepository.updateIsBotForUser(warningBot.hash, true);

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

    await StatsBotModel.deleteOne({ user: warningBot.hash });

    await statEventRepository.updateIsBotForUser(warningBot.hash, false);

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
