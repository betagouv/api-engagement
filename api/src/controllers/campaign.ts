import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "../error";
import CampaignModel from "../models/campaign";
import PublisherModel from "../models/publisher";
import { reassignStats } from "../services/reassign-stats";
import { UserRequest } from "../types/passport";
import { slugify } from "../utils";

const router = Router();

router.post("/search", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        fromPublisherId: zod.string().optional(),
        toPublisherId: zod.string().optional(),
        search: zod.string().optional(),
        active: zod.boolean().default(true),
        from: zod.number().optional(),
        size: zod.number().optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: body.error });
    }

    const where = { deletedAt: null, active: body.data.active } as { [key: string]: any };

    if (body.data.fromPublisherId) {
      if (req.user.role !== "admin" && !req.user.publishers.includes(body.data.fromPublisherId)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN });
      } else {
        where.fromPublisherId = body.data.fromPublisherId;
      }
    } else if (req.user.role !== "admin") {
      where.fromPublisherId = { $in: req.user.publishers };
    }

    if (body.data.toPublisherId) {
      where.toPublisherId = body.data.toPublisherId;
    }

    if (body.data.search) {
      where.$or = [{ name: new RegExp(body.data.search, "i") }];
    }

    const data = await CampaignModel.find(where).sort({ createdAt: -1 }).lean();
    const total = await CampaignModel.countDocuments(where);
    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const data = await CampaignModel.findById(params.data.id);
    if (!data) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

router.post("/", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        name: zod.string(),
        type: zod.enum(["banniere/publicité", "mailing", "tuile/bouton", "autre"]),
        url: zod.string(),
        fromPublisherId: zod.string(),
        toPublisherId: zod.string(),
        trackers: zod.array(zod.object({ key: zod.string(), value: zod.string(), _id: zod.string().optional() })).optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const fromPublisher = await PublisherModel.findById(body.data.fromPublisherId);
    if (!fromPublisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Publisher not found" });
    }

    const toPublisher = await PublisherModel.findById(body.data.toPublisherId);
    if (!toPublisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Publisher not found" });
    }

    if (!body.data.trackers || !body.data.trackers.length) {
      if (toPublisher._id.toString() === PUBLISHER_IDS.SERVICE_CIVIQUE) {
        body.data.trackers = [
          { key: "mtm_source", value: "api_engagement" },
          { key: "mtm_medium", value: "campaign" },
          { key: "mtm_campaign", value: slugify(body.data.name) },
        ];
      } else {
        body.data.trackers = [
          { key: "utm_source", value: "api_engagement" },
          { key: "utm_medium", value: "campaign" },
          { key: "utm_campaign", value: slugify(body.data.name) },
        ];
      }
      const searchParams = new URLSearchParams();
      body.data.trackers.forEach((tracker: { key: string; value: string }) => searchParams.append(tracker.key, tracker.value));
      body.data.url = `${body.data.url}${body.data.url.includes("?") ? "&" : "?"}${searchParams.toString()}`;
    }
    if (body.data.url) {
      if (body.data.url.indexOf("http") === -1) {
        body.data.url = `https://${body.data.url}`;
      }
      if (!isValidUrl(body.data.url)) {
        return res.status(400).send({ ok: false, code: INVALID_BODY, error: "Invalid url" });
      } else {
        body.data.url = body.data.url;
      }
    }

    const newCampaign = {
      name: body.data.name,
      type: body.data.type,
      fromPublisherId: fromPublisher._id.toString(),
      fromPublisherName: fromPublisher.name,
      toPublisherId: toPublisher._id.toString(),
      toPublisherName: toPublisher.name,
      trackers: body.data.trackers,
      url: body.data.url,
      deleted: false,
    };

    const data = await CampaignModel.create(newCampaign);
    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, error: "Campaign already exists" });
    }
    next(error);
  }
});

router.post("/:id/duplicate", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const campaign = await CampaignModel.findById(params.data.id);
    if (!campaign) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Campaign not found" });
    }

    const newCampaign = {
      name: `${campaign.name} copie`,
      type: campaign.type,
      fromPublisherId: campaign.fromPublisherId,
      fromPublisherName: campaign.fromPublisherName,
      toPublisherId: campaign.toPublisherId,
      toPublisherName: campaign.toPublisherName,
      trackers: campaign.trackers,
      url: campaign.url,
      deleted: false,
    };

    const data = await CampaignModel.create(newCampaign);
    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, error: "Campaign already exists" });
    }
    next(error);
  }
});

router.put("/:id", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .safeParse(req.params);

    const body = zod
      .object({
        name: zod.string().optional(),
        type: zod.enum(["banniere/publicité", "mailing", "tuile/bouton", "autre"]).optional(),
        url: zod.string().optional(),
        active: zod.boolean().default(true),
        toPublisherId: zod.string().optional(),
        trackers: zod.array(zod.object({ key: zod.string(), value: zod.string(), _id: zod.string().optional() })).optional(),
      })
      .safeParse(req.body);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const campaign = await CampaignModel.findById(params.data.id);
    if (!campaign) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Campaign not found" });
    }

    if (body.data.name) {
      campaign.name = req.body.name;
    }
    if (body.data.type) {
      campaign.type = req.body.type;
    }
    if (body.data.trackers && body.data.trackers.length) {
      campaign.trackers = body.data.trackers;
    } else {
      if (campaign.toPublisherId === PUBLISHER_IDS.SERVICE_CIVIQUE) {
        campaign.trackers = [
          { key: "mtm_source", value: "api_engagement" },
          { key: "mtm_medium", value: "campaign" },
          { key: "mtm_campaign", value: slugify(campaign.name) },
        ];
      } else {
        campaign.trackers = [
          { key: "utm_source", value: "api_engagement" },
          { key: "utm_medium", value: "campaign" },
          { key: "utm_campaign", value: slugify(campaign.name) },
        ];
      }
      const searchParams = new URLSearchParams();
      campaign.trackers.forEach((tracker) => searchParams.append(tracker.key, tracker.value));
      if (body.data.url) {
        body.data.url = `${body.data.url}${body.data.url.includes("?") ? "&" : "?"}${searchParams.toString()}`;
      } else {
        campaign.url = `${campaign.url}${campaign.url.includes("?") ? "&" : "?"}${searchParams.toString()}`;
      }
    }
    if (body.data.url) {
      if (body.data.url.indexOf("http") === -1) {
        body.data.url = `https://${body.data.url}`;
      }
      if (!isValidUrl(body.data.url)) {
        return res.status(400).send({ ok: false, code: INVALID_BODY, error: "Invalid url" });
      } else {
        campaign.url = body.data.url;
      }
    }
    if (body.data.active !== undefined) {
      campaign.active = body.data.active;
    }

    if (body.data.toPublisherId && body.data.toPublisherId !== campaign.toPublisherId) {
      const prevToPublisher = await PublisherModel.findById(campaign.toPublisherId);
      const newToPublisher = await PublisherModel.findById(body.data.toPublisherId);
      if (!prevToPublisher) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Previous publisher not found" });
      }
      if (!newToPublisher) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, error: "New publisher not found" });
      }

      const update = {
        toPublisherId: newToPublisher._id.toString(),
        toPublisherName: newToPublisher.name,
      };

      await reassignStats({ sourceId: campaign._id.toString() }, update);

      campaign.toPublisherId = newToPublisher._id.toString();
      campaign.toPublisherName = newToPublisher.name;
    }

    await campaign.save();
    return res.status(200).send({ ok: true, data: campaign });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, error: "Campaign already exists" });
    }
    next(error);
  }
});

router.put("/:id/reassign", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .required()
      .safeParse(req.params);

    const body = zod
      .object({
        fromPublisherId: zod.string(),
      })
      .required()
      .safeParse(req.body);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const campaign = await CampaignModel.findById(params.data.id);
    if (!campaign) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Campaign not found" });
    }

    if (campaign.fromPublisherId === body.data.fromPublisherId) {
      return res.status(400).send({
        ok: false,
        code: INVALID_BODY,
        error: "Campaign is already assigned to this publisher",
      });
    }

    const prevFromPublisher = await PublisherModel.findById(campaign.fromPublisherId);
    const newFromPublisher = await PublisherModel.findById(body.data.fromPublisherId);
    if (!prevFromPublisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Previous publisher not found" });
    }
    if (!newFromPublisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "New publisher not found" });
    }

    campaign.fromPublisherId = newFromPublisher._id.toString();
    campaign.fromPublisherName = newFromPublisher.name;
    campaign.reassignedAt = new Date();
    campaign.reassignedByUsername = req.user.firstname + " " + req.user.lastname;
    campaign.reassignedByUserId = req.user._id.toString();
    await campaign.save();

    const update = {
      fromPublisherId: newFromPublisher._id.toString(),
      fromPublisherName: newFromPublisher.name,
    };
    await reassignStats(
      {
        sourceId: campaign._id.toString(),
        fromPublisherId: prevFromPublisher._id.toString(),
      },
      update,
    );

    return res.status(200).send({ ok: true, data: campaign });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const campaign = await CampaignModel.findById(params.data.id);
    if (!campaign) {
      return res.status(200).send({ ok: true });
    }

    campaign.active = false;
    campaign.deletedAt = new Date();
    await campaign.save();

    return res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
