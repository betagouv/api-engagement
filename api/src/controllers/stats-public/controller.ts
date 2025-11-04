import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { INVALID_QUERY } from "../../error";
import MissionModel from "../../models/mission";
import { getPublicDepartmentStats, getPublicDomainStats, getPublicGraphStats } from "./helper";

const router = Router();

const buildMonthFacets = (year: number) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const facets = {} as { [key: string]: any[] };
  const lastMonth = year === currentYear ? currentMonth : 11;

  for (let m = 0; m <= lastMonth; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 1);
    facets[m] = [
      {
        $match: {
          createdAt: { $lt: end },
          $or: [{ deletedAt: { $gte: start } }, { deleted: false }],
        },
      },
      { $count: "doc_count" },
    ];
  }

  return facets;
};

router.get("/graph-stats", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        department: zod.string().optional(),
        type: zod.string().optional(),
        year: zod.coerce.number().optional().default(new Date().getFullYear()),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const data = await getPublicGraphStats({
      department: query.data.department,
      type: query.data.type,
      year: query.data.year,
    });

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/graph-missions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        department: zod.string().optional(),
        type: zod.string().optional(),
        year: zod.coerce.number().optional().default(new Date().getFullYear()),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const whereMissions = {} as { [key: string]: any };

    if (query.data.department) {
      whereMissions.departmentName = query.data.department;
    }

    if (query.data.type === "volontariat") {
      whereMissions.publisherName = "Service Civique";
    } else if (query.data.type === "benevolat") {
      whereMissions.publisherName = { $ne: "Service Civique" };
    }

    if (query.data.year) {
      whereMissions.$or = [{ deletedAt: { $gte: new Date(query.data.year, 0, 1) } }, { deleted: false }];
    }

    const $facet = buildMonthFacets(query.data.year);

    const missionFacets = await MissionModel.aggregate([{ $match: whereMissions }, { $facet }]);
    const total = await MissionModel.countDocuments(whereMissions);
    const data = Object.entries(missionFacets[0]).map(([m, value]) => {
      const month = parseInt(m, 10);
      return {
        key: `${query.data.year}-${month < 9 ? "0" : ""}${month + 1}`,
        doc_count: Array.isArray(value) && value.length ? value[0].doc_count || 0 : 0,
      };
    });

    return res.status(200).send({ ok: true, data, total });
  } catch (error) {
    next(error);
  }
});

router.get("/domains", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        department: zod.string().optional(),
        type: zod.string().optional(),
        year: zod.coerce.number().optional().default(new Date().getFullYear()),
      })
      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const data = await getPublicDomainStats({
      department: query.data.department,
      type: query.data.type,
      year: query.data.year,
    });

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/departments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        year: zod.coerce.number().optional().default(new Date().getFullYear()),
        type: zod.string().optional(),
      })

      .safeParse(req.query);

    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, error: query.error });
    }

    const data = await getPublicDepartmentStats({
      type: query.data.type,
      year: query.data.year,
    });

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
