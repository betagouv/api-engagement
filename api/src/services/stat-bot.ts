import { Prisma } from "../db/core";
import { statBotRepository } from "../repositories/stat-bot";
import { StatBotCreateInput, StatBotRecord, StatBotSearchParams } from "../types/stat-bot";
import { normalizeOptionalString } from "../utils/normalize";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const buildSearchWhere = (params: StatBotSearchParams): Prisma.StatBotWhereInput => {
  const and: Prisma.StatBotWhereInput[] = [];

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

export const statBotService = {
  async findStatBotByUser(user: string): Promise<StatBotRecord | null> {
    if (!user) {
      return null;
    }
    return statBotRepository.findUnique({
      where: { user: user.trim() },
    });
  },

  async findStatBots(params: StatBotSearchParams = {}): Promise<StatBotRecord[]> {
    const where = buildSearchWhere(params);
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(params.offset ?? 0, 0);

    const statBots = await statBotRepository.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return statBots;
  },

  async createStatBot(input: StatBotCreateInput): Promise<StatBotRecord> {
    const user = normalizeOptionalString(input.user);
    if (!user) {
      throw new Error("StatBot user is required");
    }

    try {
      return await statBotRepository.create({
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
        throw new Error("StatBot with this user already exists");
      }
      throw error;
    }
  },

  async deleteStatBotByUser(user: string): Promise<void> {
    await statBotRepository.deleteMany({
      where: { user: user.trim() },
    });
  },
};
