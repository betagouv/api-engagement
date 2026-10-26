import { describe, expect, it } from "vitest";
import { buildSitemapXml } from "../sitemap";

describe("buildSitemapXml", () => {
  it("produit une URL par entrée, avec lastmod seulement quand il est connu", () => {
    const xml = buildSitemapXml("https://exemple.fr", [{ path: "/" }, { path: "/blog/a", lastmod: "2026-10-20" }]);
    expect(xml).toContain("<loc>https://exemple.fr/</loc>\n  </url>");
    expect(xml).toContain("<loc>https://exemple.fr/blog/a</loc>\n    <lastmod>2026-10-20</lastmod>");
  });

  it("ne répète pas un chemin : la première entrée l'emporte", () => {
    const xml = buildSitemapXml("https://exemple.fr", [{ path: "/a" }, { path: "/a", lastmod: "2026-01-01" }]);
    expect(xml.match(/<loc>/g)).toHaveLength(1);
    expect(xml).not.toContain("lastmod");
  });

  it("échappe les caractères réservés du XML", () => {
    const xml = buildSitemapXml("https://exemple.fr", [{ path: "/blog?categorie=a&page=2" }]);
    expect(xml).toContain("<loc>https://exemple.fr/blog?categorie=a&amp;page=2</loc>");
  });
});
