import { Worker } from "bullmq";
import { redisConnection } from "../../db/redis";
import { captureException } from "../../error";

/**
 * Classe de base pour tous les workers
 * Implémente le pattern singleton et fournit des méthodes communes
 */
export abstract class BaseWorker {
  protected worker: Worker;
  protected queueName: string;
  protected workerName: string;

  protected static instance: BaseWorker;

  protected constructor(queueName: string, workerName: string, processor: (job: any) => Promise<any>) {
    this.queueName = queueName;
    this.workerName = workerName;

    this.worker = new Worker(queueName, processor, {
      connection: redisConnection,
      concurrency: 1, // Par défaut, un seul job à la fois
      autorun: false, // Ne pas démarrer automatiquement
    });

    // Gestion des événements communs
    this.worker.on("completed", (job) => {
      console.log(`[${this.workerName}] Job ${job.id} completed successfully`);
    });

    this.worker.on("failed", (job, error) => {
      console.error(`[${this.workerName}] Job ${job?.id} failed:`, error);
      captureException(error);
    });
  }

  // Démarrer le worker
  public async start(): Promise<void> {
    await this.worker.run();
    console.log(`[${this.workerName}] Started worker for queue ${this.queueName}`);
  }

  // Arrêter le worker
  public async stop(): Promise<void> {
    await this.worker.close();
    console.log(`[${this.workerName}] Stopped worker for queue ${this.queueName}`);
  }
}
