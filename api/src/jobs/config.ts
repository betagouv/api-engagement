import { schedule as LetudiantSchedule, Worker as LetudiantWorker } from "./letudiant";

interface JobSchedule {
  title: string;
  cronExpression: string;
  function: () => Promise<any>;
}

export enum QueueNames {
  LETUDIANT = "letudiant",
  // TODO: add more queues here
}

export const jobWorkers = {
  [QueueNames.LETUDIANT]: LetudiantWorker,
  // TODO: add more workers here
};

export const jobSchedules: JobSchedule[] = [
  {
    title: "L'Etudiant feed XML generation",
    cronExpression: "* * * * *", // Every minute
    function: LetudiantSchedule,
  },
];
