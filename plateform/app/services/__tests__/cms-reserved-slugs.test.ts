import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("slugs réservés du CMS", () => {
  it("couvre le premier segment de chaque route de plateform", () => {
    // Lu comme du texte : importer le .ts du CMS embarquerait son tsconfig (Strapi), absent des dépendances de plateform.
    const reserved = [...readFileSync(new URL("../../../../cms/src/api/page/reserved-slugs.ts", import.meta.url), "utf8").matchAll(/^ {2}"([^"]+)",$/gm)].map(([, slug]) => slug);
    expect(reserved.length).toBeGreaterThan(0);
    const routes = readFileSync(new URL("../../routes.ts", import.meta.url), "utf8");
    // Routes de premier niveau uniquement (indentation de 2 espaces) ; la route splat du CMS est exclue.
    const roots = [...routes.matchAll(/^ {2}route\("([^"*]+)"/gm)].map(([, path]) => path.split("/")[0]);
    expect(roots.filter((root) => !reserved.includes(root))).toEqual([]);
  });
});
