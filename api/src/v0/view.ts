import { Response, Router } from "express";
import passport from "passport";

import { DEPRECATED } from "../error";

const router = Router();

router.get("/stats", passport.authenticate(["apikey", "api"], { session: false }), (_req, res: Response) => {
  return res.status(410).send({ ok: false, code: DEPRECATED });
});

export default router;
