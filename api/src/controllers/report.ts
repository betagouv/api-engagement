import { Request, Response, Router } from "express";

import { ipRateLimiter } from "@/middlewares/rate-limit";

const router = Router();
router.use(ipRateLimiter);

// Endpoint décommissionné : la redirection publique vers les rapports (URL S3 présignée)
// exposait une IDOR (aucun contrôle de propriété sur le `Report` multi-tenant). La feature
// est dormante et vouée à disparaître ; on renvoie 410 Gone pour les liens encore dans la nature.
router.get("/:id", async (_req: Request, res: Response) => {
  return res.status(410).send({ ok: false, message: "This report endpoint has been decommissioned" });
});

export default router;
