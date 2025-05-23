import { BaseQueue, BaseWorker } from "./base";

export interface JobSchedule {
  title: string;
  cronExpression: string;
  function: (cronExpression: string) => Promise<any>;
}

export interface JobConfig {
  queue: BaseQueue;
  worker: BaseWorker;
}
