import { Queue } from "bullmq";
import { redisConnection } from "../../db/redis";

/**
 * Classe de base pour toutes les queues
 * Implémente le pattern singleton et fournit des méthodes communes
 */
export abstract class BaseQueue {
  protected queue: Queue;
  protected queueName: string;

  protected constructor(queueName: string) {
    this.queueName = queueName;
    this.queue = new Queue(queueName, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: {
          age: 7 * 24 * 3600, // Garder les jobs complétés pendant 7 jours
          count: 100, // Garder les 100 derniers jobs
        },
        removeOnFail: false, // Garder les jobs échoués pour diagnostic
      },
    });
  }

  public getQueue(): Queue {
    return this.queue;
  }

  /**
   * Ajoute un job à la queue
   * @param name Nom du job
   * @param data Données du job
   * @param options Options du job
   */
  public async addJob(name: string, data: any, options: any = {}): Promise<any> {
    return this.queue.add(name, data, options);
  }

  /**
   * Planifie un job récurrent
   * @param name Nom du job
   * @param data Données du job
   * @param cronExpression Expression cron pour la planification
   * @param jobId ID unique pour le job récurrent (pour pouvoir le retrouver/supprimer)
   */
  public async scheduleRecurringJob(name: string, data: any, cronExpression: string, jobId: string): Promise<any> {
    return this.queue.add(name, data, {
      jobId,
      repeat: {
        pattern: cronExpression,
      },
    });
  }
}
