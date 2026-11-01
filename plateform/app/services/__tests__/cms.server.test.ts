import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

const published = (slug: string) => ({ ok: true, json: async () => ({ data: [{ slug, blocks: [] }] }) });
const absent = { ok: true, json: async () => ({ data: [] }) };

// Le jeton est lu à l'import du module : on le recharge avec l'environnement voulu.
async function load() {
  vi.resetModules();
  vi.stubEnv("CMS_API_TOKEN", "jeton");
  vi.stubGlobal("fetch", fetchMock);
  return import("../cms.server");
}

describe("getCmsPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("ne sollicite pas le CMS pour un slug mal formé", async () => {
    const { getCmsPage } = await load();
    for (const slug of ["../etc", "A B", "a/b", "-a", "a".repeat(81)]) {
      expect(await getCmsPage(slug)).toBeNull();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("garde une page publiée en cache", async () => {
    const { getCmsPage } = await load();
    fetchMock.mockResolvedValue(published("a"));
    await getCmsPage("a");
    await getCmsPage("a");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ne met pas en cache une page absente", async () => {
    const { getCmsPage } = await load();
    fetchMock.mockResolvedValue(absent);
    expect(await getCmsPage("inconnue")).toBeNull();
    await getCmsPage("inconnue");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("borne la taille du cache en évinçant la page la plus ancienne", async () => {
    const { getCmsPage, CMS_CACHE_MAX_ENTRIES } = await load();
    fetchMock.mockImplementation(async (url: string) => published(/filters\[slug\]\[\$eq\]=([^&]+)/.exec(url)![1]));
    for (let i = 0; i <= CMS_CACHE_MAX_ENTRIES; i++) await getCmsPage(`page-${i}`);
    expect(fetchMock).toHaveBeenCalledTimes(CMS_CACHE_MAX_ENTRIES + 1);

    await getCmsPage(`page-${CMS_CACHE_MAX_ENTRIES}`); // la plus récente : en cache
    expect(fetchMock).toHaveBeenCalledTimes(CMS_CACHE_MAX_ENTRIES + 1);
    await getCmsPage("page-0"); // la plus ancienne : évincée, relue
    expect(fetchMock).toHaveBeenCalledTimes(CMS_CACHE_MAX_ENTRIES + 2);
  });

  it("ressert la dernière version connue quand le CMS tombe après l'expiration du cache", async () => {
    vi.useFakeTimers();
    const { getCmsPage } = await load();
    fetchMock.mockResolvedValueOnce(published("a"));
    const first = await getCmsPage("a");

    vi.advanceTimersByTime(61_000);
    fetchMock.mockRejectedValueOnce(new Error("CMS indisponible"));
    expect(await getCmsPage("a")).toEqual(first);
  });

  it("répond null quand le CMS n'est pas configuré", async () => {
    vi.resetModules();
    vi.stubEnv("CMS_API_TOKEN", "");
    vi.stubGlobal("fetch", fetchMock);
    const { getCmsPage } = await import("../cms.server");
    expect(await getCmsPage("a")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
