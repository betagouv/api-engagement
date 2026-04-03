import { REGION, SCW_ACCESS_KEY, SCW_SECRET_KEY } from "@/config";
import type { QueueProvider } from "@/services/async-task/bus";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

export class ScalewayQueueProvider implements QueueProvider {
  private client: SQSClient;

  constructor() {
    this.client = new SQSClient({
      region: REGION,
      endpoint: process.env.SCW_QUEUE_ENDPOINT,
      credentials: {
        accessKeyId: SCW_ACCESS_KEY ?? "",
        secretAccessKey: SCW_SECRET_KEY ?? "",
      },
    });
  }

  async publish(queueUrl: string, message: string): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: message,
      })
    );
  }
}
