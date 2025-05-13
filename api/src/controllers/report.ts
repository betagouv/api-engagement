import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { captureException, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import ReportModel from "../models/report";

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

    const report = await ReportModel.findOne({
      publisherId: params.data.publisherId,
      month: query.data.month,
      year: query.data.year,
    });
    if (!report) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    }
    if (!report.url) {
      captureException(new Error(`Report ${report._id} has no url`), `Report ${report._id} has no url`);
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
        id: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const report = await ReportModel.findById(params.data.id);
    if (!report) {
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    }
    if (!report.url) {
      captureException(new Error(`Report ${report._id} has no url`), `Report ${report._id} has no url`);
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    }

    res.redirect(report.url);
  } catch (error) {
    next(error);
  }
});

export default router;
