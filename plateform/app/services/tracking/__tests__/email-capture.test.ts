import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
vi.mock("../index", () => ({ track: (...args: unknown[]) => track(...args) }));

const { trackEmailCaptureFailed, trackEmailCaptureSkipped, trackEmailCaptureSubmitted, trackEmailCaptureViewed } = await import("../events");

describe("email_capture.*", () => {
  beforeEach(() => track.mockClear());

  it("quiz : recopie quiz_version et completion_type", () => {
    trackEmailCaptureViewed({ signupSource: "quiz", completionType: "shortcut" });
    expect(track).toHaveBeenCalledWith("email_capture.viewed", { signup_source: "quiz", quiz_version: expect.any(String), completion_type: "shortcut" });
  });

  it("save_mission : propriétés de la mission, rank et publisher_id optionnels", () => {
    trackEmailCaptureSubmitted({ signupSource: "save_mission", missionId: "m1", publisherId: "p1", rank: 3, entrySource: "results_card" });
    expect(track).toHaveBeenCalledWith("email_capture.submitted", { signup_source: "save_mission", mission_id: "m1", publisher_id: "p1", rank: 3, entry_source: "results_card" });
  });

  it("result_list : seulement signup_source", () => {
    trackEmailCaptureSubmitted({ signupSource: "result_list" });
    expect(track).toHaveBeenCalledWith("email_capture.submitted", { signup_source: "result_list" });
  });

  it("failed : signup_source + error_type", () => {
    trackEmailCaptureFailed({ signupSource: "result_list", errorType: "api_error" });
    expect(track).toHaveBeenCalledWith("email_capture.failed", { signup_source: "result_list", error_type: "api_error" });
  });

  it("skipped : propriétés selon la source", () => {
    trackEmailCaptureSkipped({ signupSource: "save_mission", missionId: "m1", rank: 2 }, "close");
    expect(track).toHaveBeenLastCalledWith("email_capture.skipped", { signup_source: "save_mission", skip_method: "close", mission_id: "m1" });
    trackEmailCaptureSkipped({ signupSource: "quiz", completionType: "full" }, "continue_without_email");
    expect(track).toHaveBeenLastCalledWith("email_capture.skipped", {
      signup_source: "quiz",
      skip_method: "continue_without_email",
      quiz_version: expect.any(String),
      completion_type: "full",
    });
  });
});
