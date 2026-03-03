import zod from "zod";

const addressSchema = zod.object({
  street: zod.string().optional(),
  postalCode: zod.string().optional(),
  city: zod.string().optional(),
  departmentCode: zod.string().optional(),
  departmentName: zod.string().optional(),
  region: zod.string().optional(),
  country: zod.string().optional(),
});

const orgFields = {
  organizationClientId: zod.string().optional(),
  organizationName: zod.string().optional(),
  organizationDescription: zod.string().optional(),
  organizationUrl: zod.string().optional(),
  organizationType: zod.string().optional(),
  organizationLogo: zod.string().optional(),
  organizationRNA: zod.string().optional(),
  organizationSiren: zod.string().optional(),
  organizationSiret: zod.string().optional(),
  organizationFullAddress: zod.string().optional(),
  organizationPostCode: zod.string().optional(),
  organizationCity: zod.string().optional(),
  organizationDepartment: zod.string().optional(),
  organizationDepartmentCode: zod.string().optional(),
  organizationDepartmentName: zod.string().optional(),
  organizationStatusJuridique: zod.string().optional(),
  organizationBeneficiaries: zod.array(zod.string()).optional(),
  organizationActions: zod.array(zod.string()).optional(),
  organizationReseaux: zod.array(zod.string()).optional(),
};

const ORG_FIELD_KEYS = Object.keys(orgFields) as Array<keyof typeof orgFields>;

const missionBaseFields = {
  title: zod.string().optional(),
  description: zod.string().optional(),
  applicationUrl: zod.string().optional(),
  domain: zod.string().optional(),
  activities: zod.array(zod.string()).optional(),
  tags: zod.array(zod.string()).optional(),
  tasks: zod.array(zod.string()).optional(),
  audience: zod.array(zod.string()).optional(),
  requirements: zod.array(zod.string()).optional(),
  softSkills: zod.array(zod.string()).optional(),
  romeSkills: zod.array(zod.string()).optional(),
  remote: zod.enum(["no", "possible", "full"]).optional(),
  schedule: zod.string().optional(),
  startAt: zod.coerce.date().optional(),
  endAt: zod.coerce.date().optional(),
  priority: zod.string().optional(),
  places: zod.number().int().positive().optional(),
  compensationAmount: zod.number().optional(),
  compensationUnit: zod.enum(["hour", "day", "month", "year"]).optional(),
  compensationType: zod.enum(["gross", "net"]).optional(),
  openToMinors: zod.boolean().optional(),
  reducedMobilityAccessible: zod.boolean().optional(),
  closeToTransport: zod.boolean().optional(),
  addresses: zod.array(addressSchema).optional(),
  type: zod.enum(["benevolat", "volontariat_service_civique", "volontariat_sapeurs_pompiers"]).optional(),
  ...orgFields,
};

const orgNameRequiredRefinement = <T extends Record<string, unknown>>(data: T, ctx: zod.RefinementCtx) => {
  const hasOrgField = ORG_FIELD_KEYS.some((key) => key !== "organizationName" && data[key] !== undefined);
  if (hasOrgField && !data.organizationName) {
    ctx.addIssue({
      code: zod.ZodIssueCode.custom,
      message: "organizationName is required when any organization field is provided",
      path: ["organizationName"],
    });
  }
};

export const missionCreateSchema = zod
  .object({
    clientId: zod.string(),
    ...missionBaseFields,
    title: zod.string(),
  })
  .superRefine(orgNameRequiredRefinement);

export const missionUpdateSchema = zod
  .object({
    ...missionBaseFields,
  })
  .superRefine(orgNameRequiredRefinement);

export const missionClientIdParamSchema = zod.object({
  clientId: zod.string(),
});

export type MissionCreateBody = zod.infer<typeof missionCreateSchema>;
export type MissionUpdateBody = zod.infer<typeof missionUpdateSchema>;
