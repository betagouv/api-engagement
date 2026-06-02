import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY, INVALID_PARAMS, NOT_FOUND } from "@/error";
import { publisherRateLimiter } from "@/middlewares/rate-limit";
import { publisherService } from "@/services/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import publisherOrganizationService from "@/services/publisher-organization";
import { statEventService } from "@/services/stat-event";
import { PublisherRequest } from "@/types/passport";
import type { PublisherRecord } from "@/types/publisher";
import { buildPublisherData } from "@/v0/myorganization/transformer";

const router = Router();
router.use(passport.authenticate(["apikey", "api"], { session: false }));
router.use(publisherRateLimiter);

const EXCLUSION_RULE_FIELD = "publisherOrganization.clientId";

const collectExclusions = async (annonceurPublisherId: string, organizationClientId: string): Promise<Set<string>> => {
  const roots = await publisherDiffusionRuleService.findRules({
    combinedWithId: null,
    field: "publisherId",
    value: annonceurPublisherId,
    includeCombinedRules: true,
  });

  const excludedDiffuseurIds = new Set<string>();
  roots.forEach((root) => {
    const matches = (root.combinedRules ?? []).some((child) => child.field === EXCLUSION_RULE_FIELD && child.value === organizationClientId);
    if (matches) {
      excludedDiffuseurIds.add(root.publisherId);
    }
  });
  return excludedDiffuseurIds;
};

router.get("/:organizationClientId", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

    const params = zod.object({ organizationClientId: zod.string() }).safeParse(req.params);
    if (!params.success) {
      res.locals = { code: INVALID_PARAMS, message: JSON.stringify(params.error) };
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const [publishers, publisherOrganization] = await Promise.all([
      publisherService.findPublishers({ diffuseurOf: user.id }),
      publisherOrganizationService.findOneByClientIdAndPublisher(params.data.organizationClientId, user.id),
    ]);

    if (!publisherOrganization) {
      res.locals = { code: NOT_FOUND, message: "Publisher organization not found" };
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher organization not found" });
    }

    const excludedDiffuseurIds = await collectExclusions(user.id, params.data.organizationClientId);

    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const publisherIds = publishers.map((publisher) => publisher.id);
    const clicksByPublisher = await statEventService.countStatEventClicksByPublisherForOrganizationSince({
      publisherIds,
      organizationClientId: params.data.organizationClientId,
      from: oneMonthAgo,
    });

    const data = publishers.map((publisher) => buildPublisherData(publisher, clicksByPublisher[publisher.id] || 0, excludedDiffuseurIds.has(publisher.id)));

    return res.status(200).send({ ok: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
});

router.put("/:organizationClientId", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as PublisherRecord;

    const params = zod.object({ organizationClientId: zod.string() }).safeParse(req.params);
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

    const previousExclusions = await collectExclusions(user.id, params.data.organizationClientId);
    const allowedDiffuseurIds = new Set(body.data.publisherIds);
    const targetExcludedIds = publishers.map((publisher) => publisher.id).filter((id) => !allowedDiffuseurIds.has(id));
    const targetExcludedSet = new Set(targetExcludedIds);

    const toDelete = [...previousExclusions].filter((id) => !targetExcludedSet.has(id));
    const toCreate = targetExcludedIds.filter((id) => !previousExclusions.has(id));

    if (toDelete.length) {
      await publisherDiffusionRuleService.deleteRules({
        publisherIds: toDelete,
        field: EXCLUSION_RULE_FIELD,
        value: params.data.organizationClientId,
      });
    }

    await Promise.all(
      toCreate.map((diffuseurId) =>
        publisherDiffusionRuleService.createScopedRule({
          diffuseurPublisherId: diffuseurId,
          annonceurPublisherId: user.id,
          field: EXCLUSION_RULE_FIELD,
          fieldType: "string",
          operator: "is_not",
          value: params.data.organizationClientId,
        })
      )
    );

    const data = publishers.map((publisher) => ({
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
      excluded: targetExcludedSet.has(publisher.id),
    }));

    return res.status(200).send({ ok: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
});

export default router;
