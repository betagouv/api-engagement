import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "@/error";
import { campaignService, InvalidUrlError } from "@/services/campaign";
import { CampaignCreateInput, CampaignSearchParams, CampaignUpdatePatch } from "@/types/campaign";
import { UserRequest } from "@/types/passport";

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
    const searchParams: CampaignSearchParams = {
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

router.post("/", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        name: zod.string(),
        type: zod.enum(["AD_BANNER", "MAILING", "TILE_BUTTON", "OTHER"]),
        url: zod.string(),
        urlSource: zod.string().optional(),
        fromPublisherId: zod.string(),
        toPublisherId: zod.string(),
        trackers: zod.array(zod.object({ key: zod.string(), value: zod.string(), _id: zod.string().optional() })).optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const payload: CampaignCreateInput = {
      name: body.data.name,
      type: body.data.type,
      url: body.data.url,
      urlSource: body.data.urlSource || null,
      fromPublisherId: body.data.fromPublisherId,
      toPublisherId: body.data.toPublisherId,
      trackers: body.data.trackers || [],
    };

    const data = await campaignService.createCampaign(payload);
    return res.status(200).send({ ok: true, data: data });
  } catch (error: any) {
    if (error.name === "CampaignAlreadyExistsError") {
      return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, error: error.message });
    }
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
        type: zod.enum(["AD_BANNER", "MAILING", "TILE_BUTTON", "OTHER"]).optional(),
        url: zod.string().optional(),
        urlSource: zod.string().optional(),
        active: zod.boolean().default(true),
        toPublisherId: zod.string().optional(),
        trackers: zod.array(zod.object({ key: zod.string(), value: zod.string() })).optional(),
      })
      .safeParse(req.body);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const payload: CampaignUpdatePatch = {};

    if (body.data.name !== undefined) {
      payload.name = body.data.name;
    }
    if (body.data.type !== undefined) {
      payload.type = body.data.type;
    }
    if (body.data.urlSource !== undefined) {
      payload.urlSource = body.data.urlSource || null;
    }
    if (body.data.active !== undefined) {
      payload.active = body.data.active;
    }
    if (body.data.toPublisherId !== undefined) {
      payload.toPublisherId = body.data.toPublisherId;
    }
    if (body.data.trackers !== undefined) {
      payload.trackers = body.data.trackers.map((t) => ({ key: t.key, value: t.value }));
    }
    if (body.data.url !== undefined) {
      payload.url = body.data.url;
    }

    try {
      const data = await campaignService.updateCampaign(params.data.id, payload);
      return res.status(200).send({ ok: true, data });
    } catch (error: unknown) {
      if (error instanceof InvalidUrlError) {
        return res.status(400).send({ ok: false, code: INVALID_BODY, error: "Invalid url" });
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

    const data = await campaignService.updateCampaign(params.data.id, { fromPublisherId: body.data.fromPublisherId });

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
