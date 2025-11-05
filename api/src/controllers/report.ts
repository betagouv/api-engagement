import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { captureException, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import { reportService } from "../services/report";

const router = Router();

// Keep because old version of the report
router.get("/pdf/:publisherId", async (req: Request, res: Response, next: NextFunction) => {
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

    const report = await reportService.findReportByPublisherAndPeriod(params.data.publisherId, query.data.year, query.data.month);
    if (!report) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    }
    if (!report.url) {
      captureException(new Error(`Report ${report.id} has no url`), `Report ${report.id} has no url`);
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
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
        id: zod.string(),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const report = await reportService.getReportById(params.data.id);
    if (!report) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    }
    if (!report.url) {
      captureException(new Error(`Report ${report.id} has no url`), `Report ${report.id} has no url`);
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    }

    res.redirect(report.url);
  } catch (error) {
    next(error);
  }
});

export default router;
