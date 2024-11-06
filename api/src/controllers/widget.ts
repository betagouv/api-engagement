import { NextFunction, Response, Router } from "express";
import Joi from "joi";
import passport from "passport";
import zod from "zod";

import { JVA_ID, MISSION_INDEX } from "../config";
import esClient from "../db/elastic";
import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "../error";
import PublisherModel from "../models/publisher";
import WidgetModel from "../models/widget";
import { UserRequest } from "../types/passport";
import { buildQuery } from "../utils";

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

    if (!body.success) return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });

    const where = { deleted: false, active: body.data.active } as { [key: string]: any };

    if (body.data.fromPublisherId) {
      if (req.user.role !== "admin" && !req.user.publishers.includes(body.data.fromPublisherId))
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      else where.fromPublisherId = body.data.fromPublisherId;
    } else if (req.user.role !== "admin") where.fromPublisherId = { $in: req.user.publishers };

    if (body.data.search) {
      where.$or = [{ name: new RegExp(body.data.search, "i") }];
    }

    const widgets = await WidgetModel.find(where).sort({ createdAt: -1 }).lean();
    const total = await WidgetModel.countDocuments(where);
    const publishers = await PublisherModel.find().select("_id name").lean();

    const data = widgets.map((w) => ({
      ...w,
      publishers: w.publishers
        .map((p) => {
          const pub = publishers.find((pub) => pub._id.toString() === p);
          return pub ? { _id: pub._id, name: pub.name } : null;
        })
        .filter((p) => p),
    }));

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { error: queryError, value: query } = Joi.object({
      fromPublisherId: Joi.string().allow("").optional(),
      active: Joi.boolean().optional(),
    })
      .unknown()
      .validate(req.query);

    if (queryError) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: queryError.details });

    const where = { deleted: false } as { [key: string]: any };
    if (query.fromPublisherId) {
      if (req.user.role !== "admin" && !req.user.publishers.includes(query.fromPublisherId)) return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      else where.fromPublisherId = query.fromPublisherId;
    } else if (req.user.role !== "admin") where.fromPublisherId = { $in: req.user.publishers };

    const widgets = await WidgetModel.find(where).sort({ createdAt: -1 }).lean();
    const total = await WidgetModel.countDocuments(where);
    const publishers = await PublisherModel.find().select("_id name").lean();

    const data = widgets.map((w) => ({
      ...w,
      publishers: w.publishers
        .map((p) => {
          const pub = publishers.find((pub) => pub._id.toString() === p);
          return pub ? { _id: pub._id, name: pub.name } : null;
        })
        .filter((p) => p),
    }));

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/partners", passport.authenticate("user", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        publisherId: zod.string().regex(/^[0-9a-fA-F]{24}$/),
        jvaModeration: zod
          .enum(["true", "false"])
          .transform((value) => value === "true")
          .optional(),
        rules: zod
          .array(
            zod.object({
              field: zod.string(),
              operator: zod.string(),
              value: zod.string().optional(),
              combinator: zod.enum(["and", "or"]),
            }),
          )
          .optional(),
        lat: zod.string().transform(Number).optional(),
        lon: zod.string().transform(Number).optional(),
        distance: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });

    // Add itself if the publisher is a promoteur
    const where: any = {
      query: {
        bool: {
          must: [{ term: { "statusCode.keyword": "ACCEPTED" } }, { term: { deleted: false } }],
          filter: { bool: { should: [] } },
        } as { must: any[]; filter: any },
      },
      aggs: { partners: { terms: { field: "publisherId.keyword", size: 10000 } } },
    };

    const publisher = await PublisherModel.findById(query.data.publisherId);

    if (!publisher) return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Widget's publisher not found" });
    if (req.user.role !== "admin" && !req.user.publishers.includes(publisher._id.toString())) return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });

    if (query.data.jvaModeration) {
      where.query.bool.filter.bool.should.push({ term: { "publisherId.keyword": JVA_ID } });
      publisher.publishers.forEach((p) =>
        where.query.bool.filter.bool.should.push({
          bool: {
            must: [{ term: { "publisherId.keyword": p.publisher } }, { term: { [`moderation_${JVA_ID}_status.keyword`]: "ACCEPTED" } }],
          },
        }),
      );
    } else {
      publisher.publishers.forEach((p) => where.query.bool.filter.bool.should.push({ term: { "publisherId.keyword": p.publisher } }));
      if (publisher.role_promoteur) where.query.bool.filter.bool.should.push({ term: { "publisherId.keyword": publisher._id.toString() } });
      if (where.query.bool.filter.bool.should.length === 0) return res.status(200).send({ ok: true, data: [], total: 0 });
    }

    const rules = query.data.rules || [];
    if (rules.length > 0) {
      const builtQuery = buildQuery(rules as any);
      if (builtQuery.bool.must && Array.isArray(builtQuery.bool.must)) {
        where.query.bool.must.push(...builtQuery.bool.must);
      }
      if (builtQuery.bool.should && Array.isArray(builtQuery.bool.should)) {
        where.query.bool.filter.bool.should.push(...builtQuery.bool.should);
      }
    }

    if (query.data.lat && query.data.lon) {
      where.query.bool.must.push({
        geo_distance: {
          distance: query.data.distance || "25km",
          location: {
            lat: query.data.lat,
            lon: query.data.lon,
          },
        },
      });
    }

    const response = await esClient.search({
      index: MISSION_INDEX,
      body: where,
      track_total_hits: true,
      size: 0,
    });

    const publishers = await PublisherModel.find().select("_id name mission_type").lean();
    const data = response.body.aggregations.partners.buckets.map((b: { key: string; doc_count: number }) => {
      const p = publishers.find((p) => p._id.toString() === b.key);
      if (!p) return null;
      return { _id: b.key, name: p.name, count: b.doc_count, mission_type: p.mission_type };
    });

    const total = response.body.hits.total.value;
    // Send only the partners that have at least one mission
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
      .required()
      .safeParse(req.params);

    if (!params.success) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });

    const data = await WidgetModel.findById(params.data.id);
    if (!data) return res.status(404).send({ ok: false, code: NOT_FOUND });

    return res.status(200).send({ ok: true, data });
  } catch (error: any) {
    next(error);
  }
});

router.post("/", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        fromPublisherId: zod.string(),
        distance: zod.string().optional(),
        name: zod.string().optional(),
        url: zod.string().optional(),
        rules: zod
          .array(
            zod
              .object({
                combinator: zod.enum(["and", "or"]),
                field: zod.string(),
                fieldType: zod.string().optional(),
                operator: zod.string(),
                value: zod.string().min(1),
              })
              .passthrough(),
          )
          .optional(),

        style: zod.enum(["carousel", "page"]).optional(),
        color: zod.string().optional(),
        type: zod.enum(["benevolat", "volontariat"]).optional(),
        active: zod.coerce.boolean().optional(),
        publishers: zod.array(zod.string()).optional(),
        jvaModeration: zod.coerce.boolean().optional(),
        location: zod
          .object({
            lat: zod.coerce.number(),
            lon: zod.coerce.number(),
            city: zod.string(),
            label: zod.string(),
            postcode: zod.string(),
            name: zod.string(),
          })
          .nullable()
          .optional(),
      })
      .passthrough()
      .safeParse(req.body);

    if (!body.success) return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });

    const exists = await WidgetModel.findOne({ name: body.data.name });
    if (exists) return res.status(409).send({ ok: false, code: RESSOURCE_ALREADY_EXIST, message: `Widget ${body.data.name} already exist` });

    const fromPublisher = await PublisherModel.findById(body.data.fromPublisherId);
    if (!fromPublisher) return res.status(404).send({ ok: false, code: NOT_FOUND, message: `Publisher ${body.data.fromPublisherId} not found` });

    const obj = {
      name: body.data.name,
      fromPublisherId: fromPublisher._id.toString(),
      fromPublisherName: fromPublisher.name,
      type: body.data.type,
      distance: body.data.distance,
      url: body.data.url,
      rules: body.data.rules,
      style: body.data.style,
      color: body.data.color,
      active: body.data.active,
      publishers: body.data.publishers,
      jvaModeration: body.data.jvaModeration,
      location: body.data.location,
    };

    const data = await WidgetModel.create(obj);

    return res.status(200).send({ ok: true, data });
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
        distance: zod.string().optional(),
        name: zod.string().optional(),
        url: zod.string().optional(),
        rules: zod
          .array(
            zod
              .object({
                combinator: zod.enum(["and", "or"]),
                field: zod.string(),
                fieldType: zod.string().optional(),
                operator: zod.string(),
                value: zod.string().min(1),
              })
              .passthrough(),
          )
          .optional(),

        style: zod.enum(["carousel", "page"]).optional(),
        color: zod.string().optional(),
        type: zod.enum(["benevolat", "volontariat"]).optional(),
        active: zod.coerce.boolean().optional(),
        publishers: zod.array(zod.string()).optional(),
        jvaModeration: zod.coerce.boolean().optional(),
        location: zod
          .object({
            lat: zod.coerce.number(),
            lon: zod.coerce.number(),
            city: zod.string(),
            label: zod.string(),
            postcode: zod.string(),
            name: zod.string(),
          })
          .nullable()
          .optional(),
      })
      .passthrough()
      .safeParse(req.body);

    if (!params.success) return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    if (!body.success) return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });

    const widget = await WidgetModel.findById(params.data.id);
    if (!widget) return res.status(404).send({ ok: false, code: NOT_FOUND });
    const publishers = await PublisherModel.find().select("_id name moderator mission_type").lean();

    if (body.data.distance) widget.distance = body.data.distance;
    if (body.data.name) widget.name = body.data.name;
    if (body.data.url) widget.url = body.data.url;
    if (body.data.rules) widget.rules = body.data.rules;

    if (body.data.style) widget.style = body.data.style;
    if (body.data.color) widget.color = body.data.color;
    if (body.data.type) widget.type = body.data.type;
    if (body.data.active !== undefined) widget.active = body.data.active;
    if (body.data.publishers)
      widget.publishers = body.data.publishers.filter((p: string) => {
        const exists = publishers.find((pub) => pub._id.toString() === p);
        return exists && exists.mission_type === widget.type;
      });
    if (body.data.jvaModeration !== undefined) widget.jvaModeration = body.data.jvaModeration;

    // If no location is provided, remove the location
    if (body.data.location) widget.location = body.data.location;
    else if (body.data.location === null) widget.location = null;

    await widget.save();

    return res.status(200).json({ ok: true, data: widget });
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

    const widget = await WidgetModel.findById(params.data.id);
    if (!widget) return res.status(404).send({ ok: false, code: NOT_FOUND });
    widget.deleted = true;
    await widget.save();
    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
