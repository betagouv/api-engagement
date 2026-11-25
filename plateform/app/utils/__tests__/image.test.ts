import { describe, expect, it } from "vitest";

import { IMAGE_WIDTHS, resizedImageUrl } from "../image";

describe("resizedImageUrl", () => {
  it("passe par /api/image pour une image d'un domaine autorisé", () => {
    const url = "https://api-engagement-bucket.s3.fr-par.scw.cloud/publishers/abc/Logo Police.jpg";

    expect(resizedImageUrl(url, IMAGE_WIDTHS.logo)).toBe(`/api/image?url=${encodeURIComponent(url)}&w=128`);
  });

  it("garde l'URL d'origine pour un domaine non autorisé", () => {
    expect(resizedImageUrl("https://encrypted-tbn0.gstatic.com/images?q=abc", IMAGE_WIDTHS.card)).toBe("https://encrypted-tbn0.gstatic.com/images?q=abc");
  });

  it("garde l'URL d'origine hors HTTPS ou illisible", () => {
    expect(resizedImageUrl("http://api-engagement-bucket.s3.fr-par.scw.cloud/img/sport_01.jpeg", IMAGE_WIDTHS.card)).toBe(
      "http://api-engagement-bucket.s3.fr-par.scw.cloud/img/sport_01.jpeg",
    );
    expect(resizedImageUrl("pas une url", IMAGE_WIDTHS.card)).toBe("pas une url");
  });
});
