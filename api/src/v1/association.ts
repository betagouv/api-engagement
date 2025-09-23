import { NextFunction, Response, Router } from "express";
import passport from "passport";

import { captureMessage } from "../error";
import { PublisherRequest } from "../types/passport";

const router = Router();

router.get("/:rnaId/etablissement/:id", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    captureMessage("[DEPRECATED] get v1/association/:rnaId/etablissement/:id");
    return res.status(404).send({ ok: false, code: "DEPRECATED", message: "This endpoint is deprecated" });
  } catch (error) {
    next(error);
  }
});

router.put("/:rnaId/etablissement/:id", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    captureMessage("[DEPRECATED] put v1/association/:rnaId/etablissement/:id");
    return res.status(404).send({ ok: false, code: "DEPRECATED", message: "This endpoint is deprecated" });
  } catch (error) {
    next(error);
  }
});

router.get("/:rnaId", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    captureMessage("[DEPRECATED] get v1/association/:rnaId");
    return res.status(404).send({ ok: false, code: "DEPRECATED", message: "This endpoint is deprecated" });
  } catch (error) {
    next(error);
  }
});

router.post("/search", passport.authenticate(["apikey", "api"], { session: false }), async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    captureMessage("[DEPRECATED] post v1/association/search");
    return res.status(404).send({ ok: false, code: "DEPRECATED", message: "This endpoint is deprecated" });
  } catch (error) {
    next(error);
  }
});

export default router;
