import { Prisma, WarningBot as PrismaWarningBot } from "@/db/core";
import { warningBotRepository } from "@/repositories/warning-bot";
import type { WarningBotCreateInput, WarningBotRecord, WarningBotUpdatePatch } from "@/types/warning-bot";

type WarningBotWithPublisher = PrismaWarningBot & {
  publisher: {
    name: string;
  } | null;
};

const toWarningBotRecord = (warningBot: PrismaWarningBot | WarningBotWithPublisher): WarningBotRecord => ({
  id: warningBot.id,
  hash: warningBot.hash,
  userAgent: warningBot.userAgent,
  printCount: warningBot.printCount,
  clickCount: warningBot.clickCount,
  applyCount: warningBot.applyCount,
  accountCount: warningBot.accountCount,
  publisherId: warningBot.publisherId,
  publisherName: "publisher" in warningBot && warningBot.publisher ? warningBot.publisher.name : null,
  createdAt: warningBot.createdAt,
  updatedAt: warningBot.updatedAt,
});

export const warningBotService = {
  async findWarningBots(): Promise<WarningBotRecord[]> {
    const warningBots = await warningBotRepository.findMany({
      orderBy: { createdAt: Prisma.SortOrder.desc },
      include: {
        publisher: {
          select: {
            name: true,
          },
        },
      },
    });
    return warningBots.map(toWarningBotRecord);
  },

  async findWarningBotById(id: string): Promise<WarningBotRecord | null> {
    if (!id) {
      return null;
    }

    const warningBot = await warningBotRepository.findUnique({
      where: { id },
      include: {
        publisher: {
          select: {
            name: true,
          },
        },
      },
    });
    return warningBot ? toWarningBotRecord(warningBot) : null;
  },

  async findWarningBotByHash(hash: string): Promise<WarningBotRecord | null> {
    if (!hash) {
      return null;
    }

    const warningBot = await warningBotRepository.findFirst({
      where: { hash },
      include: {
        publisher: {
          select: {
            name: true,
          },
        },
      },
    });
    return warningBot ? toWarningBotRecord(warningBot) : null;
  },

  async createWarningBot(input: WarningBotCreateInput): Promise<WarningBotRecord> {
    const created = await warningBotRepository.create({
      data: {
        hash: input.hash,
        userAgent: input.userAgent,
        printCount: input.printCount ?? 0,
        clickCount: input.clickCount ?? 0,
        applyCount: input.applyCount ?? 0,
        accountCount: input.accountCount ?? 0,
        publisherId: input.publisherId,
      },
      include: {
        publisher: {
          select: {
            name: true,
          },
        },
      },
    });

    return toWarningBotRecord(created);
  },

  async updateWarningBot(id: string, patch: WarningBotUpdatePatch): Promise<WarningBotRecord> {
    const data: Prisma.WarningBotUncheckedUpdateInput = {};

    if (patch.hash !== undefined) {
      data.hash = patch.hash;
    }
    if (patch.userAgent !== undefined) {
      data.userAgent = patch.userAgent;
    }
    if (patch.printCount !== undefined) {
      data.printCount = patch.printCount;
    }
    if (patch.clickCount !== undefined) {
      data.clickCount = patch.clickCount;
    }
    if (patch.applyCount !== undefined) {
      data.applyCount = patch.applyCount;
    }
    if (patch.accountCount !== undefined) {
      data.accountCount = patch.accountCount;
    }
    if (patch.publisherId !== undefined) {
      data.publisherId = patch.publisherId;
    }
    const updated = await warningBotRepository.update({
      where: { id },
      data,
      include: {
        publisher: {
          select: {
            name: true,
          },
        },
      },
    });

    return toWarningBotRecord(updated);
  },
};
