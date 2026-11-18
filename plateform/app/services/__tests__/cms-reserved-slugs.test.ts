import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { RESERVED_SLUGS } from "../../../../cms/src/api/page/reserved-slugs";

describe("slugs réservés du CMS", () => {
  it("couvre le premier segment de chaque route de plateform", () => {
    const routes = readFileSync(new URL("../../routes.ts", import.meta.url), "utf8");
    // Routes de premier niveau uniquement (indentation de 2 espaces) ; la route splat du CMS est exclue.
    const roots = [...routes.matchAll(/^ {2}route\("([^"*]+)"/gm)].map(([, path]) => path.split("/")[0]);
    expect(roots.filter((root) => !RESERVED_SLUGS.includes(root))).toEqual([]);
  });
});
