import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { INVALID_QUERY } from "../../error";
import { missionService } from "../../services/mission";
import type { MissionSearchFilters } from "../../types/mission";
import { getPublicDepartmentStats, getPublicDomainStats, getPublicGraphStats } from "./helper";

const router = Router();

const buildMonthRanges = (year: number) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const lastMonth = year === currentYear ? currentMonth : 11;
  const ranges: Array<{ month: number; start: Date; end: Date }> = [];

  for (let m = 0; m <= lastMonth; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 1);
    ranges.push({ month: m, start, end });
  }

  return ranges;
};

const mapMissionTypeFilter = (type?: string): string[] | undefined => {
  if (type === "volontariat") {
    return ["volontariat_service_civique"];
  }
  if (type === "benevolat") {
    return ["benevolat"];
  }
  return undefined;
};

const buildBaseMissionFilters = (params: { department?: string; type?: string }): MissionSearchFilters => {
  const filters: MissionSearchFilters = {
    publisherIds: [],
    limit: 0,
    skip: 0,
    includeDeleted: true,
  };

  const missionTypes = mapMissionTypeFilter(params.type);
  if (missionTypes) {
    filters.type = missionTypes;
  }
  if (params.department) {
    filters.departmentName = [params.department];
  }

  return filters;
};

const buildMonthKey = (year: number, month: number) => {
  return `${year}-${month < 9 ? "0" : ""}${month + 1}`;
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

    const baseFilters = buildBaseMissionFilters({ department: query.data.department, type: query.data.type });
    const startOfYear = new Date(query.data.year, 0, 1);

    const [data, total] = await Promise.all([
      Promise.all(
        buildMonthRanges(query.data.year).map(async ({ month, start, end }) => {
          const docCount = await missionService.countMissions({
            ...baseFilters,
            createdAt: { lt: end },
            deletedAt: { gt: start },
          });
          return { key: buildMonthKey(query.data.year, month), doc_count: docCount };
        })
      ),
      missionService.countMissions({
        ...baseFilters,
        deletedAt: { gt: startOfYear },
      }),
    ]);

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
