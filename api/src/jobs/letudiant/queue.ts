import { BaseQueue } from "../base/queue";
import { LetudiantJobPayload } from "./handler";

export class LetudiantQueue extends BaseQueue<LetudiantJobPayload> {
  public static readonly queueName = "letudiant-queue";

  constructor() {
    super(LetudiantQueue.queueName);
  }
}
