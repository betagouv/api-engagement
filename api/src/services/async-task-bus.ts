import { taskRegistry, TaskType } from "@/worker/registry";

export type QueueProvider = {
  publish(queue: string, message: string): Promise<void>;
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

    await this.queueProvider.publish(
      entry.queue,
      JSON.stringify({
        type,
        payload: parsedPayload,
      })
    );
  }
}
