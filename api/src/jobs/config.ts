import { Processor } from "bullmq";
import { BaseQueue } from "./base/queue";
import { LetudiantHandler, LetudiantJobPayload } from "./letudiant/handler";
import { LetudiantQueue } from "./letudiant/queue";
import { JobSchedule, WorkerConfig } from "./types";

// Instanciate handlers here
const letudiantHandler = new LetudiantHandler();

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
    title: "L'Etudiant API sync",
    cronExpression: "* */3 * * *", // Every 3 hours
    function: letudiantHandler.schedule.bind(letudiantHandler),
  },
];

/**
 * Array of all job worker configurations.
 * This will be used by the job system to initialize and start workers.
 */
export const jobWorkers: WorkerConfig[] = [
  {
    queueName: LetudiantQueue.queueName,
    processor: letudiantHandler.handle as Processor<LetudiantJobPayload>,
    name: letudiantHandler.JOB_NAME, // This worker will specifically handle "letudiant-exporter" jobs
  },
];
