import { captureException } from "@/error";
import { taskRegistry, TaskType } from "@/worker/registry";

export type QueueProvider = {
  publish(queueUrl: string, message: string): Promise<void>;
};

type PublishInput<TType extends TaskType> = {
  type: TType;
  payload: unknown;
};

export class AsyncTaskBus {
  constructor(private queueProvider: QueueProvider) {}

  async publish<TType extends TaskType>({ type, payload }: PublishInput<TType>) {
    const entry = taskRegistry[type];
    const parsedPayload = entry.schema.parse(payload);

    try {
      await this.queueProvider.publish(
        entry.queueUrl,
        JSON.stringify({
          type,
          payload: parsedPayload,
        })
      );
    } catch (error) {
      captureException(error, { extra: { taskType: type, queueUrl: entry.queueUrl } });
      throw error;
    }
  }
}
