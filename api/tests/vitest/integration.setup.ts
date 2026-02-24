import "./shared";

import { pgConnected } from "@/db/postgres";
import { afterAll, beforeAll, beforeEach } from "vitest";

type PostgresModule = typeof import("@/db/postgres");
let prismaCore: PostgresModule["prisma"] | null = null;

beforeAll(async () => {
  const postgresModule = await import("@/db/postgres");
  prismaCore = postgresModule.prisma;

  try {
    await pgConnected();
  } catch (error) {
    console.error("[Tests] Failed to connect Prisma clients:", error);
    throw error;
  }
});

beforeEach(async () => {
  if (prismaCore) {
    await prismaCore.$transaction([
      prismaCore.statEvent.deleteMany({}),
      prismaCore.widgetPublisher.deleteMany({}),
      prismaCore.widgetRule.deleteMany({}),
      prismaCore.widget.deleteMany({}),
      prismaCore.missionModerationStatus.deleteMany({}),
      prismaCore.missionAddress.deleteMany({}),
      prismaCore.missionEvent.deleteMany({}),
      prismaCore.mission.deleteMany({}),
      prismaCore.publisherOrganization.deleteMany({}),
      prismaCore.organization.deleteMany({}),
      prismaCore.publisherDiffusion.deleteMany({}),
      prismaCore.publisher.deleteMany({}),
      prismaCore.domain.deleteMany({}),
      prismaCore.activity.deleteMany({}),
    ]);
  }
});

afterAll(async () => {
  if (prismaCore) {
    await prismaCore.$disconnect();
  }
});
