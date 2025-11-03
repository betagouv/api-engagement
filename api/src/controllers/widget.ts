import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "../error";
import WidgetModel from "../models/widget";
import { publisherService } from "../services/publisher";
import { UserRequest } from "../types/passport";

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
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const where = { deletedAt: null, active: body.data.active } as { [key: string]: any };

    if (body.data.fromPublisherId) {
      if (req.user.role !== "admin" && !req.user.publishers.includes(body.data.fromPublisherId)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      } else {
        where.fromPublisherId = body.data.fromPublisherId;
      }
    } else if (req.user.role !== "admin") {
      where.fromPublisherId = { $in: req.user.publishers };
    }

    if (body.data.search) {
      where.$or = [{ name: new RegExp(body.data.search, "i") }];
    }

    const widgets = await WidgetModel.find(where).sort({ createdAt: -1 }).lean();
    const total = await WidgetModel.countDocuments(where);
    const publishers = await publisherService.findPublishers();

    const data = widgets.map((w) => ({
      ...w,
      publishers: w.publishers
        .map((p) => {
          const pub = publishers.find((publisher) => publisher.id === p);
          return pub ? { _id: pub.id, name: pub.name } : null;
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
    const query = zod
      .object({
        fromPublisherId: zod.string().optional(),
        active: zod.boolean().optional(),
      })
      .safeParse(req.query);

    if (query.error) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const where = { deleted: false } as { [key: string]: any };
    if (query.data.fromPublisherId) {
      if (req.user.role !== "admin" && !req.user.publishers.includes(query.data.fromPublisherId)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      } else {
        where.fromPublisherId = query.data.fromPublisherId;
      }
    } else if (req.user.role !== "admin") {
      where.fromPublisherId = { $in: req.user.publishers };
    }

    const widgets = await WidgetModel.find(where).sort({ createdAt: -1 }).lean();
    const total = await WidgetModel.countDocuments(where);
    const publishers = await publisherService.findPublishers();

    const data = widgets.map((w) => ({
      ...w,
      publishers: w.publishers
        .map((p) => {
          const pub = publishers.find((publisher) => publisher.id === p);
          return pub ? { _id: pub.id, name: pub.name } : null;
        })
        .filter((p) => p),
    }));

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

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const data = await WidgetModel.findById(params.data.id);
    if (!data) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

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
            zod.object({
              combinator: zod.enum(["and", "or"]),
              field: zod.string(),
              fieldType: zod.string().optional(),
              operator: zod.string(),
              value: zod.string().min(1),
            })
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
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const exists = await WidgetModel.findOne({ name: body.data.name });
    if (exists) {
      return res.status(409).send({
        ok: false,
        code: RESSOURCE_ALREADY_EXIST,
        message: `Widget ${body.data.name} already exist`,
      });
    }

    const fromPublisher = await publisherService.getPublisherById(body.data.fromPublisherId);
    if (!fromPublisher) {
      return res.status(404).send({
        ok: false,
        code: NOT_FOUND,
        message: `Publisher ${body.data.fromPublisherId} not found`,
      });
    }

    const obj = {
      name: body.data.name,
      fromPublisherId: fromPublisher.id,
      fromPublisherName: fromPublisher.name,
      type: body.data.type,
      distance: body.data.distance,
      url: body.data.url,
      rules: body.data.rules,
      style: body.data.style,
      color: body.data.color,
      active: body.data.active,
      publishers: Array.from(new Set(body.data.publishers)),
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
            zod.object({
              combinator: zod.enum(["and", "or"]),
              field: zod.string(),
              fieldType: zod.string().optional(),
              operator: zod.string(),
              value: zod.string().min(1),
            })
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
      .safeParse(req.body);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const widget = await WidgetModel.findById(params.data.id);
    if (!widget) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    if (body.data.distance) {
      widget.distance = body.data.distance;
    }
    if (body.data.name) {
      widget.name = body.data.name;
    }
    if (body.data.url) {
      widget.url = body.data.url;
    }
    if (body.data.rules) {
      widget.rules = body.data.rules;
    }

    if (body.data.style) {
      widget.style = body.data.style;
    }
    if (body.data.color) {
      widget.color = body.data.color;
    }
    if (body.data.type) {
      widget.type = body.data.type;
    }
    if (body.data.active !== undefined) {
      widget.active = body.data.active;
    }
    if (body.data.publishers) {
      widget.publishers = body.data.publishers;
    }
    if (body.data.jvaModeration !== undefined) {
      widget.jvaModeration = body.data.jvaModeration;
    }

    // If no location is provided, remove the location
    if (body.data.location) {
      widget.location = body.data.location;
    } else if (body.data.location === null) {
      widget.location = null;
    }

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

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, error: params.error });
    }

    const widget = await WidgetModel.findById(params.data.id);
    if (!widget) {
      return res.status(200).send({ ok: true });
    }
    widget.deletedAt = new Date();
    await widget.save();
    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
