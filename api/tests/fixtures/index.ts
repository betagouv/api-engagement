import { Import as PrismaImport } from "@/db/core";
import { importService } from "@/services/import";
import type { ImportCreateInput } from "@/types/import";

export { createTestMission } from "./mission";
export { createTestPublisher } from "./publisher";
export { createTestWidget, createTestWidgetRule } from "./widget";

export const createTestImport = async (data: Partial<ImportCreateInput> = {}): Promise<PrismaImport> => {
  const defaultData = {
    name: "Test import",
    publisherId: "test-publisher-id",
    status: "SUCCESS",
    startedAt: new Date(),
    finishedAt: new Date(),
    createdCount: 0,
    deletedCount: 0,
    updatedCount: 0,
    missionCount: 0,
    refusedCount: 0,
    error: null,
    failed: [],
  };
  const importData = { ...defaultData, ...data };
  return importService.createImport(importData as ImportCreateInput);
};
