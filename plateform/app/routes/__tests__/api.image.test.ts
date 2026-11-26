import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/services/sentry.server", () => ({ logServerError: vi.fn() }));

import { loader } from "../api.image";

const BUCKET = "https://api-engagement-bucket.s3.fr-par.scw.cloud";

const callLoader = (sourceUrl: string, width: number) => {
  const request = new Request(`http://localhost/api/image?url=${encodeURIComponent(sourceUrl)}&w=${width}`);
  return loader({ request, params: {}, context: {} } as Parameters<typeof loader>[0]);
};

describe("GET /api/image", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const photo = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#000091" } })
      .jpeg()
      .toBuffer();
    fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array(photo)));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renvoie l'image redimensionnée en WebP avec un cache navigateur", async () => {
    const response = await callLoader(`${BUCKET}/img/sport_01.jpeg`, 800);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toContain("max-age=86400");
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: 800, height: 533 });
  });

  it("garde en mémoire une image déjà redimensionnée", async () => {
    await callLoader(`${BUCKET}/img/sport_02.jpeg`, 128);
    const response = await callLoader(`${BUCKET}/img/sport_02.jpeg`, 128);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sert la source telle quelle quand elle est déjà plus légère que la version WebP", async () => {
    // Image détaillée fortement compressée en AVIF : sa version WebP serait plus lourde.
    const pixels = Buffer.alloc(300 * 200 * 3);
    for (let index = 0; index < pixels.length; index++) pixels[index] = (index * 2654435761) % 251;
    const lightAvif = await sharp(pixels, { raw: { width: 300, height: 200, channels: 3 } })
      .avif({ quality: 20 })
      .toBuffer();
    fetchMock.mockResolvedValue(new Response(new Uint8Array(lightAvif), { headers: { "Content-Type": "image/avif" } }));

    const response = await callLoader(`${BUCKET}/img/deja-legere.avif`, 800);

    expect(response.headers.get("Content-Type")).toBe("image/avif");
    expect(Buffer.from(await response.arrayBuffer()).equals(lightAvif)).toBe(true);
  });

  it("refuse un domaine non autorisé sans aller chercher l'image", async () => {
    const response = await callLoader("https://exemple.com/image.jpg", 800);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse une largeur hors de la liste", async () => {
    const response = await callLoader(`${BUCKET}/img/sport_03.jpeg`, 4000);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renvoie vers l'image d'origine si elle ne peut pas être redimensionnée", async () => {
    fetchMock.mockResolvedValue(new Response("pas une image"));

    const response = await callLoader(`${BUCKET}/img/illisible.jpeg`, 800);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`${BUCKET}/img/illisible.jpeg`);
  });

  it("renvoie vers l'image d'origine si la source est injoignable", async () => {
    fetchMock.mockRejectedValue(new Error("timeout"));

    const response = await callLoader(`${BUCKET}/img/injoignable.jpeg`, 800);

    expect(response.status).toBe(302);
  });
});
