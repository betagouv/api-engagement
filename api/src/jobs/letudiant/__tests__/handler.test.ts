import { describe, expect, it } from "vitest";
import { findLetudiantPublicId } from "../handler";
import { MissionJobBoardRecord } from "../../../types/mission-job-board";

describe("Letudiant handler utils", () => {
  it("should return existing id for matching address", () => {
    const jobBoards = [{ missionAddressId: "addr-1", publicId: "id-123" } as MissionJobBoardRecord];
    const result = findLetudiantPublicId(jobBoards, "addr-1");
    expect(result).toBe("id-123");
  });

  it("should fallback to mission-level entry when address is not found", () => {
    const jobBoards = [{ missionAddressId: null, publicId: "id-legacy" } as MissionJobBoardRecord];
    const result = findLetudiantPublicId(jobBoards, "addr-unknown");
    expect(result).toBe("id-legacy");
  });

  it("should return mission-level entry for remote missions", () => {
    const jobBoards = [{ missionAddressId: null, publicId: "id-remote" } as MissionJobBoardRecord];
    const result = findLetudiantPublicId(jobBoards, null);
    expect(result).toBe("id-remote");
  });
});
