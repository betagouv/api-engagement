import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { PUBLISHER_IDS } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "../error";
import { campaignService } from "../services/campaign";
import { publisherService } from "../services/publisher";
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

    // Build search params with access control
    const searchParams: any = {
      active: body.data.active,
      offset: body.data.from,
      limit: body.data.size,
      includeTotal: "filtered",
    };

    if (body.data.fromPublisherId) {
      if (req.user.role !== "admin" && !req.user.publishers.includes(body.data.fromPublisherId)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN });
      } else {
        searchParams.fromPublisherId = body.data.fromPublisherId;
      }
    } else if (req.user.role !== "admin") {
      // For non-admin users, filter by their publishers
      // Note: This requires multiple queries or a different approach since we can't use $in directly
      // For now, we'll handle this in the service layer if needed
    }

    if (body.data.toPublisherId) {
      searchParams.toPublisherId = body.data.toPublisherId;
    }

    if (body.data.search) {
      searchParams.search = body.data.search;
    }

    // If user is not admin and no specific fromPublisherId, pass their publisher IDs
    const fromPublisherIds = req.user.role !== "admin" && !body.data.fromPublisherId ? req.user.publishers : undefined;

    const { results, total } = await campaignService.findCampaigns(searchParams, fromPublisherIds);
    return res.status(200).send({ ok: true, data: results, total });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const data = await campaignService.findCampaignById(params.data.id);
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

    const fromPublisher = await publisherService.findOnePublisherById(body.data.fromPublisherId);
    if (!fromPublisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Publisher not found" });
    }

    const toPublisher = await publisherService.findOnePublisherById(body.data.toPublisherId);
    if (!toPublisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Publisher not found" });
    }

    let trackers = body.data.trackers || [];
    let url = body.data.url;

    if (!trackers.length) {
      if (toPublisher.id === PUBLISHER_IDS.SERVICE_CIVIQUE) {
        trackers = [
          { key: "mtm_source", value: "api_engagement" },
          { key: "mtm_medium", value: "campaign" },
          { key: "mtm_campaign", value: slugify(body.data.name) },
        ];
      } else {
        trackers = [
          { key: "utm_source", value: "api_engagement" },
          { key: "utm_medium", value: "campaign" },
          { key: "utm_campaign", value: slugify(body.data.name) },
        ];
      }
      const searchParams = new URLSearchParams();
      trackers.forEach((tracker: { key: string; value: string }) => searchParams.append(tracker.key, tracker.value));
      url = `${url}${url.includes("?") ? "&" : "?"}${searchParams.toString()}`;
    }

    if (url) {
      if (url.indexOf("http") === -1) {
        url = `https://${url}`;
      }
      if (!isValidUrl(url)) {
        return res.status(400).send({ ok: false, code: INVALID_BODY, error: "Invalid url" });
      }
    }

    try {
      const data = await campaignService.createCampaign({
        name: body.data.name,
        type: body.data.type,
        url,
        fromPublisherId: fromPublisher.id,
        toPublisherId: toPublisher.id,
        trackers: trackers.map((t) => ({ key: t.key, value: t.value })),
      });
      return res.status(200).send({ ok: true, data });
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, error: "Campaign already exists" });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.post("/:id/duplicate", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    try {
      const data = await campaignService.duplicateCampaign(params.data.id);
      return res.status(200).send({ ok: true, data });
    } catch (error: any) {
      if (error.message === "Campaign not found") {
        return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Campaign not found" });
      }
      if (error.message?.includes("already exists")) {
        return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, error: "Campaign already exists" });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.put("/:id", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
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

    const existing = await campaignService.findCampaignById(params.data.id);
    if (!existing) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Campaign not found" });
    }

    const updatePatch: any = {};

    if (body.data.name !== undefined) {
      updatePatch.name = body.data.name;
    }
    if (body.data.type !== undefined) {
      updatePatch.type = body.data.type;
    }
    if (body.data.active !== undefined) {
      updatePatch.active = body.data.active;
    }

    let trackers = body.data.trackers;
    let url = body.data.url;

    // Handle trackers logic
    if (trackers && trackers.length) {
      updatePatch.trackers = trackers.map((t) => ({ key: t.key, value: t.value }));
    } else if (trackers !== undefined && trackers.length === 0) {
      // Empty array means remove trackers and regenerate
      const toPublisherId = body.data.toPublisherId || existing.toPublisherId;
      const toPublisher = await publisherService.findOnePublisherById(toPublisherId);
      if (!toPublisher) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Publisher not found" });
      }

      if (toPublisher.id === PUBLISHER_IDS.SERVICE_CIVIQUE) {
        trackers = [
          { key: "mtm_source", value: "api_engagement" },
          { key: "mtm_medium", value: "campaign" },
          { key: "mtm_campaign", value: slugify(body.data.name || existing.name) },
        ];
      } else {
        trackers = [
          { key: "utm_source", value: "api_engagement" },
          { key: "utm_medium", value: "campaign" },
          { key: "utm_campaign", value: slugify(body.data.name || existing.name) },
        ];
      }
      updatePatch.trackers = trackers.map((t) => ({ key: t.key, value: t.value }));

      const searchParams = new URLSearchParams();
      trackers.forEach((tracker) => searchParams.append(tracker.key, tracker.value));
      const baseUrl = url || existing.url;
      url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${searchParams.toString()}`;
    }

    if (url !== undefined) {
      if (url.indexOf("http") === -1) {
        url = `https://${url}`;
      }
      if (!isValidUrl(url)) {
        return res.status(400).send({ ok: false, code: INVALID_BODY, error: "Invalid url" });
      }
      updatePatch.url = url;
    }

    if (body.data.toPublisherId && body.data.toPublisherId !== existing.toPublisherId) {
      const prevToPublisher = await publisherService.findOnePublisherById(existing.toPublisherId);
      const newToPublisher = await publisherService.findOnePublisherById(body.data.toPublisherId);
      if (!prevToPublisher) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Previous publisher not found" });
      }
      if (!newToPublisher) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, error: "New publisher not found" });
      }

      updatePatch.toPublisherId = newToPublisher.id;

      await reassignStats({ sourceId: existing.id }, { toPublisherId: newToPublisher.id });
    }

    try {
      const data = await campaignService.updateCampaign(params.data.id, updatePatch);
      return res.status(200).send({ ok: true, data });
    } catch (error: any) {
      if (error.message === "Campaign not found") {
        return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Campaign not found" });
      }
      if (error.message?.includes("already exists")) {
        return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, error: "Campaign already exists" });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.put("/:id/reassign", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
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

    const existing = await campaignService.findCampaignById(params.data.id);
    if (!existing) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Campaign not found" });
    }

    if (existing.fromPublisherId === body.data.fromPublisherId) {
      return res.status(400).send({
        ok: false,
        code: INVALID_BODY,
        error: "Campaign is already assigned to this publisher",
      });
    }

    const prevFromPublisher = await publisherService.findOnePublisherById(existing.fromPublisherId);
    const newFromPublisher = await publisherService.findOnePublisherById(body.data.fromPublisherId);
    if (!prevFromPublisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "Previous publisher not found" });
    }
    if (!newFromPublisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, error: "New publisher not found" });
    }

    const reassignedByUsername = req.user.firstname + " " + req.user.lastname;
    const reassignedByUserId = req.user._id?.toString() || "";

    const data = await campaignService.reassignCampaign(params.data.id, body.data.fromPublisherId, reassignedByUsername, reassignedByUserId);

    await reassignStats(
      {
        sourceId: existing.id,
        fromPublisherId: prevFromPublisher.id,
      },
      {
        fromPublisherId: newFromPublisher.id,
      }
    );

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    try {
      await campaignService.softDeleteCampaign(params.data.id);
      return res.status(200).send({ ok: true });
    } catch (error: any) {
      if (error.message === "Campaign not found") {
        return res.status(200).send({ ok: true });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

export default router;
