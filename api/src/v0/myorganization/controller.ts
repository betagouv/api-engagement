import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, INVALID_PARAMS, NOT_FOUND } from "@/error";
import { publisherService } from "@/services/publisher";
import { publisherDiffusionExclusionService } from "@/services/publisher-diffusion-exclusion";
import publisherOrganizationService from "@/services/publisher-organization";
import { statEventService } from "@/services/stat-event";
import { PublisherRequest } from "@/types/passport";
import type { PublisherRecord } from "@/types/publisher";
import { PublisherDiffusionExclusionCreateManyInput } from "@/types/publisher-diffusion-exclusion";
import { buildPublisherData } from "@/v0/myorganization/transformer";
const router = Router();

router.get("/:organizationClientId", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

    const params = zod
      .object({
        organizationClientId: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const [publishers, publisherOrganization] = await Promise.all([
      publisherService.findPublishers({ diffuseurOf: user.id }),
      publisherOrganizationService.findExclusions(params.data.organizationClientId, user.id),
    ]);

    if (!publisherOrganization) {
      res.locals = { code: NOT_FOUND, message: "Publisher organization not found" };
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher organization not found" });
    }

    // Build Set of exclusions to lookup clicks with .has() for better performance
    const exclusionSet = new Set(publisherOrganization.publisherDiffusionExclusions?.map((o) => o.excludedForDiffuseurId) ?? []);

    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const publisherIds = publishers.map((publisher) => publisher.id);
    const clicksByPublisher = await statEventService.countStatEventClicksByPublisherForOrganizationSince({
      publisherIds,
      organizationClientId: params.data.organizationClientId,
      from: oneMonthAgo,
    });

    // Build response data
    const data = [] as any[];
    publishers.forEach((publisher) => {
      const isExcluded = exclusionSet.has(publisher.id);
      const clicks = clicksByPublisher[publisher.id] || 0;

      data.push(buildPublisherData(publisher, clicks, isExcluded));
    });

    return res.status(200).send({
      ok: true,
      data,
      total: data.length,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:organizationClientId", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

    const params = zod
      .object({
        organizationClientId: zod.string(),
      })
      .safeParse(req.params);

    const body = zod
      .object({
        organizationName: zod.string().optional().nullable(),
        publisherIds: zod.array(zod.string()),
      })
      .safeParse(req.body);

    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!body.success) {
      res.locals = { code: INVALID_BODY, message: JSON.stringify(body.error) };
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: body.error });
    }

    const [publishers, publisherOrganization] = await Promise.all([
      publisherService.findPublishers({ diffuseurOf: user.id }),
      publisherOrganizationService.findUniqueOrCreate(params.data.organizationClientId, user.id, { name: body.data.organizationName }),
    ]);

    const bulk: Array<PublisherDiffusionExclusionCreateManyInput> = [];
    publishers
      .filter((publisher) => !body.data.publisherIds.includes(publisher.id))
      .forEach((publisher) => {
        bulk.push({
          excludedForDiffuseurId: publisher.id,
          excludedByAnnonceurId: user.id,
          publisherOrganizationId: publisherOrganization.id,
        });
      });

    const newDiffusionExclusions = await publisherDiffusionExclusionService.updateExclusionsForPublisherOrganization(publisherOrganization.id, user.id, bulk);

    const data = [] as any[];
    publishers.forEach((publisher) => {
      const isExcluded = newDiffusionExclusions.some((o) => o.excludedForDiffuseurId === publisher.id);
      data.push({
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
        excluded: isExcluded,
      });
    });

    return res.status(200).send({ ok: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
});

export default router;
