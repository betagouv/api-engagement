import { describe, expect, it } from "vitest";
import { blogListUrl, formatArticleDate, parseBlogQuery } from "../blog";

describe("parseBlogQuery", () => {
  it("lit la page et la catégorie", () => {
    expect(parseBlogQuery(new URLSearchParams("page=3&categorie=benevolat"))).toEqual({ page: 3, category: "benevolat" });
  });

  it("borne la page et ignore une catégorie qui n'est pas un slug", () => {
    expect(parseBlogQuery(new URLSearchParams("page=-4&categorie=A b"))).toEqual({ page: 1, category: undefined });
    expect(parseBlogQuery(new URLSearchParams("page=999999"))).toEqual({ page: 1000, category: undefined });
    expect(parseBlogQuery(new URLSearchParams("page=abc"))).toEqual({ page: 1, category: undefined });
  });
});

describe("blogListUrl", () => {
  it("n'ajoute pas de paramètre pour la première page sans catégorie", () => {
    expect(blogListUrl()).toBe("/blog");
    expect(blogListUrl({ page: 1, category: "sport" })).toBe("/blog?categorie=sport");
    expect(blogListUrl({ page: 2, category: "sport" })).toBe("/blog?categorie=sport&page=2");
  });
});

describe("formatArticleDate", () => {
  it("formate la date en français sans décalage de fuseau", () => {
    expect(formatArticleDate("2026-10-01")).toBe("1 octobre 2026");
  });
});
