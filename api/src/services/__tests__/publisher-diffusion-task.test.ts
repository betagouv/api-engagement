import { beforeEach, describe, expect, it, vi } from "vitest";

import { asyncTaskBus } from "@/services/async-task";
import { publisherDiffusionTaskService } from "@/services/publisher-diffusion-task";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publisherDiffusionTaskService", () => {
  it("publie une tâche par publisher de diffusion", async () => {
    await publisherDiffusionTaskService.enqueue(["publisher-1", "publisher-2"]);

    expect(asyncTaskBus.publish).toHaveBeenCalledWith({ type: "publisher.diffusion", payload: { publisherId: "publisher-1" } });
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({ type: "publisher.diffusion", payload: { publisherId: "publisher-2" } });
  });

  it("déduplique les publishers", async () => {
    await publisherDiffusionTaskService.enqueue(["publisher-1", "publisher-1"]);

    expect(asyncTaskBus.publish).toHaveBeenCalledTimes(1);
  });
});
