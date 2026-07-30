import { ScalewayQueueProvider } from "@/services/async-task/providers/scaleway";
import { SQSClient } from "@aws-sdk/client-sqs";
import { describe, expect, it, vi } from "vitest";

describe("ScalewayQueueProvider", () => {
  it("ignore la publication lorsque la file n'est pas configuree", async () => {
    const send = vi.spyOn(SQSClient.prototype, "send");
    const provider = new ScalewayQueueProvider();

    await provider.publish("", JSON.stringify({ type: "mission.index" }));

    expect(send).not.toHaveBeenCalled();
  });
});
