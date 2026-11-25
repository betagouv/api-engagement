import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { optimizeImage } from "@/services/image";

const createImage = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: { r: 0, g: 0, b: 145 } } });

describe("optimizeImage", () => {
  it("réduit une grande image dans la taille maximale en gardant ses proportions, au format WebP", async () => {
    const input = await createImage(3000, 1500).jpeg().toBuffer();

    const metadata = await sharp(await optimizeImage(input, 1200)).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(600);
  });

  it("n'agrandit pas une image plus petite que la taille maximale", async () => {
    const input = await createImage(120, 80).png().toBuffer();

    const metadata = await sharp(await optimizeImage(input, 256)).metadata();

    expect(metadata.width).toBe(120);
    expect(metadata.height).toBe(80);
  });

  it("applique l'orientation EXIF puis retire les métadonnées", async () => {
    // Orientation 6 : photo prise en portrait, stockée en paysage.
    const input = await createImage(400, 200).withMetadata({ orientation: 6 }).jpeg().toBuffer();

    const metadata = await sharp(await optimizeImage(input, 1200)).metadata();

    expect(metadata.width).toBe(200);
    expect(metadata.height).toBe(400);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
  });

  it("garde l'animation d'un GIF animé", async () => {
    const frames = await Promise.all([createImage(600, 400).png().toBuffer(), createImage(600, 400).tint({ r: 225, g: 0, b: 15 }).png().toBuffer()]);
    const input = await sharp(frames, { join: { animated: true } })
      .gif()
      .toBuffer();

    const metadata = await sharp(await optimizeImage(input, 256), { animated: true }).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.pages).toBe(2);
    expect(metadata.width).toBe(256);
  });
});
