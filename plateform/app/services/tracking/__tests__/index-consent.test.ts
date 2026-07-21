import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const trackingProvider = vi.hoisted(() => ({
  name: "posthog" as const,
  init: vi.fn(),
  setConsentStatus: vi.fn(),
  track: vi.fn(),
  identify: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
}));

const quizState = vi.hoisted(() => ({ distinctId: "quiz-distinct-id", quizAttemptId: "attempt-id", userScoringId: "result-id" }));

vi.mock("~/services/config", () => ({ TRACKING_PROVIDER: "posthog" }));
vi.mock("~/services/tracking/providers", () => ({ createProvider: () => trackingProvider }));
vi.mock("~/stores/quiz", () => ({ useQuizStore: { getState: () => quizState, subscribe: vi.fn() } }));
vi.mock("~/utils/campaign-attribution", () => ({
  CAMPAIGN_UTM_KEYS: ["utm_source", "utm_campaign", "utm_medium"],
  getCampaignParamsFromSearch: () => ({}),
  resolveActiveCampaign: () => ({}),
}));
vi.mock("~/utils/internal-user-flag", () => ({
  getInternalUserFlagAction: () => null,
  isInternalUserFlagEnabled: () => false,
  persistInternalUserFlagAction: vi.fn(),
}));

import { initTracking, setQuizSessionId, setTrackingConsentStatus, track } from "..";

describe("orchestration du consentement tracking", () => {
  beforeAll(() => {
    vi.stubGlobal("window", { location: { search: "" }, localStorage: {} });
  });

  beforeEach(() => vi.clearAllMocks());

  it("bloque, anonymise puis identifie selon le choix Tarteaucitron", () => {
    initTracking();
    track("quiz.started", { quiz_attempt_id: "leaked-attempt", mission_id: "mission-id" });

    expect(trackingProvider.setConsentStatus).toHaveBeenCalledWith("pending");
    expect(trackingProvider.track).not.toHaveBeenCalled();
    expect(trackingProvider.identify).not.toHaveBeenCalled();

    setTrackingConsentStatus("denied");
    track("quiz.started", { quiz_attempt_id: "leaked-attempt", quiz_session_id: "leaked-result", mission_id: "mission-id" });
    setQuizSessionId("ignored-result");

    expect(trackingProvider.setConsentStatus).toHaveBeenCalledWith("denied");
    expect(trackingProvider.track).toHaveBeenLastCalledWith("quiz.started", { mission_id: "mission-id" });
    expect(trackingProvider.register).not.toHaveBeenCalledWith({ quiz_session_id: "ignored-result" });

    setTrackingConsentStatus("granted");
    setQuizSessionId("new-result");

    expect(trackingProvider.setConsentStatus).toHaveBeenCalledWith("granted");
    expect(trackingProvider.identify).toHaveBeenCalledWith("quiz-distinct-id");
    expect(trackingProvider.register).toHaveBeenCalledWith({ quiz_attempt_id: "attempt-id", quiz_session_id: "result-id" });
    expect(trackingProvider.register).toHaveBeenCalledWith({ quiz_session_id: "new-result" });
  });
});
