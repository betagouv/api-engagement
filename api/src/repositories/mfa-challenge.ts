import { MfaChallenge, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

export const mfaChallengeRepository = {
  async create(params: Prisma.MfaChallengeCreateArgs): Promise<MfaChallenge> {
    return prisma.mfaChallenge.create(params);
  },

  async findUnique(params: Prisma.MfaChallengeFindUniqueArgs): Promise<MfaChallenge | null> {
    return prisma.mfaChallenge.findUnique(params);
  },

  async update(params: Prisma.MfaChallengeUpdateArgs): Promise<MfaChallenge> {
    return prisma.mfaChallenge.update(params);
  },

  async updateMany(params: Prisma.MfaChallengeUpdateManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.mfaChallenge.updateMany(params);
  },

  async deleteMany(params: Prisma.MfaChallengeDeleteManyArgs): Promise<Prisma.BatchPayload> {
    return prisma.mfaChallenge.deleteMany(params);
  },
};
