import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, INVALID_PARAMS } from "../../error";
import { missionService } from "../../services/mission";
import { publisherService } from "../../services/publisher";
import { publisherDiffusionExclusionService } from "../../services/publisher-diffusion-exclusion";
import { statEventService } from "../../services/stat-event";
import { PublisherRequest } from "../../types/passport";
import type { PublisherRecord } from "../../types/publisher";
import { PublisherDiffusionExclusionCreateManyInput } from "../../types/publisher-diffusion-exclusion";
import { buildPublisherData } from "./transformer";
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

    const [publishers, organizationExclusions] = await Promise.all([
      publisherService.findPublishers({ diffuseurOf: user.id }),
      publisherDiffusionExclusionService.findExclusions({ excludedByAnnonceurId: user.id, organizationClientId: params.data.organizationClientId }),
    ]);

    // Build Set of exclusions to lookup clicks with .has() for better performance
    const exclusionSet = new Set(organizationExclusions.map((o) => o.excludedForDiffuseurId));

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

    const publishers = await publisherService.findPublishers({ diffuseurOf: user.id });

    if (!body.data.organizationName) {
      const mission = await missionService.findOneMissionBy({
        organizationClientId: params.data.organizationClientId,
      });
      if (mission) {
        body.data.organizationName = mission.organizationName;
      }
    }

    await publisherDiffusionExclusionService.deleteExclusionsByAnnonceurAndOrganization(user.id, params.data.organizationClientId);

    const bulk: Array<PublisherDiffusionExclusionCreateManyInput> = [];
    publishers
      .filter((publisher) => !body.data.publisherIds.includes(publisher.id))
      .forEach((publisher) => {
        bulk.push({
          excludedForDiffuseurId: publisher.id,
          excludedByAnnonceurId: user.id,
          organizationClientId: params.data.organizationClientId,
          organizationName: body.data.organizationName || null,
        });
      });

    await publisherDiffusionExclusionService.createManyExclusions(bulk);

    const newDiffusionExclusions = await publisherDiffusionExclusionService.findExclusions({
      excludedByAnnonceurId: user.id,
      organizationClientId: params.data.organizationClientId,
    });

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
