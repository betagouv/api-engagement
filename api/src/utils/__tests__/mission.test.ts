import { beforeEach, describe, expect, it, vi } from "vitest";
import { Mission } from "../../types";

vi.mock("../../config", () => ({
  API_URL: "https://api.test.com",
}));

import { getMissionTrackedApplicationUrl } from "../mission";

describe("getMissionTrackedApplicationUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return the correct tracked application URL using mocked config", () => {
    const mockMission = {
      _id: "mission123",
    } as unknown as Mission; // Simple mock of Mission object

    const actualUrl = getMissionTrackedApplicationUrl(mockMission, "publisher456");

    expect(actualUrl).toBe("https://api.test.com/r/mission123/publisher456");
  });
});
