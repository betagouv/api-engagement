import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return { ...actual, ENV: "test" };
});
vi.mock("@/jobs/hellowork/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/jobs/hellowork/config")>();
  return { ...actual, HELLOWORK_MAX_OFFERS_PER_ANNONCEUR: 2 };
});

import { PUBLISHER_IDS } from "@/config";
import { HelloworkHandler } from "@/jobs/hellowork/handler";
import { missionDiffusionService } from "@/services/mission-diffusion";
import publisherDiffusionRuleService from "@/services/publisher-diffusion-rule";
import { putObject } from "@/services/s3";
import { createTestMission, createTestPublisher } from "../../../fixtures";

const HELLOWORK_ID = PUBLISHER_IDS.HELLOWORK;
const SC_ID = PUBLISHER_IDS.SERVICE_CIVIQUE;
const JVA_ID = PUBLISHER_IDS.JEVEUXAIDER;

beforeEach(async () => {
  vi.mocked(putObject)
    .mockReset()
    .mockResolvedValue({} as any);
  await createTestPublisher({ id: HELLOWORK_ID, name: "Hellowork" });
  await createTestPublisher({ id: SC_ID, name: "Service Civique" });
  await createTestPublisher({ id: JVA_ID, name: "JeVeuxAider" });
});

it("plafonne le nombre d'offres par annonceur, sur les plus récentes", async () => {
  await publisherDiffusionRuleService.findOrCreateScopeRoot(HELLOWORK_ID, SC_ID);
  await publisherDiffusionRuleService.findOrCreateScopeRoot(HELLOWORK_ID, JVA_ID);
  const base = {
    statusCode: "ACCEPTED" as const,
    organizationName: "Une association",
    endAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    addresses: [{ city: "Lyon", postalCode: "69001", departmentCode: "69", country: "France" } as any],
  };
  const sc = [];
  for (let i = 0; i < 3; i++) {
    sc.push(await createTestMission({ ...base, publisherId: SC_ID, createdAt: new Date(2026, 0, i + 1) }));
  }
  const jva = await createTestMission({ ...base, publisherId: JVA_ID });
  await missionDiffusionService.rebuildForDistributionPublisher(HELLOWORK_ID);

  const result = await new HelloworkHandler().handle({ publisherId: HELLOWORK_ID });
  expect(result.counter).toEqual({ processed: 4, sent: 3, skipped: 1 });

  const xml = vi.mocked(putObject).mock.calls[0][1] as string;
  expect(xml).toContain(jva.id);
  expect(xml).toContain(sc[2].id);
  expect(xml).toContain(sc[1].id);
  expect(xml).not.toContain(sc[0].id);
});
