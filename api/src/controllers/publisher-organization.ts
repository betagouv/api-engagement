import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { INVALID_BODY } from "@/error";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import publisherOrganizationService from "@/services/publisher-organization";
import { UserRequest } from "@/types/passport";

const router = Router();
router.use(ipRateLimiter);

router.post("/search", passport.authenticate("admin", { session: false }), async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const body = zod
      .object({
        pairs: zod
          .array(zod.object({ publisherId: zod.string().min(1), clientId: zod.string().min(1) }))
          .min(1)
          .max(1000),
      })
      .safeParse(req.body);

    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const organizations = await publisherOrganizationService.findManyByPublisherAndClientIds(body.data.pairs);

    const data = organizations.map((organization) => ({ id: organization.id, publisherId: organization.publisherId, clientId: organization.clientId, name: organization.name }));
    return res.status(200).send({ ok: true, data, total: data.length });
  } catch (error) {
    next(error);
  }
});

export default router;
