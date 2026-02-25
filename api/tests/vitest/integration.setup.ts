import "./shared";

import { pgConnected } from "@/db/postgres";
import { afterAll, beforeAll, beforeEach } from "vitest";

type PostgresModule = typeof import("@/db/postgres");
let prisma: PostgresModule["prisma"] | null = null;

beforeAll(async () => {
  const postgresModule = await import("@/db/postgres");
  prisma = postgresModule.prisma;

  try {
    await pgConnected();
  } catch (error) {
    console.error("[Tests] Failed to connect Prisma clients:", error);
    throw error;
  }
});

beforeEach(async () => {
  if (prisma) {
    await prisma.$transaction([
      prisma.statEvent.deleteMany({}),
      prisma.widgetPublisher.deleteMany({}),
      prisma.widgetRule.deleteMany({}),
      prisma.widget.deleteMany({}),
      prisma.missionModerationStatus.deleteMany({}),
      prisma.missionAddress.deleteMany({}),
      prisma.missionEvent.deleteMany({}),
      prisma.mission.deleteMany({}),
      prisma.publisherOrganization.deleteMany({}),
      prisma.organization.deleteMany({}),
      prisma.publisherDiffusion.deleteMany({}),
      prisma.publisher.deleteMany({}),
      prisma.domain.deleteMany({}),
      prisma.activity.deleteMany({}),
    ]);
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});
