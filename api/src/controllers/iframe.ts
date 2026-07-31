import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { INVALID_QUERY, NOT_FOUND } from "@/error";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import { widgetService } from "@/services/widget";

const router = Router();
router.use(ipRateLimiter);

router.get("/widget", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        id: zod.string().optional(),
        name: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    if (!query.data.id && !query.data.name) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: "Missing id or name" });
    }

    const widget = query.data.id ? await widgetService.findOneWidgetById(query.data.id) : await widgetService.findOneWidgetByName(query.data.name || "");
    if (!widget) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    return res.status(200).send({ ok: true, data: widget });
  } catch (error) {
    next(error);
  }
});

export default router;
