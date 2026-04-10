import { z } from "zod";

export const missionPayloadSchema = z.object({
  missionId: z.string().min(1),
});

export const missionScoringPayloadSchema = z.object({
  missionId: z.string().min(1),
  missionEnrichmentId: z.string().min(1),
  force: z.boolean().optional(),
});

export const missionEnrichmentPayloadSchema = z.object({
  missionId: z.string().min(1),
  force: z.boolean().optional(),
});

export const taskEnvelopeSchema = z.object({
  type: z.string().min(1),
  payload: z.unknown(),
});

export type TaskEnvelope = z.infer<typeof taskEnvelopeSchema>;

export type TaskRegistryEntry<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  queueUrl: string;
  schema: TSchema;
  handler: (payload: z.infer<TSchema>) => Promise<void>;
};

export const defineTask = <TSchema extends z.ZodTypeAny>(entry: TaskRegistryEntry<TSchema>) => entry;
