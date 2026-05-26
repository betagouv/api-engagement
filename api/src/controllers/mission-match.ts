import { Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_QUERY } from "@/error";
import { missionMatchService } from "@/services/mission-match";

const router = Router();
router.use(passport.authenticate(["apikey", "api"], { session: false }));

const matchQuerySchema = zod.object({
  userScoringId: zod.string().uuid(),
  limit: zod.coerce.number().int().min(1).max(100).default(20),
  offset: zod.coerce.number().int().min(0).default(0),
});

router.get("/match", async (req, res, next) => {
  try {
    const query = matchQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }
    const data = await missionMatchService.getMatchedMissions(query.data);
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
