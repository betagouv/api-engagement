import { describe, expect, it } from "vitest";
import { pageMeta } from "../seo";

describe("pageMeta", () => {
  it("déclare un canonical absolu pour une page indexable", () => {
    const meta = pageMeta({ pathname: "/" }, { title: "T" });
    expect(meta).toContainEqual({ tagName: "link", rel: "canonical", href: "https://trouvetamission.gouv.fr/" });
  });

  it("remplace le canonical par la consigne robots sur une page noindex", () => {
    const meta = pageMeta({ pathname: "/missions" }, { title: "T", robots: "noindex, follow" });
    expect(meta).toContainEqual({ name: "robots", content: "noindex, follow" });
    expect(meta.some((m) => "rel" in m && m.rel === "canonical")).toBe(false);
  });

  it("utilise l'image de la page pour le partage, avec ses dimensions quand elles sont connues", () => {
    const meta = pageMeta({ pathname: "/blog/a" }, { title: "T", image: { url: "https://cms/x.webp", alt: "Alt", width: 720, height: 480 }, ogType: "article" });
    expect(meta).toContainEqual({ property: "og:image", content: "https://cms/x.webp" });
    expect(meta).toContainEqual({ property: "og:image:width", content: "720" });
    expect(meta).toContainEqual({ property: "og:image:alt", content: "Alt" });
    expect(meta).toContainEqual({ property: "og:type", content: "article" });
    expect(meta.some((m) => "content" in m && m.content === "image/png")).toBe(false);
  });
});
