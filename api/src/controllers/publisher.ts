import { NextFunction, Response, Router } from "express";
import Joi from "joi";
import multer from "multer";
import passport from "passport";
import { v4 as uuid } from "uuid";
import zod from "zod";

import { DEFAULT_AVATAR } from "../config";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "../error";
import PublisherModel from "../models/publisher";
import UserModel from "../models/user";
import { OBJECT_ACL, putObject } from "../services/s3";
import { UserRequest } from "../types/passport";

const upload = multer();
const router = Router();

router.get("/", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: errorQuery, value: query } = Joi.object({
      search: Joi.string().allow("").optional(),
      partnersOf: Joi.string().allow("").optional(),
      moderatorOf: Joi.string().allow("").optional(),
    })
      .unknown(true)
      .validate(req.query);
    const user = req.user;

    if (errorQuery) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: errorQuery.details });

    const where = { deletedAt: null } as { [key: string]: any };
    if (query.search) where.name = { $regex: "^" + query.search, $options: "i" };
    if (query.partnersOf) {
      if (user.role !== "admin" && !user.publishers.find((e: string) => e === query.partnersOf))
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: `Not allowed` });
      else where["publishers.publisher"] = query.partnersOf;
    }
    if (query.moderatorOf) {
      if (user.role !== "admin" && !user.publishers.find((e: string) => e === query.moderatorOf))
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: `Not allowed` });
      else {
        where.moderator = true;
        where["publishers.publisher"] = query.moderatorOf;
      }
    } else if (user.role !== "admin") where._id = { $in: user.publishers };

    const data = await PublisherModel.find(where).lean();

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/search", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        role_promoteur: zod.boolean().optional(),
        partnersOf: zod.string().optional(),
        name: zod.string().optional(),
        ids: zod.array(zod.string()).optional(),
      })
      .passthrough()
      .safeParse(req.body);

    if (!body.success) return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });

    const where = { deletedAt: null } as { [key: string]: any };
    if (body.data.role_promoteur) where.role_promoteur = body.data.role_promoteur;
    if (body.data.name) where.name = { $regex: `.*${body.data.name}.*`, $options: "i" };
    if (body.data.ids) where._id = { $in: body.data.ids };

    if (body.data.partnersOf) {
      if (req.user.role === "admin" || (req.user.role !== "admin" && req.user.publishers.some((e: string) => e === body.data.partnersOf)))
        where["publishers.publisher"] = body.data.partnersOf;
      else return res.status(403).send({ ok: false, code: FORBIDDEN, message: `Not allowed` });
    }

    if (!where._id && !where["publishers.publisher"] && req.user.role !== "admin") where._id = { $in: req.user.publishers };

    const data = await PublisherModel.find(where);
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

    if (!params.success) return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });

    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });

    if (req.user.role !== "admin" && !req.user.publishers.find((e: string) => e === params.data.id || publisher.publishers.find((p) => p.publisher === e)))
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: `Not allowed` });

    // Double write, remove publisher later
    return res.status(200).send({ ok: true, publisher, data: publisher });
  } catch (error) {
    next(error);
  }
});

router.post("/", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body;

    const exists = await PublisherModel.exists({ name: body.name });
    if (exists) return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, message: `Publisher ${body.name} already exists` });

    body.logo = DEFAULT_AVATAR;
    const data = await PublisherModel.create(body);

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

    if (!params.success) return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    if (!req.files) return res.status(400).send({ ok: false, code: INVALID_BODY, message: "No file uploaded" });

    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });

    const files = req.files as Express.Multer.File[];
    if (files.length === 0) return res.status(400).send({ ok: false, code: INVALID_BODY, message: "No file uploaded" });
    const objectName = `publishers/${publisher._id}/${files[0].originalname}`;

    const response = await putObject(objectName, files[0].buffer, { ACL: OBJECT_ACL.PUBLIC_READ });

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

    if (!params.success) return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });

    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });

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
        automated_report: zod.boolean().optional(),
        send_report_to: zod.array(zod.string()).optional(),
        annonceur: zod.boolean().default(false),
        missionType: zod.string().nullable().default(null),
        api: zod.boolean().default(false),
        widget: zod.boolean().default(false),
        campaign: zod.boolean().default(false),
        category: zod.string().nullable().default(null),
        publishers: zod
          .array(
            zod.object({
              publisherId: zod.string(),
              publisherName: zod.string(),
              publisherLogo: zod.string().optional(),
              missionType: zod.string().nullable().default(null),
              moderator: zod.boolean().default(false),
            }),
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

    if (!params.success) return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    if (!body.success) return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    if (body.data.annonceur && !body.data.missionType) return res.status(400).send({ ok: false, code: INVALID_BODY, message: "Mission type is required" });
    if (body.data.diffuseur && !body.data.category) return res.status(400).send({ ok: false, code: INVALID_BODY, message: "Category is required" });
    if (body.data.diffuseur && !body.data.api && !body.data.widget && !body.data.campaign)
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: "At least one diffusion method is required" });

    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });

    if (body.data.automated_report !== undefined) publisher.automated_report = body.data.automated_report;
    if (body.data.send_report_to) publisher.send_report_to = body.data.send_report_to;

    publisher.annonceur = body.data.annonceur || false;
    publisher.missionType = body.data.missionType || null;
    publisher.api = body.data.api || false;
    publisher.widget = body.data.widget || false;
    publisher.campaign = body.data.campaign || false;
    publisher.category = body.data.category || null;

    // Double write depreciated
    publisher.role_promoteur = body.data.annonceur || false;
    publisher.mission_type = body.data.missionType || null;
    publisher.role_annonceur_api = body.data.api || false;
    publisher.role_annonceur_widget = body.data.widget || false;
    publisher.role_annonceur_campagne = body.data.campaign || false;

    if (!(publisher.role_annonceur_api || publisher.role_annonceur_widget || publisher.role_annonceur_campagne)) publisher.publishers = [];
    else if (body.data.publishers) {
      const uniqueIds = new Set(body.data.publishers.map((p) => p.publisherId));
      publisher.publishers = body.data.publishers
        .filter((p) => uniqueIds.has(p.publisherId))
        .map((p) => ({
          ...p,
          // Double write depreciated
          publisher: p.publisherId,
          mission_type: p.missionType || null,
        }));
    }

    if (body.data.documentation) publisher.documentation = body.data.documentation;
    if (body.data.description) publisher.description = body.data.description;
    if (body.data.lead) publisher.lead = body.data.lead;
    if (body.data.logo) publisher.logo = body.data.logo;
    if (body.data.url) publisher.url = body.data.url;
    if (body.data.email) publisher.email = body.data.email;
    if (body.data.feed) publisher.feed = body.data.feed;
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

    if (!params.success) return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) return res.status(200).send({ ok: true });

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

    if (!params.success) return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    const publisher = await PublisherModel.findById(params.data.id);
    if (!publisher) return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Publisher not found" });

    publisher.apikey = null;
    await publisher.save();

    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
