import { asyncTaskBus } from "@/services/async-task";

export const publisherDiffusionTaskService = {
  async enqueue(distributionPublisherIds: string[]): Promise<void> {
    const publisherIds = Array.from(new Set(distributionPublisherIds));
    await Promise.all(publisherIds.map((publisherId) => asyncTaskBus.publish({ type: "publisher.diffusion", payload: { publisherId } })));
  },
};
