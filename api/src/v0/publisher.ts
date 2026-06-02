import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_PARAMS, NOT_FOUND } from "@/error";
import { publisherRateLimiter } from "@/middlewares/rate-limit";
import { publisherService } from "@/services/publisher";
import { PublisherRequest } from "@/types/passport";
import type { PublisherRecord } from "@/types/publisher";

const router = Router();
router.use(passport.authenticate(["apikey", "api"], { session: false }));
router.use(publisherRateLimiter);

router.get("/", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;
    const partners = await publisherService.findPublishers({ diffuseurOf: user.id });

    const data = partners.map((partner) => ({
      _id: partner.id,
      name: partner.name,
      category: partner.category,
      url: partner.url,
      logo: partner.logo,
      description: partner.description,
      widget: partner.hasWidgetRights,
      api: partner.hasApiRights,
      campaign: partner.hasCampaignRights,
      annonceur: partner.isAnnonceur,
    }));

    res.locals = { total: data.length };
    return res.status(200).send({ ok: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;
    const params = zod.object({ id: zod.string() }).safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const publisher = await publisherService.findOnePublisherById(params.data.id);
    if (!publisher || !publisher.publishers.some((p) => p.diffuseurPublisherId === user.id)) {
      res.locals = { code: NOT_FOUND, message: "Publisher not found" };
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    const data = {
      _id: publisher.id,
      name: publisher.name,
      category: publisher.category,
      url: publisher.url,
      logo: publisher.logo,
      description: publisher.description,
      widget: publisher.hasWidgetRights,
      api: publisher.hasApiRights,
      campaign: publisher.hasCampaignRights,
      annonceur: publisher.isAnnonceur,
    };

    res.locals = { total: 1 };
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
