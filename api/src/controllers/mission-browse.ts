import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { INVALID_QUERY, SERVICE_UNAVAILABLE, captureException } from "@/error";
import { MissionBrowseIndexUnavailableError, missionBrowseService } from "@/services/mission-browse";
import { INDEXED_TAXONOMY_KEYS } from "@/services/search/collections/missions/fields";

const router = Router();

const stringOrStringArraySchema = zod.union([zod.string(), zod.array(zod.string())]);

const taxonomyQueryShape = Object.fromEntries(INDEXED_TAXONOMY_KEYS.map((key) => [key, stringOrStringArraySchema.optional()]));

const browseQuerySchema = zod.object({
  publisherId: zod.string().optional(),
  departmentCode: stringOrStringArraySchema.optional(),
  ...taxonomyQueryShape,
  page: zod.coerce.number().int().positive().default(1),
  pageSize: zod.coerce.number().int().positive().max(100).default(20),
});

router.get("/browse", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = browseQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }
    const result = await missionBrowseService.browse(query.data);
    return res.status(200).send({ ok: true, ...result });
  } catch (error) {
    if (error instanceof MissionBrowseIndexUnavailableError) {
      captureException(error);
      return res.status(503).send({ ok: false, code: SERVICE_UNAVAILABLE, message: "Mission browse index is unavailable" });
    }
    next(error);
  }
});

export default router;
