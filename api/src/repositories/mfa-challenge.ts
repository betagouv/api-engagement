import { MfaChallenge, Prisma } from "@/db/core";
import { prisma } from "@/db/postgres";

export const mfaChallengeRepository = {
  async create(params: Prisma.MfaChallengeCreateArgs): Promise<MfaChallenge> {
    return prisma.mfaChallenge.create(params);
  },

  async findUnique(params: Prisma.MfaChallengeFindUniqueArgs): Promise<MfaChallenge | null> {
    return prisma.mfaChallenge.findUnique(params);
  },

  async count(params: Prisma.MfaChallengeCountArgs = {}): Promise<number> {
    return prisma.mfaChallenge.count(params);
  },

  async sumAttempts(where: Prisma.MfaChallengeWhereInput): Promise<number> {
    const result = await prisma.mfaChallenge.aggregate({ _sum: { attemptCount: true }, where });
    return result._sum.attemptCount ?? 0;
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
