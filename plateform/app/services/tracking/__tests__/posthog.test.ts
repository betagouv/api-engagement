import { beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  reset: vi.fn(),
  clear_opt_in_out_capturing: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthog }));
vi.mock("~/services/config", () => ({ POSTHOG_KEY: "phc_test", POSTHOG_HOST: "https://eu.example.test" }));

import { createPosthogProvider } from "../providers/posthog";

describe("provider PostHog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initialise le mode on_reject avec les collectes automatiques désactivées", () => {
    createPosthogProvider().init?.();

    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "https://eu.example.test",
        defaults: "2026-05-30",
        cookieless_mode: "on_reject",
        person_profiles: "identified_only",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_performance: false,
      }),
    );
  });

  it("bloque les captures en attente puis active le cookieless après refus", () => {
    const provider = createPosthogProvider();
    provider.init?.();
    provider.setConsentStatus?.("pending");
    provider.track("page.viewed");

    expect(posthog.reset).toHaveBeenCalledWith(true);
    expect(posthog.clear_opt_in_out_capturing).toHaveBeenCalledOnce();
    expect(posthog.capture).not.toHaveBeenCalled();

    provider.setConsentStatus?.("denied");
    provider.track("page.viewed", { page_name: "homepage" });
    provider.identify?.("forbidden-id");

    expect(posthog.opt_out_capturing).toHaveBeenCalledOnce();
    expect(posthog.capture).toHaveBeenCalledWith("page.viewed", { page_name: "homepage" });
    expect(posthog.identify).not.toHaveBeenCalled();
  });

  it("active la persistance et l'identification après acceptation", () => {
    const provider = createPosthogProvider();
    provider.init?.();
    provider.setConsentStatus?.("granted");
    provider.identify?.("quiz-distinct-id", { source: "quiz" });

    expect(posthog.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(posthog.identify).toHaveBeenCalledWith("quiz-distinct-id", { source: "quiz" });
  });
});
