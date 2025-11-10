import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importService } from "../../../../services/import";
import { shouldCleanMissionsForPublisher } from "../publisher";

// Helper to compute dates
const days = (n: number) => 1000 * 60 * 60 * 24 * n;

describe("shouldCleanMissionsForPublisher", () => {
  const PUBLISHER_ID = "pub_123";
  const NOW = new Date("2025-01-08T00:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("Should return true when there are failures and no successes in the last 7 days", async () => {
    const spy = vi.spyOn(importService as any, "findImports").mockResolvedValue([
      { status: "FAILED", endedAt: new Date(NOW.getTime() - days(1)) },
      { status: "FAILED", endedAt: new Date(NOW.getTime() - days(3)) },
    ]);

    const result = await shouldCleanMissionsForPublisher(PUBLISHER_ID);

    // Assert DB query filter uses 7-day threshold
    const expectedThreshold = new Date(NOW.getTime() - days(7));
    expect(spy).toHaveBeenCalledWith({ publisherId: PUBLISHER_ID, endedAtGt: expectedThreshold });

    expect(result).toBe(true);
  });

  it("Should return false when there is at least one success in the last 7 days", async () => {
    vi.spyOn(importService as any, "findImports").mockResolvedValue([
      { status: "FAILED", endedAt: new Date(NOW.getTime() - days(2)) },
      { status: "SUCCESS", endedAt: new Date(NOW.getTime() - days(1)) },
    ]);

    const result = await shouldCleanMissionsForPublisher(PUBLISHER_ID);

    expect(result).toBe(false);
  });

  it("Should return false when there are no imports in the last 7 days", async () => {
    vi.spyOn(importService as any, "findImports").mockResolvedValue([]);

    const result = await shouldCleanMissionsForPublisher(PUBLISHER_ID);

    expect(result).toBe(false);
  });

  it("Should return false when there are only successes in the last 7 days", async () => {
    vi.spyOn(importService as any, "findImports").mockResolvedValue([
      { status: "SUCCESS", endedAt: new Date(NOW.getTime() - days(4)) },
      { status: "SUCCESS", endedAt: new Date(NOW.getTime() - days(5)) },
    ]);

    const result = await shouldCleanMissionsForPublisher(PUBLISHER_ID);

    expect(result).toBe(false);
  });
});
