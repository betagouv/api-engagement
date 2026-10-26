import { Router } from "express";
import zod from "zod";

import { captureException, INVALID_BODY } from "@/error";
import { ipRateLimiter } from "@/middlewares/rate-limit";
import { slackSignatureSecurity } from "@/middlewares/slack-signature";
import { respondEphemeral } from "@/services/slack";
import { dispatchInteraction, type SlackInteractionContext } from "@/services/slack/interactions";

const processActions = async (actions: { action_id: string; value?: string }[], context: SlackInteractionContext) => {
  try {
    for (const { action_id: actionId, value } of actions) {
      await dispatchInteraction({ actionId, value }, context);
    }
  } catch (error) {
    captureException(error, { extra: { slackUserId: context.slackUserId } });
    await respondEphemeral(context.responseUrl, "Une erreur est survenue, réessayez dans un instant.").catch(() => undefined);
  }
};

const router = Router();
router.use(ipRateLimiter);

// Slack envoie les interactions en form-urlencoded, avec un champ `payload` qui contient du JSON.
const payloadSchema = zod.object({
  type: zod.string(),
  user: zod.object({ id: zod.string() }),
  response_url: zod.string().url(),
  actions: zod.array(zod.object({ action_id: zod.string(), value: zod.string().optional() })).default([]),
});

// Point d'entrée unique de l'Interactivity de la Slack app : chaque action est routée vers son handler (voir services/slack/interactions).
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
    // Slack exige un acquittement sous 3 s : on répond tout de suite, le traitement et ses erreurs ne dépendent plus de la réponse HTTP.
    res.status(200).send();
    if (payload.data.type === "block_actions") {
      const context = { slackUserId: payload.data.user.id, responseUrl: payload.data.response_url };
      void processActions(payload.data.actions, context);
    }
    return;
  } catch (error) {
    next(error);
  }
});

export default router;
