import { NextFunction, Response, Router } from "express";
import passport from "passport";
import zod from "zod";

import { EMAIL_SEND_FAILED, FORBIDDEN, INVALID_BODY } from "@/error";
import { plateformRateLimiter } from "@/middlewares/rate-limit";
import { subscribeToNewsletter } from "@/services/newsletter";
import type { PublisherRequest } from "@/types/passport";
import type { PublisherRecord } from "@/types/publisher";
import type { NewsletterSubscribeResponse } from "@engagement/dto";

const router = Router();
router.use(passport.authenticate(["apikey", "api"], { session: false }));
router.use(plateformRateLimiter);

const emailSchema = zod.preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), zod.email());

const newsletterBodySchema = zod
  .object({
    email: emailSchema,
    distinctId: zod.string().trim().min(1).optional(),
  })
  .strict();

router.post("/", async (req: PublisherRequest, res: Response, next: NextFunction) => {
  try {
    const body = newsletterBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, error: body.error });
    }

    const publisher = req.user as PublisherRecord;
    const result = await subscribeToNewsletter({ ...body.data, publisherId: publisher.id });

    if (!result.ok && result.reason === "publisher_not_allowed") {
      return res
        .status(403)
        .send({ ok: false, code: FORBIDDEN, message: "Publisher not allowed to subscribe to newsletter", data: { subscribed: false } satisfies NewsletterSubscribeResponse });
    }

    if (!result.ok) {
      return res
        .status(502)
        .send({ ok: false, code: EMAIL_SEND_FAILED, message: "Newsletter subscription failed", data: { subscribed: false } satisfies NewsletterSubscribeResponse });
    }

    return res.status(200).send({ ok: true, data: { subscribed: true } satisfies NewsletterSubscribeResponse });
  } catch (error) {
    next(error);
  }
});

export default router;
