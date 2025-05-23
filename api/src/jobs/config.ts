import { Queue as LetudiantQueue, schedule as LetudiantSchedule, Worker as LetudiantWorker } from "./letudiant";
import { JobConfig, JobSchedule } from "./types";

export enum QueueNames {
  LETUDIANT = "letudiant",
  // TODO: add more queues here
}

/**
 * Job configuration
 * Each job is configured with an instance of queue and a worker
 * See BullMQ documentation for more details.
 * Worker: https://docs.bullmq.io/guide/workers
 * Queue: https://docs.bullmq.io/guide/queues
 */
export const jobConfigs: Record<QueueNames, JobConfig> = {
  [QueueNames.LETUDIANT]: {
    queue: LetudiantQueue.getInstance(),
    worker: LetudiantWorker.getInstance(),
  },
  // TODO: add more queues here
};

/**
 * Scheduled Job
 * Each job is scheduled with a cron expression and a function to execute
 * See BullMQ documentation for more details.
 * https://docs.bullmq.io/guide/job-schedulers
 */
export const jobSchedules: JobSchedule[] = [
  {
    title: "L'Etudiant feed XML generation",
    cronExpression: "* * * * *", // Every minute
    function: LetudiantSchedule,
  },
];
