import { Router } from "express";
import passport from "passport";

import { STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { NOT_FOUND } from "../error";
import PublisherModel from "../models/publisher";
import StatsBotModel from "../models/stats-bot";
import WarningBotModel from "../models/warning-bot";

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

    const response = await esClient.search({
      index: STATS_INDEX,
      body: {
        query: {
          term: { user: warningBot.hash },
        },
        size: 0,
        aggs: {
          type: { terms: { field: "type.keyword" } },
          publisherTo: { terms: { field: "toPublisherId.keyword" } },
          publisherFrom: { terms: { field: "fromPublisherId.keyword" } },
        },
      },
    });

    const publishers = await PublisherModel.find({ _id: { $in: response.body.aggregations.publisherTo.buckets.map((b: { [key: string]: any }) => b.key) } }).lean();

    const aggs = {
      type: response.body.aggregations.type.buckets.map((b: { [key: string]: any }) => ({
        key: b.key,
        doc_count: b.doc_count,
      })),
      publisherTo: response.body.aggregations.publisherTo.buckets.map((b: { [key: string]: any }) => ({
        key: b.key,
        doc_count: b.doc_count,
        name: publishers.find((p) => p._id.toString() === b.key)?.name,
      })),
      publisherFrom: response.body.aggregations.publisherFrom.buckets.map((b: { [key: string]: any }) => ({
        key: b.key,
        doc_count: b.doc_count,
        name: publishers.find((p) => p._id.toString() === b.key)?.name,
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

    await esClient.updateByQuery({
      index: STATS_INDEX,
      body: {
        query: { term: { user: warningBot.hash } },
        script: {
          lang: "painless",
          source: "ctx._source.isBot = true;",
        },
      },
    });

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

    await esClient.updateByQuery({
      index: STATS_INDEX,
      body: {
        query: { term: { user: warningBot.hash } },

        script: {
          lang: "painless",
          source: "ctx._source.isBot = false;",
        },
      },
    });

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
