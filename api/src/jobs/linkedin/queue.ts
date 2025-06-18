import { BaseQueue } from "../base/queue";
import { LinkedinJobPayload } from "./handler";

export class LinkedinQueue extends BaseQueue<LinkedinJobPayload> {
  public static readonly queueName = "linkedin-queue";

  constructor() {
    super(LinkedinQueue.queueName);
  }
}
