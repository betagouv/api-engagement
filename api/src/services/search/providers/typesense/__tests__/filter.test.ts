import { describe, expect, it } from "vitest";

import {
  buildSearchBooleanFilter,
  buildSearchEqualFilter,
  buildSearchListFilter,
  buildSearchNotEqualFilter,
  buildSearchNotListFilter,
  buildSearchNumberFilter,
  buildSearchPartialFilter,
  buildSearchPrefixFilter,
  combineSearchAnd,
  combineSearchOr,
} from "@/services/search/providers/typesense/filter";

describe("search filter helpers", () => {
  it("échappe les valeurs dans les filtres", () => {
    expect(buildSearchEqualFilter("publisherId", "pub`\\1")).toBe("publisherId:=`pub\\`\\\\1`");
    expect(buildSearchNotEqualFilter("publisherId", "pub-1")).toBe("publisherId:!=`pub-1`");
  });

  it("construit les filtres liste", () => {
    expect(buildSearchListFilter("publisherId", ["pub-1", "pub-2"])).toBe("publisherId:=[`pub-1`,`pub-2`]");
    expect(buildSearchNotListFilter("publisherId", ["pub-1", "pub-2"])).toBe("publisherId:![`pub-1`,`pub-2`]");
  });

  it("construit les filtres textuels, booléens et numériques", () => {
    expect(buildSearchPartialFilter("title", "aide sociale")).toBe("title:`aide sociale`");
    expect(buildSearchPrefixFilter("title", "Aide")).toBe("title:`Aide`*");
    expect(buildSearchBooleanFilter("openToMinors", true)).toBe("openToMinors:=true");
    expect(buildSearchNumberFilter("duration", "<=", 30)).toBe("duration:<=30");
  });

  it("combine les filtres", () => {
    expect(combineSearchAnd(["a:=`1`", "b:=`2`"])).toBe("(a:=`1` && b:=`2`)");
    expect(combineSearchOr(["a:=`1`", "b:=`2`"])).toBe("(a:=`1` || b:=`2`)");
  });
});
