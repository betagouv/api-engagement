import { handler as LetudiantHandler } from "./letudiant";

export enum QueueNames {
  LETUDIANT = "letudiant",
  // TODO: add more queues here
}

export const jobHandlers = {
  [QueueNames.LETUDIANT]: LetudiantHandler,
  // TODO: add more handlers here
};
