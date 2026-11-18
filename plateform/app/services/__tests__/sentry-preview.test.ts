import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn() }));

vi.mock("@sentry/react", () => sentry);
vi.mock("~/services/config", () => ({ ENV: "production", SENTRY_DSN: "https://dsn" }));

describe("Sentry en preview du CMS", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("n'est pas initialisé quand l'URL porte le secret de preview", async () => {
    vi.stubGlobal("window", { location: { search: "?preview=secret" } });
    const { initSentry, captureException } = await import("../sentry");
    initSentry();
    captureException(new Error("boom"));

    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("reste actif hors preview", async () => {
    vi.stubGlobal("window", { location: { search: "" } });
    const { initSentry } = await import("../sentry");
    initSentry();

    expect(sentry.init).toHaveBeenCalled();
  });
});
