import type { QueueProvider } from "@/services/async-task/bus";

export class LocalQueueProvider implements QueueProvider {
  constructor(private workerUrl: string) {}

  async publish(_queueUrl: string, message: string): Promise<void> {
    const response = await fetch(`${this.workerUrl}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: message,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`[local-queue] Worker responded ${response.status}: ${body}`);
    }
  }
}
