import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { captureException, FORBIDDEN, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "@/error";
import passport from "@/middlewares/passport";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import { reportService } from "@/services/report";
import { getPresignedUrl } from "@/services/s3";
import type { UserRecord } from "@/types/user";

const router = Router();
router.use(ipRateLimiter);

// Keep because old version of the report
router.get("/pdf/:publisherId", passport.authenticate("user", { session: false }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        publisherId: zod.string(),
      })
      .safeParse(req.params);

    const query = zod
      .object({
        year: zod.coerce.number().default(new Date().getFullYear()),
        month: zod.coerce.number().default(new Date().getMonth()),
      })
      .safeParse(req.query);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const user = req.user as UserRecord;
    if (user.role !== "admin" && !user.publishers.includes(params.data.publisherId)) {
      return res.status(403).send({ ok: false, code: FORBIDDEN, message: "Forbidden" });
    }

    const report = await reportService.findOneReportByPublisherAndPeriod(params.data.publisherId, query.data.year, query.data.month);
    if (!report) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    }
    if (!report.url) {
      captureException(new Error(`Report ${report.id} has no url`), `Report ${report.id} has no url`);
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    }

    if (report.objectName) {
      const signedUrl = await getPresignedUrl(report.objectName);
      return res.redirect(signedUrl);
    }
    res.redirect(report.url);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.uuid(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const report = await reportService.findOneReportById(params.data.id);
    if (!report) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    }
    if (!report.url) {
      captureException(new Error(`Report ${report.id} has no url`), `Report ${report.id} has no url`);
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    }

    if (report.objectName) {
      const signedUrl = await getPresignedUrl(report.objectName);
      return res.redirect(signedUrl);
    }
    res.redirect(report.url);
  } catch (error) {
    next(error);
  }
});

export default router;
