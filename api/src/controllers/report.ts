import cors from "cors";
import { NextFunction, Request, Response, Router } from "express";
import Joi from "joi";

import { captureException, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import ReportModel from "../models/report";

const router = Router();

// Keep because old version of the report
router.get("/pdf/:publisherId", cors({ origin: "*" }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error: paramsError, value: params } = Joi.object({
      publisherId: Joi.string().required(),
    }).validate(req.params);

    const { error: queryError, value: query } = Joi.object({
      year: Joi.number().min(2000).max(2100).default(new Date().getFullYear()),
      month: Joi.number().min(1).max(12).default(new Date().getMonth()),
    })
      .unknown()
      .validate(req.query);

    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: paramsError.details });
    if (queryError) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: queryError.details });

    const report = await ReportModel.findOne({ publisherId: params.publisherId, month: query.month });
    if (!report) return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    if (!report.url) {
      captureException(new Error(`Report ${report._id} has no url`), `Report ${report._id} has no url`);
      return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
    }
    res.redirect(report.url);
  } catch (error) {
    next(error);
  }
});

router.get("/:reportId", cors({ origin: "*" }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error: paramsError, value: params } = Joi.object({
      reportId: Joi.string().required(),
    }).validate(req.params);

    if (paramsError) return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: paramsError.details });
    const report = await ReportModel.findById(params.reportId);
    if (!report) return res.status(404).send({ ok: false, code: NOT_FOUND, message: "Report not found" });
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
