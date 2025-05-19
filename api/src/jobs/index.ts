import { Worker } from "bullmq";
import { redisConnection } from "../db/redis";
import { captureException } from "../error";
import { jobHandlers } from "./config";

// Workers créés lors de l'initialisation
let workers: Worker[] = [];

/**
 * Initialise le système de jobs asynchrones
 */
export async function initializeJobSystem() {
  try {
    // Créer les workers pour chaque queue
    workers = Object.entries(jobHandlers).map(([queueName, handler]) => {
      console.log(`[Jobs] Creating worker for queue ${queueName}`);

      const worker = new Worker(queueName, handler, {
        connection: redisConnection,
        concurrency: 1, // Par défaut, un seul job à la fois
        autorun: false, // Ne pas démarrer automatiquement
      });

      // Gestion des événements communs
      worker.on("completed", (job) => {
        console.log(`[${queueName}] Job ${job.id} completed successfully`);
      });

      worker.on("failed", (job, error) => {
        console.error(`[${queueName}] Job ${job?.id} failed:`, error);
        captureException(error);
      });

      return worker;
    });

    // Démarrer les workers
    await startWorkers();

    console.log("Job system initialized successfully");

    return {
      workers,
      stopWorkers,
    };
  } catch (error) {
    console.error("Failed to initialize job system:", error);
    throw error;
  }
}

/**
 * Démarre tous les workers enregistrés
 */
export async function startWorkers(): Promise<Worker[]> {
  for (const worker of workers) {
    await worker.run();
    console.log(`[Jobs] Started worker for queue ${worker.name}`);
  }

  console.log(`[Jobs] Started ${workers.length} workers`);
  return workers;
}

/**
 * Arrête tous les workers enregistrés
 */
export async function stopWorkers(): Promise<void> {
  for (const worker of workers) {
    await worker.close();
    console.log(`[Jobs] Stopped worker for queue ${worker.name}`);
  }

  console.log(`[Jobs] Stopped ${workers.length} workers`);
}
