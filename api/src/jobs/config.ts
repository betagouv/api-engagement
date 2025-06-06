import { Processor } from "bullmq";
import { BaseQueue } from "./base";
import { LetudiantHandler, LetudiantJobPayload } from "./letudiant/handler";
import { LetudiantQueue } from "./letudiant/queue";
import { JobSchedule, WorkerConfig } from "./types";

export const queues: BaseQueue<any>[] = [
  new LetudiantQueue(),
  // TODO: init more Queues here
];

/**
 * Array of scheduled jobs.
 * These are scheduled in `server-scheduler.ts`
 */
export const jobSchedules: JobSchedule[] = [
  {
    title: "L'Etudiant feed XML generation",
    cronExpression: "* * * * *", // Every minute
    function: LetudiantHandler.schedule,
  },
];

/**
 * Array of all job worker configurations.
 * This will be used by the job system to initialize and start workers.
 */
export const jobWorkers: WorkerConfig[] = [
  {
    queueName: LetudiantQueue.queueName,
    processor: LetudiantHandler.handle as Processor<LetudiantJobPayload>,
    name: LetudiantHandler.JOB_NAME, // This worker will specifically handle "letudiant-exporter" jobs
  },
];
