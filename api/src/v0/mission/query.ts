import zod from "zod";

import { MissionType } from "@/db/core";

export const missionQuerySchema = zod.object({
  activity: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  city: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  clientId: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  country: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  createdAt: zod.string().optional(),
  departmentName: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  distance: zod.string().optional(),
  domain: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  keywords: zod.string().optional(),
  limit: zod.coerce.number().min(0).max(10000).default(25),
  lat: zod.coerce.number().optional(),
  lon: zod.coerce.number().optional(),
  openToMinors: zod.string().optional(),
  organizationRNA: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  organizationStatusJuridique: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  publisher: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  remote: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  reducedMobilityAccessible: zod.string().optional(),
  skip: zod.coerce.number().min(0).default(0),
  snu: zod.enum(["true", "false"]).transform((value) => value === "true").optional(),
  startAt: zod.string().optional(),
  type: zod.union([zod.enum(MissionType), zod.array(zod.enum(MissionType))]).optional(),
});
