import type { MissionBrowse, MissionBrowseFilters, PageBlock } from "@engagement/dto";

import { browseMissions } from "~/services/api/missions";

// Missions de chaque bloc « Missions » (clé = position du bloc) : les créneaux mis en avant, puis (option) 10 missions
// d'une page tirée au hasard parmi les 10 premières pour varier le carrousel. Dédoublonnage par id.
export async function loadMissionsByBlock(blocks: PageBlock[], request: Request): Promise<Record<number, MissionBrowse[]>> {
  const browse = async (filters: MissionBrowseFilters) => {
    try {
      return (await browseMissions(filters, request)).data;
    } catch {
      return [];
    }
  };

  const missionsByBlock: Record<number, MissionBrowse[]> = {};
  await Promise.all(
    blocks.map(async (block, index) => {
      if (block.__component !== "blocks.missions") return;

      const slots = block.slots.map(({ dispositif, domaineEngagement }) => ({
        ...(dispositif && { dispositif }),
        ...(domaineEngagement && { domaine_engagement: domaineEngagement }),
      }));
      const results = await Promise.all([
        ...slots.map((slot) => browse({ ...slot, pageSize: 1 })),
        ...(block.fillWithRandom ? [browse({ pageSize: 10, page: Math.ceil(Math.random() * 10) })] : []),
      ]);
      missionsByBlock[index] = [...new Map(results.flat().map((mission) => [mission.id, mission])).values()];
    }),
  );
  return missionsByBlock;
}
