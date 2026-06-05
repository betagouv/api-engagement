import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { asyncTaskBus } from "@/services/async-task";
import { DlqConsumer } from "@/services/async-task/dlq-consumer";
import { taskRegistry, TaskType } from "@/worker/registry";
import { taskEnvelopeSchema } from "@/worker/types";

const LOG_PREFIX = "[process-dead-letter-queues-job]";
const DEFAULT_MAX = 1000;
const MAX_DURATION_MS = 5 * 60 * 1000;

export interface ProcessDeadLetterQueuesJobPayload {
  taskType?: string;
  max?: number;
  dryRun?: boolean;
}

export interface ProcessDeadLetterQueuesJobResult extends JobResult {
  taskType: string;
  received: number;
  replayed: number;
  skipped: number;
}

interface DrainResult {
  received: number;
  replayed: number;
  skipped: number;
  error?: string;
}

/**
 * On-demand job: Clears the DLQ of a given queue by republishing each message to the source queue.
 *
 * Pull mode (no native acknowledgment): A message is removed from the DLQ only after a successful republish.
 * A message that is unreadable, of an unknown type, or whose republish fails is retained (counted as `skipped`).
 *
 * Without `taskType`, every DLQ of the registry is drained; with `taskType`, only that queue's DLQ is.
 */
export class ProcessDeadLetterQueuesHandler implements BaseHandler<ProcessDeadLetterQueuesJobPayload, ProcessDeadLetterQueuesJobResult> {
  name = "Rejeu des Dead Letter Queues";

  async handle({ taskType, max = DEFAULT_MAX, dryRun = false }: ProcessDeadLetterQueuesJobPayload = {}): Promise<ProcessDeadLetterQueuesJobResult> {
    const base = { timestamp: new Date(), taskType: taskType ?? "all", received: 0, replayed: 0, skipped: 0 };

    if (taskType && !(taskType in taskRegistry)) {
      const message = `taskType invalide: ${taskType} — attendu l'un de [${Object.keys(taskRegistry).join(", ")}]`;
      console.error(`${LOG_PREFIX} ${message}`);
      return { ...base, success: false, message };
    }

    const types = (taskType ? [taskType] : Object.keys(taskRegistry)) as TaskType[];
    const consumer = new DlqConsumer();

    let received = 0;
    let replayed = 0;
    let skipped = 0;
    let hadError = false;
    const parts: string[] = [];

    for (const type of types) {
      const result = await this.drainQueue(type, consumer, { max, dryRun });
      received += result.received;
      replayed += result.replayed;
      skipped += result.skipped;
      if (result.error) {
        hadError = true;
      }
      parts.push(`${type}: ${result.replayed} rejoués / ${result.skipped} ignorés / ${result.received} reçus${result.error ? ` (${result.error})` : ""}`);
    }

    const message = `${parts.join(" | ")}${dryRun ? " (dry-run)" : ""}`;
    console.log(`${LOG_PREFIX} done — ${message}`);

    return { ...base, success: !hadError && skipped === 0, received, replayed, skipped, message };
  }

  private async drainQueue(type: TaskType, consumer: DlqConsumer, { max, dryRun }: { max: number; dryRun: boolean }): Promise<DrainResult> {
    const sourceUrl = taskRegistry[type].queueUrl;
    if (!sourceUrl) {
      console.error(`${LOG_PREFIX} URL de la queue source non configurée pour ${type}`);
      return { received: 0, replayed: 0, skipped: 0, error: "queue source non configurée" };
    }

    const dlqName = `${sourceUrl.split("/").pop()}-dlq`;

    let dlqUrl: string;
    try {
      dlqUrl = await consumer.getQueueUrl(dlqName);
    } catch (error) {
      console.error(`${LOG_PREFIX} DLQ introuvable: ${dlqName}`, error);
      captureException(error, { extra: { taskType: type, dlqName } });
      return { received: 0, replayed: 0, skipped: 0, error: `DLQ introuvable: ${dlqName}` };
    }

    console.log(`${LOG_PREFIX} drain ${dlqName} → ${type} (max: ${max}, dryRun: ${dryRun})`);

    let received = 0;
    let replayed = 0;
    let skipped = 0;
    const start = Date.now();

    while (received < max && Date.now() - start < MAX_DURATION_MS) {
      const batch = await consumer.receive(dlqUrl, max - received);
      if (batch.length === 0) {
        break;
      }

      for (const message of batch) {
        received++;
        try {
          const envelope = taskEnvelopeSchema.parse(JSON.parse(message.body));

          if (!(envelope.type in taskRegistry)) {
            skipped++;
            console.warn(`${LOG_PREFIX} type inconnu, message conservé: ${envelope.type}`);
            continue;
          }

          const targetType = envelope.type as TaskType;
          const payload = taskRegistry[targetType].schema.parse(envelope.payload);

          console.log(payload);

          if (dryRun) {
            continue;
          }

          await asyncTaskBus.publish({ type: targetType, payload });
          await consumer.delete(dlqUrl, message.receiptHandle);
          replayed++;
        } catch (error) {
          skipped++;
          console.error(`${LOG_PREFIX} échec rejeu, message conservé`, error);
          captureException(error, { extra: { taskType: type, dlqName } });
        }
      }
    }

    return { received, replayed, skipped };
  }
}
