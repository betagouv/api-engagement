import { NextFunction, Response, Router } from "express";
import multer from "multer";
import passport from "passport";
import zod from "zod";

import { DEFAULT_AVATAR, PUBLISHER_IDS } from "@/config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, NOT_FOUND, RESSOURCE_ALREADY_EXIST, captureException } from "@/error";
import { requireDirectPublisherAccess, requirePublisherRelationAccess } from "@/middlewares/authorization";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import { PublisherNotFoundError, publisherService } from "@/services/publisher";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { OBJECT_ACL, putObject } from "@/services/s3";
import { userService } from "@/services/user";
import { UserRequest } from "@/types/passport";
import { PublisherMissionType, type PublisherDiffusionInput, type PublisherRoleFilter } from "@/types/publisher";
import { appendAuditEvent } from "@/utils/audit-log";
import { readRequiredParam } from "@/utils/publisher-access";

const upload = multer();
const router = Router();
router.use(ipRateLimiter);

const nullableString = zod.string().nullish();
const publisherDiffusionSchema = zod.object({
  publisherId: zod.string().min(1),
  missionType: zod.enum(PublisherMissionType).nullable().optional(),
  moderator: zod.boolean().optional(),
});

type PublisherDiffusionBody = zod.infer<typeof publisherDiffusionSchema>;

const mapPublishersForService = (publishers?: PublisherDiffusionBody[]): PublisherDiffusionInput[] | undefined =>
  publishers?.map(({ publisherId, missionType, moderator }) => ({
    publisherId,
    missionType: (missionType as PublisherMissionType) ?? null,
    moderator: moderator ?? false,
  }));

router.post("/search", passport.authenticate(["user", "admin"], { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const body = zod
      .object({
        diffuseursOf: zod.string().optional(),
        moderator: zod.boolean().optional(),
        name: zod.string().optional(),
        ids: zod.array(zod.string()).optional(),
        role: zod.string().optional(),
        sendReport: zod.boolean().optional(),
        missionType: zod.enum(PublisherMissionType).nullable().optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    let diffuseurOf: string | undefined = undefined;
    if (body.data.diffuseursOf) {
      if (user.role === "admin" || user.publishers.some((publisherId: string) => publisherId === body.data.diffuseursOf)) {
        diffuseurOf = body.data.diffuseursOf;
      } else {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      }
    }

    const allowedRoles: PublisherRoleFilter[] = ["annonceur", "diffuseur", "api", "widget", "campaign"];
    const role = allowedRoles.includes(body.data.role as PublisherRoleFilter) ? (body.data.role as PublisherRoleFilter) : undefined;

    const filters = {
      diffuseurOf,
      moderator: body.data.moderator,
      name: body.data.name,
      ids: body.data.ids,
      role,
      sendReport: body.data.sendReport,
      missionType: body.data.missionType,
      accessiblePublisherIds: user.role === "admin" ? undefined : user.publishers.map((value: string) => value.toString()),
    };

    const { data, total } = await publisherService.findPublishersWithCount(filters);

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

const requirePublisherReadAccess = requirePublisherRelationAccess({ idParam: "id" });
const requirePublisherWriteAccess = requireDirectPublisherAccess({ idParam: "id" });

router.get("/:id", passport.authenticate("user", { session: false }), requirePublisherReadAccess, async (_req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const publisher = res.locals.publisher;

    return res.status(200).send({ ok: true, publisher, data: publisher });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/moderated", passport.authenticate("user", { session: false }), requirePublisherReadAccess, async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const publisherId = readRequiredParam(req, res, "id");
    if (!publisherId) {
      return;
    }

    const jva = await publisherService.findOnePublisherById(PUBLISHER_IDS.JEVEUXAIDER);
    if (!jva) {
      captureException(new Error("JVA not found"));
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "JVA not found" });
    }

    if (jva.publishers.some((p) => p.diffuseurPublisherId === publisherId)) {
      return res.status(200).send({ ok: true, data: true });
    }

    return res.status(200).send({ ok: true, data: false });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/diffusion-rules", passport.authenticate("user", { session: false }), requirePublisherReadAccess, async (_req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const publisher = res.locals.publisher;

    const rules = await publisherDiffusionRuleService.findRules({
      publisherId: publisher.id,
      combinedWithId: null,
      includeCombinedRules: true,
    });

    return res.status(200).send({ ok: true, data: rules });
  } catch (error) {
    next(error);
  }
});

router.post("/", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        sendReport: zod.boolean().default(false),
        sendReportTo: zod.array(zod.string()).default([]),
        isAnnonceur: zod.boolean().default(false),
        selfHostedScript: zod.boolean().default(false),
        missionType: zod.enum(PublisherMissionType).nullable().default(null),
        hasApiRights: zod.boolean().default(false),
        hasWidgetRights: zod.boolean().default(false),
        hasCampaignRights: zod.boolean().default(false),
        category: zod.string().nullable().default(null),
        name: zod.string().optional(),
        publishers: zod.array(publisherDiffusionSchema).optional(),
        documentation: nullableString,
        description: zod.string().optional(),
        lead: nullableString,
        logo: zod.string().optional(),
        url: nullableString,
        email: nullableString,
        feed: nullableString,
        demarcheSimplifiees: zod.array(zod.object({ number: zod.number().int().positive(), name: nullableString, url: nullableString, annotationKey: nullableString })).optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    if (!body.data.name) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "Name is required" });
    }

    const exists = await publisherService.publisherExistsByName(body.data.name);
    if (exists) {
      return res.status(409).send({
        ok: false,
        code: RESSOURCE_ALREADY_EXIST,
        message: `Publisher ${body.data.name} already exists`,
      });
    }

    const payload = {
      name: body.data.name,
      sendReport: body.data.sendReport,
      sendReportTo: body.data.sendReportTo,
      isAnnonceur: body.data.isAnnonceur,
      selfHostedScript: body.data.selfHostedScript,
      missionType: body.data.missionType,
      hasApiRights: body.data.hasApiRights,
      hasWidgetRights: body.data.hasWidgetRights,
      hasCampaignRights: body.data.hasCampaignRights,
      category: body.data.category,
      documentation: body.data.documentation,
      description: body.data.description,
      lead: body.data.lead,
      logo: DEFAULT_AVATAR,
      url: body.data.url,
      email: body.data.email,
      feed: body.data.feed,
      demarcheSimplifiees: body.data.demarcheSimplifiees,
      publishers: mapPublishersForService(body.data.publishers),
    };

    const data = await publisherService.createPublisher(payload);

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/image",
  passport.authenticate("user", { session: false }),
  requirePublisherWriteAccess,
  upload.any(),
  async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      const publisherId = readRequiredParam(req, res, "id");
      if (!publisherId) {
        return;
      }
      if (!req.files) {
        return res.status(400).send({ ok: false, code: INVALID_BODY, message: "No file uploaded" });
      }

      const files = req.files as Express.Multer.File[];
      if (files.length === 0) {
        return res.status(400).send({ ok: false, code: INVALID_BODY, message: "No file uploaded" });
      }
      const objectName = `publishers/${publisherId}/${files[0].originalname}`;

      const response = await putObject(objectName, files[0].buffer, {
        ACL: OBJECT_ACL.PUBLIC_READ,
      });

      const updated = await publisherService.updatePublisher(publisherId, { logo: response.Location });

      return res.status(200).send({ ok: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/:id/apikey", passport.authenticate("user", { session: false }), requirePublisherWriteAccess, async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const publisherId = readRequiredParam(req, res, "id");
    if (!publisherId) {
      return;
    }

    try {
      const { apikey } = await publisherService.regenerateApiKey(publisherId);
      appendAuditEvent(req, {
        action: "publisher.api_key.regenerate",
        outcome: "success",
        target: { type: "publisher", id: publisherId },
      });
      return res.status(200).send({ ok: true, data: apikey });
    } catch (error) {
      if (error instanceof PublisherNotFoundError) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
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
        sendReport: zod.boolean().optional(),
        sendReportTo: zod.array(zod.string()).optional(),
        isAnnonceur: zod.boolean().optional(),
        selfHostedScript: zod.boolean().optional(),
        missionType: zod.enum(PublisherMissionType).nullable().optional(),
        hasApiRights: zod.boolean().optional(),
        hasWidgetRights: zod.boolean().optional(),
        hasCampaignRights: zod.boolean().optional(),
        category: zod.string().nullable().optional(),
        publishers: zod.array(publisherDiffusionSchema).optional(),
        documentation: nullableString,
        description: zod.string().optional(),
        lead: nullableString,
        logo: zod.string().optional(),
        url: nullableString,
        email: nullableString,
        feed: nullableString,
        demarcheSimplifiees: zod.array(zod.object({ number: zod.number().int().positive(), name: nullableString, url: nullableString, annotationKey: nullableString })).optional(),
      })
      .safeParse(req.body);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }
    if (body.data.isAnnonceur && !body.data.missionType) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "Mission type is required" });
    }
    if ((body.data.hasApiRights || body.data.hasWidgetRights || body.data.hasCampaignRights) && !body.data.category) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "Category is required" });
    }

    const publishers = body.data.publishers !== undefined ? (mapPublishersForService(body.data.publishers) ?? []) : undefined;

    const patch = {
      name: body.data.name,
      sendReport: body.data.sendReport,
      sendReportTo: body.data.sendReportTo,
      isAnnonceur: body.data.isAnnonceur,
      selfHostedScript: body.data.selfHostedScript,
      missionType: body.data.missionType,
      hasApiRights: body.data.hasApiRights,
      hasWidgetRights: body.data.hasWidgetRights,
      hasCampaignRights: body.data.hasCampaignRights,
      category: body.data.category,
      publishers,
      documentation: body.data.documentation,
      description: body.data.description,
      lead: body.data.lead,
      logo: body.data.logo,
      url: body.data.url,
      email: body.data.email,
      feed: body.data.feed,
      demarcheSimplifiees: body.data.demarcheSimplifiees,
    };

    try {
      const updated = await publisherService.updatePublisher(params.data.id, patch);
      appendAuditEvent(req, {
        action: "publisher.update",
        outcome: "success",
        target: { type: "publisher", id: params.data.id },
        metadata: {
          fields: Object.keys(patch).filter((key) => patch[key as keyof typeof patch] !== undefined),
        },
      });
      res.status(200).send({ ok: true, data: updated });
    } catch (error) {
      if (error instanceof PublisherNotFoundError) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
      }
      throw error;
    }
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
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    const publisher = await publisherService.findOnePublisherById(params.data.id);
    if (!publisher) {
      return res.status(200).send({ ok: true });
    }

    await userService.removePublisherFromUsers(params.data.id);

    await publisherService.softDeletePublisher(params.data.id);

    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/apikey", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    try {
      await publisherService.updatePublisher(params.data.id, { apikey: null });
      res.status(200).send({ ok: true });
    } catch (error) {
      if (error instanceof PublisherNotFoundError) {
        return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

export default router;
