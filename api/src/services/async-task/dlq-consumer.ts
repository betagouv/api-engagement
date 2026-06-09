import { REGION, SCW_QUEUE_ACCESS_KEY, SCW_QUEUE_ENDPOINT, SCW_QUEUE_SECRET_KEY } from "@/config";
import { DeleteMessageCommand, GetQueueUrlCommand, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

export type ReceivedMessage = {
  receiptHandle: string;
  body: string;
};

/**
 * A consumer dedicated to Dead Letter Queues (pull mode).
 *
 * Separate from the `QueueProvider`/`asyncTaskBus` (which remains publish-only): encapsulates an SQS client
 * to read (`receive`) and acknowledge (`delete`) messages from a DLQ, and resolve its URL.
 */
export class DlqConsumer {
  private client: SQSClient;

  constructor() {
    this.client = new SQSClient({
      region: REGION,
      endpoint: SCW_QUEUE_ENDPOINT,
      credentials: {
        accessKeyId: SCW_QUEUE_ACCESS_KEY,
        secretAccessKey: SCW_QUEUE_SECRET_KEY,
      },
    });
  }

  async getQueueUrl(queueName: string): Promise<string> {
    const response = await this.client.send(new GetQueueUrlCommand({ QueueName: queueName }));
    if (!response.QueueUrl) {
      throw new Error(`[dlq-consumer] queue introuvable: ${queueName}`);
    }
    return response.QueueUrl;
  }

  async receive(queueUrl: string, max: number): Promise<ReceivedMessage[]> {
    const response = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: Math.min(Math.max(max, 1), 10),
        WaitTimeSeconds: 5,
        VisibilityTimeout: 30,
      })
    );

    return (response.Messages ?? [])
      .filter((message) => message.ReceiptHandle && message.Body !== undefined)
      .map((message) => ({ receiptHandle: message.ReceiptHandle as string, body: message.Body as string }));
  }

  async delete(queueUrl: string, receiptHandle: string): Promise<void> {
    await this.client.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle }));
  }
}
