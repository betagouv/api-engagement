import { MissionDiffusionRebuildHandler } from "@/jobs/mission-diffusion-rebuild/handler";

export const handlePublisherDiffusion = async (payload: { publisherId: string }) => {
  const startedAt = Date.now();
  console.log(`[publisher.diffusion] start publisherId=${payload.publisherId}`);

  try {
    const result = await new MissionDiffusionRebuildHandler().handle({ publisherId: payload.publisherId });
    console.log(`[publisher.diffusion] done publisherId=${payload.publisherId} +${result?.added}/-${result?.removed} durationMs=${Date.now() - startedAt}`);
  } catch (error) {
    console.error(`[publisher.diffusion] failed publisherId=${payload.publisherId} durationMs=${Date.now() - startedAt}`);
    throw error;
  }
};
