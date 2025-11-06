import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as ErrorModule from "../../../../src/error";
import KpiModel from "../../../../src/models/kpi";
import elasticMock from "../../../mocks/elasticMock";

// Mock botless KPI builder so it always returns a non-null object
// We'll test botless KPI builder in a separate test file
vi.mock("../../../../src/jobs/kpi/kpi-botless", () => ({
  buildKpiBotless: vi.fn(async (d: Date) => ({ _id: "botless", date: d }) as any),
}));

import { KpiHandler } from "../../../../src/jobs/kpi/handler";
import { createTestMission } from "../../../fixtures";

describe("KPI job - Integration", () => {
  beforeEach(async () => {
    process.env.READ_STATS_FROM = "es";

    (elasticMock.search as any).mockReset();
    (elasticMock.msearch as any).mockReset();

    // Provide the aggregations shape expected by buildKpi() for all ES calls
    (elasticMock.search as any).mockResolvedValue({
      body: {
        aggregations: {
          print: { doc_count: 0, data: { value: 0 } },
          click: { doc_count: 0, data: { value: 0 } },
          apply: { doc_count: 0, data: { value: 0 } },
          account: { doc_count: 0, data: { value: 0 } },
        },
      },
    });

    // Clean KPI collection before each test
    await KpiModel.deleteMany({});
  });

  afterAll(async () => {
    await KpiModel.deleteMany({});
  });

  it("Should compute KPIs for the last 10 days (yesterday..D-9)", async () => {
    const handler = new KpiHandler();

    const fixedToday = new Date("2025-08-15T12:00:00.000Z");
    const yesterday = new Date(fixedToday.getFullYear(), fixedToday.getMonth(), fixedToday.getDate() - 1);

    const result = await handler.handle({ date: fixedToday.toISOString() });

    const expectedDates = Array.from({ length: 10 }).map((_, i) => {
      return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - i);
    });
    const kpis = await KpiModel.find();

    expect(result.result.length).toBe(10);
    expect(result.success).toBe(true);
    expect(kpis.length).toBe(10);
    expect(kpis.map((r) => r.date.toISOString())).toEqual(expectedDates.map((d) => d.toISOString()));
  });

  it("Should not re-compute KPI for date in time window when already computed", async () => {
    const handler = new KpiHandler();
    const fixedToday = new Date("2025-08-15T12:00:00.000Z");
    const yesterday = new Date(fixedToday.getFullYear(), fixedToday.getMonth(), fixedToday.getDate() - 1);

    await KpiModel.create({ date: yesterday });
    const result = await handler.handle({ date: fixedToday.toISOString() });
    const kpis = await KpiModel.find();

    expect(result.success).toBe(true);
    expect(result.result.length).toBe(10);
    expect(kpis.length).toBe(10);
  });

  it("Should compute mission availability and status aggregations (counts, sums, percentages)", async () => {
    const handler = new KpiHandler();
    const fixedToday = new Date("2025-08-15T12:00:00.000Z");
    const yesterday = new Date(fixedToday.getFullYear(), fixedToday.getMonth(), fixedToday.getDate() - 1);
    const fromDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 1);
    const endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    // Benevolat (publisherName !== "Service Civique")
    await createTestMission({ publisherName: "Other", placesStatus: "GIVEN_BY_PARTNER", places: 3, createdAt: fromDate, deleted: false });
    await createTestMission({ publisherName: "Other", placesStatus: "GIVEN_BY_PARTNER", places: 7, createdAt: fromDate, deleted: false });
    await createTestMission({ publisherName: "Other", placesStatus: "ATTRIBUTED_BY_API", places: 5, createdAt: fromDate, deleted: false });
    // deleted true but deletedAt >= fromDate -> still available
    await createTestMission({ publisherName: "Other", placesStatus: "GIVEN_BY_PARTNER", places: 1, createdAt: fromDate, deleted: true, deletedAt: fromDate });
    // Exclusions
    await createTestMission({ publisherName: "Other", placesStatus: "GIVEN_BY_PARTNER", places: 99, createdAt: endDate, deleted: false }); // createdAt >= endDate -> exclude
    await createTestMission({
      publisherName: "Other",
      placesStatus: "GIVEN_BY_PARTNER",
      places: 99,
      createdAt: fromDate,
      deleted: true,
      deletedAt: new Date(fromDate.getTime() - 24 * 60 * 60 * 1000),
    }); // deletedAt < fromDate -> exclude

    // JVA (counts inside benevolat + specific JVA count)
    await createTestMission({ publisherName: "JeVeuxAider.gouv.fr", placesStatus: "GIVEN_BY_PARTNER", places: 2, createdAt: fromDate, deleted: false });

    // Volontariat (publisherName === "Service Civique")
    await createTestMission({ publisherName: "Service Civique", placesStatus: "GIVEN_BY_PARTNER", places: 4, createdAt: fromDate, deleted: false });
    await createTestMission({ publisherName: "Service Civique", placesStatus: "ATTRIBUTED_BY_API", places: 2, createdAt: fromDate, deleted: false });
    await createTestMission({ publisherName: "Service Civique", placesStatus: "ATTRIBUTED_BY_API", places: 6, createdAt: fromDate, deleted: false });

    const res = await handler.handle({ date: fixedToday.toISOString() });
    expect(res.success).toBe(true);

    const kpi = await KpiModel.findOne({ date: yesterday });
    expect(kpi).toBeTruthy();
    if (!kpi) {
      return;
    }

    // Availability counts
    expect(kpi.availableBenevolatMissionCount).toBe(5); // 4 benevolat + 1 JVA, exclusions removed
    expect(kpi.availableVolontariatMissionCount).toBe(3);
    expect(kpi.availableJvaMissionCount).toBe(1);

    // Status sums
    expect(kpi.availableBenevolatGivenPlaceCount).toBe(3 + 7 + 1 + 2); // = 13
    expect(kpi.availableBenevolatAttributedPlaceCount).toBe(5);
    expect(kpi.availableVolontariatGivenPlaceCount).toBe(4);
    expect(kpi.availableVolontariatAttributedPlaceCount).toBe(2 + 6); // = 8

    // Status mission counts (used for percentages)
    // benevolat_given: 4 missions (2 Other GIVEN + 1 deleted but available + 1 JVA)
    // benevolat_attributed: 1 mission
    // volontariat_given: 1 mission
    // volontariat_attributed: 2 missions
    // Percentages = status mission count / available mission count for segment
    expect(kpi.percentageBenevolatGivenPlaces).toBeCloseTo(4 / 5, 6);
    expect(kpi.percentageBenevolatAttributedPlaces).toBeCloseTo(1 / 5, 6);
    expect(kpi.percentageVolontariatGivenPlaces).toBeCloseTo(1 / 3, 6);
    expect(kpi.percentageVolontariatAttributedPlaces).toBeCloseTo(2 / 3, 6);
  });

  it("Should set missions counter to 0 when no benevolat available)", async () => {
    const handler = new KpiHandler();
    const fixedToday = new Date("2025-08-15T12:00:00.000Z");
    const yesterday = new Date(fixedToday.getFullYear(), fixedToday.getMonth(), fixedToday.getDate() - 1);
    const fromDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 1);

    // Only ASC missions -> benevolat available count should be 0
    await createTestMission({ publisherName: "Service Civique", placesStatus: "GIVEN_BY_PARTNER", places: 1, createdAt: fromDate });

    const res = await handler.handle({ date: fixedToday.toISOString() });
    expect(res.success).toBe(true);
    const kpi = await KpiModel.findOne({ date: yesterday });
    expect(kpi).toBeTruthy();
    if (!kpi) {
      return;
    }

    expect(kpi.availableBenevolatMissionCount).toBe(0);
    expect(kpi.percentageBenevolatGivenPlaces).toBe(0);
    expect(kpi.percentageBenevolatAttributedPlaces).toBe(0);
  });

  it("Should map ES aggregations to KPI fields (benevolat & volontariat)", async () => {
    const handler = new KpiHandler();
    const fixedToday = new Date("2025-08-15T12:00:00.000Z");
    const yesterday = new Date(fixedToday.getFullYear(), fixedToday.getMonth(), fixedToday.getDate() - 1);
    const fromDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 1);

    await createTestMission({ publisherName: "Other", placesStatus: "GIVEN_BY_PARTNER", places: 1, createdAt: fromDate });
    await createTestMission({ publisherName: "Service Civique", placesStatus: "GIVEN_BY_PARTNER", places: 1, createdAt: fromDate });

    // Return a mock ES response with the given aggregations
    const mockAgg = (printDoc: number, printVal: number, clickDoc: number, clickVal: number, applyDoc: number, applyVal: number, accountDoc: number, accountVal: number) => ({
      body: {
        aggregations: {
          print: { doc_count: printDoc, data: { value: printVal } },
          click: { doc_count: clickDoc, data: { value: clickVal } },
          apply: { doc_count: applyDoc, data: { value: applyVal } },
          account: { doc_count: accountDoc, data: { value: accountVal } },
        },
      },
    });

    const firstDayBenevolat = mockAgg(11, 3, 7, 2, 5, 1, 4, 1);
    const firstDayVolontariat = mockAgg(21, 6, 14, 4, 9, 2, 8, 2);
    const zeroAgg = mockAgg(0, 0, 0, 0, 0, 0, 0, 0);

    // As handler call ES twice, we need to separate first call (benevolat) from second call (volontariat)
    let callCount = 0;
    (elasticMock.search as any).mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.resolve(firstDayBenevolat);
      }
      if (callCount === 2) {
        return Promise.resolve(firstDayVolontariat);
      }
      return Promise.resolve(zeroAgg);
    });

    const res = await handler.handle({ date: fixedToday.toISOString() });
    expect(res.success).toBe(true);
    const kpi = await KpiModel.findOne({ date: yesterday });
    expect(kpi).toBeTruthy();
    if (!kpi) {
      return;
    }

    // Benevolat ES mappings
    expect(kpi.benevolatPrintMissionCount).toBe(3);
    expect(kpi.benevolatClickMissionCount).toBe(2);
    expect(kpi.benevolatApplyMissionCount).toBe(1);
    expect(kpi.benevolatAccountMissionCount).toBe(1);
    expect(kpi.benevolatPrintCount).toBe(11);
    expect(kpi.benevolatClickCount).toBe(7);
    expect(kpi.benevolatApplyCount).toBe(5);
    expect(kpi.benevolatAccountCount).toBe(4);

    // Volontariat ES mappings
    expect(kpi.volontariatPrintMissionCount).toBe(6);
    expect(kpi.volontariatClickMissionCount).toBe(4);
    expect(kpi.volontariatApplyMissionCount).toBe(2);
    expect(kpi.volontariatAccountMissionCount).toBe(2);
    expect(kpi.volontariatPrintCount).toBe(21);
    expect(kpi.volontariatClickCount).toBe(14);
    expect(kpi.volontariatApplyCount).toBe(9);
    expect(kpi.volontariatAccountCount).toBe(8);
  });

  it("Should handle ES failure", async () => {
    const handler = new KpiHandler();
    const fixedToday = new Date("2025-08-15T12:00:00.000Z");
    const yesterday = new Date(fixedToday.getFullYear(), fixedToday.getMonth(), fixedToday.getDate() - 1);

    const spy = vi.spyOn(ErrorModule, "captureException");

    (elasticMock.search as any).mockReset();
    (elasticMock.search as any).mockRejectedValue(new Error("ES down"));

    const res = await handler.handle({ date: fixedToday.toISOString() });
    expect(res.success).toBe(false);

    const kpi = await KpiModel.findOne({ date: yesterday });
    expect(kpi).toBeNull();

    expect(spy).toHaveBeenCalled();
  });
});
