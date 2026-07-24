import { missionDiffusionService } from "@/services/mission-diffusion";

export const handlePublisherDiffusion = async (payload: { publisherId: string }) => {
  console.log(`[publisher.diffusion] start publisherId=${payload.publisherId}`);
  const result = await missionDiffusionService.enqueueChangedMissionsForDistributionPublisher(payload.publisherId);
  console.log(
    `[publisher.diffusion] done publisherId=${payload.publisherId} desired=${result.desired} queued=${result.queued} added=${result.added} removed=${result.removed}`
  );
};
