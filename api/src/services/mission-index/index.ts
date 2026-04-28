import { TYPESENSE_MISSION_COLLECTION } from "@/config";
import { prisma } from "@/db/postgres";
import { typesenseClient } from "@/services/typesense/client";

export interface MissionIndexDocument {
  id: string;
  publisherId: string;
  departmentCodes: string[];
  // TODO: résoudre les clés taxonomiques via packages/taxonomy (les tables taxonomy/taxonomyValue sont amenées à disparaître)
  domaine: string[];
  engagement_intent: string[];
  type_mission: string[];
  tranche_age: string[];
}

const missionCollection = () => typesenseClient.collections<MissionIndexDocument>(TYPESENSE_MISSION_COLLECTION);

export const missionIndexService = {
  async upsert(missionId: string): Promise<void> {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        publisherId: true,
        deletedAt: true,
        addresses: {
          select: { departmentCode: true },
        },
        missionScorings: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            missionScoringValues: {
              where: { score: { gt: 0 } },
              select: { score: true, taxonomyValueId: true },
            },
          },
        },
      },
    });

    if (!mission || mission.deletedAt !== null) {
      await this.delete(missionId);
      return;
    }

    const departmentCodes = [...new Set(mission.addresses.map((a) => a.departmentCode).filter((c): c is string => c !== null && c !== undefined))];

    // TODO: résoudre les clés taxonomiques depuis packages/taxonomy
    // Pour l'instant les facets taxonomy sont vides en attendant la migration
    const document: MissionIndexDocument = {
      id: mission.id,
      publisherId: mission.publisherId ?? "",
      departmentCodes,
      domaine: [],
      engagement_intent: [],
      type_mission: [],
      tranche_age: [],
    };

    await missionCollection().documents().upsert(document);
  },

  async delete(missionId: string): Promise<void> {
    try {
      await missionCollection().documents(missionId).delete();
    } catch (err: unknown) {
      if ((err as { httpStatus?: number }).httpStatus !== 404) {throw err;}
    }
  },
};
