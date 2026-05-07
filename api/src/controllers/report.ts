import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { captureException, INVALID_PARAMS, NOT_FOUND } from "@/error";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import { reportService } from "@/services/report";
import { getPresignedUrl } from "@/services/s3";

const router = Router();
router.use(ipRateLimiter);

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
