import { Prisma } from "../db/core";
import { statsBotRepository } from "../repositories/stats-bot";
import { StatsBotCreateInput, StatsBotRecord, StatsBotSearchParams } from "../types/stats-bot";
import { normalizeOptionalString } from "../utils/normalize";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const buildSearchWhere = (params: StatsBotSearchParams): Prisma.StatsBotWhereInput => {
  const and: Prisma.StatsBotWhereInput[] = [];

  if (params.user) {
    const user = params.user.trim();
    if (user) {
      and.push({ user: { contains: user, mode: "insensitive" } });
    }
  }

  if (!and.length) {
    return {};
  }
  return { AND: and };
};

export const statsBotService = {
  async findStatsBotByUser(user: string): Promise<StatsBotRecord | null> {
    if (!user) {
      return null;
    }
    return statsBotRepository.findUnique({
      where: { user: user.trim() },
    });
  },

  async findStatsBots(params: StatsBotSearchParams = {}): Promise<StatsBotRecord[]> {
    const where = buildSearchWhere(params);
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(params.offset ?? 0, 0);

    const statsBots = await statsBotRepository.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return statsBots;
  },

  async createStatsBot(input: StatsBotCreateInput): Promise<StatsBotRecord> {
    const user = normalizeOptionalString(input.user);
    if (!user) {
      throw new Error("StatsBot user is required");
    }

    try {
      return await statsBotRepository.create({
        data: {
          user: user.trim(),
          origin: normalizeOptionalString(input.origin) ?? null,
          referer: normalizeOptionalString(input.referer) ?? null,
          userAgent: normalizeOptionalString(input.userAgent) ?? null,
          host: normalizeOptionalString(input.host) ?? null,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
        throw new Error("StatsBot with this user already exists");
      }
      throw error;
    }
  },

  async deleteStatsBotByUser(user: string): Promise<void> {
    await statsBotRepository.deleteMany({
      where: { user: user.trim() },
    });
  },
};
