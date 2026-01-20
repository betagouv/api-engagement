import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { FORBIDDEN, INVALID_BODY, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, RESSOURCE_ALREADY_EXIST } from "../error";
import { publisherService } from "../services/publisher";
import { widgetService } from "../services/widget";
import { UserRequest } from "../types/passport";
import type { WidgetCreateInput, WidgetSearchParams } from "../types/widget";

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

    const searchParams: WidgetSearchParams = {
      active: body.data.active,
      search: body.data.search,
      includeDeleted: false,
      skip: body.data.from ?? undefined,
      take: body.data.size ?? undefined,
    };

    if (body.data.fromPublisherId) {
      if (req.user.role !== "admin" && !req.user.publishers.includes(body.data.fromPublisherId)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      } else {
        searchParams.fromPublisherId = body.data.fromPublisherId;
      }
    } else if (req.user.role !== "admin") {
      searchParams.fromPublisherIds = req.user.publishers;
    }

    const { widgets, total } = await widgetService.findWidgets(searchParams);
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

    const searchParams: WidgetSearchParams = {
      includeDeleted: false,
      skip: undefined,
      take: undefined,
      active: query.data.active,
    };
    if (query.data.fromPublisherId) {
      if (req.user.role !== "admin" && !req.user.publishers.includes(query.data.fromPublisherId)) {
        return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Not allowed" });
      } else {
        searchParams.fromPublisherId = query.data.fromPublisherId;
      }
    } else if (req.user.role !== "admin") {
      searchParams.fromPublisherIds = req.user.publishers;
    }

    const { widgets, total } = await widgetService.findWidgets(searchParams);
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

    const data = await widgetService.findOneWidgetById(params.data.id, { includeDeleted: true });
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
            label: zod.string(),
          })
          .nullable()
          .optional(),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const exists = await widgetService.findOneWidgetByName(body.data.name ?? "", { includeDeleted: true });
    if (exists) {
      return res.status(409).send({
        ok: false,
        code: RESSOURCE_ALREADY_EXIST,
        message: `Widget ${body.data.name} already exist`,
      });
    }

    const fromPublisher = await publisherService.findOnePublisherById(body.data.fromPublisherId);
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
      publishers: Array.from(new Set(body.data.publishers ?? [])),
      jvaModeration: body.data.jvaModeration,
      location: body.data.location,
    };

    const data = await widgetService.createWidget(obj as WidgetCreateInput);

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
            label: zod.string(),
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

    const widget = await widgetService.findOneWidgetById(params.data.id, { includeDeleted: true });
    if (!widget) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const updated = await widgetService.updateWidget(params.data.id, {
      distance: body.data.distance,
      name: body.data.name,
      url: body.data.url,
      rules: body.data.rules,
      style: body.data.style,
      color: body.data.color,
      type: body.data.type,
      active: body.data.active,
      publishers: body.data.publishers,
      jvaModeration: body.data.jvaModeration,
      location: body.data.location,
    });

    return res.status(200).json({ ok: true, data: updated });
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

    const now = new Date();
    await widgetService.updateWidget(params.data.id, { deletedAt: now });
    res.status(200).send({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
