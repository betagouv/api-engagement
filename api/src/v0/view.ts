import { Response, Router } from "express";
import passport from "passport";

import { DEPRECATED } from "@/error";
import { publisherRateLimiter } from "@/middlewares/rate-limit";

const router = Router();
router.use(passport.authenticate(["apikey", "api"], { session: false }));
router.use(publisherRateLimiter);

router.get("/stats", (_req, res: Response) => {
  return res.status(410).send({ ok: false, code: DEPRECATED });
});

export default router;
