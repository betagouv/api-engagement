import zod from "zod";

import { parseDateFilter } from "@/v0/mission/utils";

const activitySchema = zod.string();
const booleanSchema = zod.boolean();
const missionRemoteSchema = zod.enum(["no", "possible", "full", "local"]);
const missionTypeSchema = zod.enum(["benevolat", "volontariat_service_civique", "volontariat_sapeurs_pompiers", "volontariat_reserve_operationnelle"]);
const stringSchema = zod.string();

const addressSchema = zod.object({
  street: stringSchema.optional(),
  postalCode: stringSchema.optional(),
  city: stringSchema.optional(),
  departmentCode: stringSchema.optional(),
  departmentName: stringSchema.optional(),
  region: stringSchema.optional(),
  country: stringSchema.optional(),
  location: zod.object({ lat: zod.number().min(-90).max(90), lon: zod.number().min(-180).max(180) }).nullish(),
});

const organizationFields = {
  organizationClientId: stringSchema,
  organizationName: stringSchema,
  organizationDescription: stringSchema,
  organizationUrl: stringSchema,
  organizationType: stringSchema,
  organizationLogo: stringSchema,
  organizationRNA: stringSchema,
  organizationSiren: stringSchema,
  organizationSiret: stringSchema,
  organizationFullAddress: stringSchema,
  organizationPostCode: stringSchema,
  organizationCity: stringSchema,
  organizationDepartment: stringSchema,
  organizationDepartmentCode: stringSchema,
  organizationDepartmentName: stringSchema,
  organizationStatusJuridique: stringSchema,
  organizationBeneficiaries: zod.array(stringSchema),
  organizationActions: zod.array(stringSchema),
  organizationReseaux: zod.array(stringSchema),
};

const missionWritableFields = {
  clientId: stringSchema,
  title: stringSchema,
  description: stringSchema,
  applicationUrl: stringSchema,
  image: stringSchema,
  metadata: stringSchema,
  postedAt: zod.coerce.date(),
  domain: stringSchema,
  activities: zod.array(activitySchema),
  tags: zod.array(stringSchema),
  tasks: zod.array(stringSchema),
  audience: zod.array(stringSchema),
  requirements: zod.array(stringSchema),
  softSkills: zod.array(stringSchema),
  romeSkills: zod.array(stringSchema),
  remote: missionRemoteSchema,
  schedule: stringSchema,
  startAt: zod.coerce.date(),
  endAt: zod.coerce.date(),
  priority: stringSchema,
  places: zod.number().int().positive(),
  compensationAmount: zod.number(),
  compensationAmountMax: zod.number().min(0),
  compensationUnit: zod.enum(["hour", "day", "month", "year"]),
  compensationType: zod.enum(["gross", "net"]),
  openToMinors: booleanSchema,
  reducedMobilityAccessible: booleanSchema,
  closeToTransport: booleanSchema,
  addresses: zod.array(addressSchema),
  type: missionTypeSchema,
  ...organizationFields,
};

const organizationFieldNames = Object.keys(organizationFields) as Array<keyof typeof organizationFields>;

const requireOrganizationName = <T extends Record<string, unknown>>(data: T, ctx: zod.RefinementCtx) => {
  const hasOrganizationField = organizationFieldNames.some((key) => key !== "organizationName" && data[key] !== undefined);
  if (hasOrganizationField && !data.organizationName) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: "organizationName is required when any organization field is provided",
      path: ["organizationName"],
    });
  }
};

const optionalMissionWritableSchema = zod.object(missionWritableFields).partial();

export const missionCreateSchema = optionalMissionWritableSchema
  .extend({
    clientId: missionWritableFields.clientId,
    title: missionWritableFields.title,
  })
  .superRefine(requireOrganizationName);

export const missionUpdateSchema = optionalMissionWritableSchema.omit({ clientId: true }).superRefine(requireOrganizationName);

export const missionClientIdParamSchema = zod.object({
  clientId: missionWritableFields.clientId,
});

const booleanQuerySchema = (schema: zod.ZodBoolean) =>
  zod.preprocess((value) => {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    return value;
  }, schema.optional());

const arrayQuerySchema = <T extends zod.ZodType>(schema: T) => zod.preprocess((value) => (typeof value === "string" ? [value] : value), zod.array(schema).optional());

export const missionListQuerySchema = zod
  .object({
    activities: arrayQuerySchema(activitySchema),
    city: arrayQuerySchema(stringSchema),
    clientId: missionWritableFields.clientId.optional(),
    country: arrayQuerySchema(stringSchema),
    createdAt: stringSchema.optional(),
    cursor: stringSchema.min(1).max(256).optional(),
    departmentName: arrayQuerySchema(stringSchema),
    distance: stringSchema.optional(),
    domain: missionWritableFields.domain.optional(),
    keywords: stringSchema.optional(),
    limit: zod.coerce.number().int().min(1).default(25),
    lat: zod.coerce.number().optional(),
    lon: zod.coerce.number().optional(),
    openToMinors: booleanQuerySchema(missionWritableFields.openToMinors),
    organizationRNA: arrayQuerySchema(organizationFields.organizationRNA),
    organizationStatusJuridique: arrayQuerySchema(organizationFields.organizationStatusJuridique),
    publisherId: stringSchema.optional(),
    reducedMobilityAccessible: booleanQuerySchema(missionWritableFields.reducedMobilityAccessible),
    remote: missionWritableFields.remote.optional(),
    startAt: stringSchema.optional(),
    type: missionWritableFields.type.optional(),
    updatedAt: stringSchema.refine((value) => parseDateFilter(value)?.gt !== undefined, { message: "updatedAt doit utiliser le format gt:<date ISO>" }).optional(),
  })
  .strict();
