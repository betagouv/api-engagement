import { Router } from "express";
import zod from "zod";

import { INVALID_BODY } from "@/error";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import { slackSignatureSecurity } from "@/middlewares/slack-signature";
import { dispatchInteraction } from "@/services/slack-interactions";

const router = Router();
router.use(ipRateLimiter);

// Slack envoie les interactions en form-urlencoded, avec un champ `payload` qui contient du JSON.
const payloadSchema = zod.object({
  type: zod.string(),
  user: zod.object({ id: zod.string() }),
  response_url: zod.string().url(),
  actions: zod.array(zod.object({ action_id: zod.string(), value: zod.string().optional() })).default([]),
});

// Point d'entrée unique de l'Interactivity de la Slack app : chaque action est routée vers son handler (voir services/slack-interactions).
router.post("/interactions", slackSignatureSecurity, async (req, res, next) => {
  try {
    let json: unknown;
    try {
      json = JSON.parse(String(req.body?.payload));
    } catch {
      return res.status(400).send({ ok: false, code: INVALID_BODY });
    }
    const payload = payloadSchema.safeParse(json);
    if (!payload.success) {
      return res.status(400).send({ ok: false, code: INVALID_BODY, message: payload.error });
    }
    if (payload.data.type === "block_actions") {
      const context = {
        slackUserId: payload.data.user.id,
        responseUrl: payload.data.response_url,
      };
      for (const { action_id: actionId, value } of payload.data.actions) {
        await dispatchInteraction({ actionId, value }, context);
      }
    }
    return res.status(200).send();
  } catch (error) {
    next(error);
  }
});

export default router;
