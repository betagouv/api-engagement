import { NextFunction, Response, Router } from "express";
import multer from "multer";
import passport from "passport";
import { v4 as uuid } from "uuid";
import zod from "zod";

import { HydratedDocument } from "mongoose";
import { DEFAULT_AVATAR } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "../error";
import OrganizationExclusionModel from "../models/organization-exclusion";
import PublisherModel from "../models/publisher";
import UserModel from "../models/user";
import { OBJECT_ACL, putObject } from "../services/s3";
import { User } from "../types";
import { UserRequest } from "../types/passport";

const upload = multer();
const router = Router();

router.post("/search", passport.authenticate(["user", "admin"], { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as HydratedDocument<User>;
    const body = zod
      .object({
        diffuseursOf: zod.string().optional(),
        moderator: zod.boolean().optional(),
        name: zod.string().optional(),
        ids: zod.array(zod.string()).optional(),
        role: zod.string().optional(),
        sendReport: zod.boolean().optional(),
        missionType: zod.string().optional(),
      })
      .passthrough()
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const where = { deletedAt: null } as { [key: string]: any };

    if (body.data.role === "annonceur") {
      where.isAnnonceur = true;
    }
    if (body.data.role === "diffuseur") {
      where.$or = [{ hasApiRights: true }, { hasWidgetRights: true }, { hasCampaignRights: true }];
    }
    if (body.data.role === "api") {
      where.hasApiRights = true;
    }
    if (body.data.role === "widget") {
      where.hasWidgetRights = true;
    }
    if (body.data.role === "campaign") {
      where.hasCampaignRights = true;
    }
    if (body.data.sendReport !== undefined) {
      where.sendReport = body.data.sendReport;
    }
    if (body.data.missionType) {
      where.missionType = body.data.missionType;
    }

    if (body.data.name) {
      where.name = { $regex: `.*${body.data.name}.*`, $options: "i" };
    }
    if (body.data.ids) {
      where._id = { $in: body.data.ids };
    }

    if (body.data.diffuseursOf) {
      if (user.role === "admin" || user.publishers.some((e: string) => e === body.data.diffuseursOf)) {
        where["publishers.publisherId"] = body.data.diffuseursOf;
      } else {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: `Not allowed` });
      }
    }
    if (body.data.moderator) {
      where.moderator = true;
    }

    if (!where._id && !where["publishers.publisherId"] && user.role !== "admin") {
      where._id = { $in: user.publishers };
    }

    const data = await PublisherModel.find(where).sort({ name: 1 }).lean();
    const total = await PublisherModel.countDocuments(where);

    return res.status(200).send({ ok: true, data, total });
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
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    if (req.user.role !== "admin" && !req.user.publishers.find((e: string) => e === params.data.id || publisher.publishers.find((p) => p.publisherId === e))) {
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: `Not allowed` });
    }

    // Double write, remove publisher later
    return res.status(200).send({ ok: true, publisher, data: publisher });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/excluded-organizations", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    const organizationExclusions = await OrganizationExclusionModel.find({
      excludedForPublisherId: publisher._id.toString(),
    });
    return res.status(200).send({ ok: true, data: organizationExclusions });
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
        missionType: zod.string().nullable().default(null),
        hasApiRights: zod.boolean().default(false),
        hasWidgetRights: zod.boolean().default(false),
        hasCampaignRights: zod.boolean().default(false),
        category: zod.string().nullable().default(null),
        publishers: zod
          .array(
            zod.object({
              publisherId: zod.string(),
              publisherName: zod.string(),
              publisherLogo: zod.string().optional(),
              missionType: zod.string().nullable().default(null),
              moderator: zod.boolean().default(false),
            })
          )
          .optional(),
        documentation: zod.string().optional(),
        description: zod.string().optional(),
        lead: zod.string().optional(),
        logo: zod.string().optional(),
        url: zod.string().optional(),
        email: zod.string().optional(),
        feed: zod.string().optional(),
      })
      .passthrough()
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const exists = await PublisherModel.exists({ name: body.data.name });
    if (exists) {
      return res.status(409).send({
        ok: false,
        code: RESSOURCE_ALREADY_EXIST,
        message: `Publisher ${body.data.name} already exists`,
      });
    }

    body.data.logo = DEFAULT_AVATAR;

    const data = await PublisherModel.create(body.data);

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/image", passport.authenticate("user", { session: false }), upload.any(), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    if (!req.files) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "No file uploaded" });
    }

    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    const files = req.files as Express.Multer.File[];
    if (files.length === 0) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "No file uploaded" });
    }
    const objectName = `publishers/${publisher._id}/${files[0].originalname}`;

    const response = await putObject(objectName, files[0].buffer, {
      ACL: OBJECT_ACL.PUBLIC_READ,
    });

    publisher.logo = response.Location;
    await publisher.save();

    return res.status(200).send({ ok: true, data: publisher });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/apikey", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    const apikey = uuid();
    publisher.apikey = apikey;
    await publisher.save();

    return res.status(200).send({ ok: true, data: apikey });
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
        sendReport: zod.boolean().default(false),
        sendReportTo: zod.array(zod.string()).default([]),
        isAnnonceur: zod.boolean().default(false),
        missionType: zod.string().nullable().default(null),
        hasApiRights: zod.boolean().default(false),
        hasWidgetRights: zod.boolean().default(false),
        hasCampaignRights: zod.boolean().default(false),
        category: zod.string().nullable().default(null),
        publishers: zod
          .array(
            zod.object({
              publisherId: zod.string(),
              publisherName: zod.string(),
              publisherLogo: zod.string().optional(),
              missionType: zod.string().nullable().default(null),
              moderator: zod.boolean().default(false),
            })
          )
          .optional(),
        documentation: zod.string().optional(),
        description: zod.string().optional(),
        lead: zod.string().optional(),
        logo: zod.string().optional(),
        url: zod.string().optional(),
        email: zod.string().optional(),
        feed: zod.string().optional(),
      })
      .passthrough()
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

    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    publisher.sendReport = body.data.sendReport;
    publisher.sendReportTo = body.data.sendReportTo;
    publisher.isAnnonceur = body.data.isAnnonceur;
    publisher.missionType = body.data.missionType;
    publisher.hasApiRights = body.data.hasApiRights;
    publisher.hasWidgetRights = body.data.hasWidgetRights;
    publisher.hasCampaignRights = body.data.hasCampaignRights;
    publisher.category = body.data.category;

    if (!(publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights)) {
      publisher.publishers = [];
    } else if (body.data.publishers) {
      publisher.publishers = body.data.publishers;
    }

    if (body.data.documentation) {
      publisher.documentation = body.data.documentation;
    }
    if (body.data.description) {
      publisher.description = body.data.description;
    }
    if (body.data.lead) {
      publisher.lead = body.data.lead;
    }
    if (body.data.logo) {
      publisher.logo = body.data.logo;
    }
    if (body.data.url) {
      publisher.url = body.data.url;
    }
    if (body.data.email) {
      publisher.email = body.data.email;
    }
    if (body.data.feed) {
      publisher.feed = body.data.feed;
    }
    await publisher.save();

    res.status(200).send({ ok: true, data: publisher });
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
    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) {
      return res.status(200).send({ ok: true });
    }

    const users = await UserModel.find({ publishers: params.data.id });
    for (let i = 0; i < users.length; i++) {
      users[i].publishers = users[i].publishers.filter((e) => e !== params.data.id);
      users[i].save();
    }

    publisher.deletedAt = new Date();
    await publisher.save();

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
    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });
    }

    publisher.apikey = null;
    await publisher.save();

    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
