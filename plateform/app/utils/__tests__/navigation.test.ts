import { describe, expect, it } from "vitest";
import { resolveNavigationLinks } from "../navigation";

const link = (overrides: object) => ({ label: "Lien", url: null, newTab: false, page: null, ...overrides });

describe("resolveNavigationLinks", () => {
  it("préfère la page choisie à l'URL libre et suit son adresse", () => {
    expect(resolveNavigationLinks([link({ page: { slug: "a-propos" }, url: "/autre" })])).toEqual([{ label: "Lien", to: "/cms/a-propos", internal: true, newTab: false }]);
  });

  it("ignore un lien vers une page dépubliée sans URL de repli", () => {
    expect(resolveNavigationLinks([link({})])).toEqual([]);
  });

  it("ouvre une adresse externe dans un nouvel onglet et garde les chemins internes", () => {
    const links = resolveNavigationLinks([link({ url: "https://exemple.org" }), link({ url: "/quiz" }), link({ url: "/blog", newTab: true })]);
    expect(links.map(({ internal, newTab }) => ({ internal, newTab }))).toEqual([
      { internal: false, newTab: true },
      { internal: true, newTab: false },
      { internal: true, newTab: true },
    ]);
  });

  it("retire les URL dangereuses et les libellés vides", () => {
    expect(resolveNavigationLinks([link({ url: "javascript:alert(1)" }), link({ url: "//evil.example" }), link({ url: "/ok", label: "  " })])).toEqual([]);
  });

  it("accepte mailto sans nouvel onglet", () => {
    expect(resolveNavigationLinks([link({ url: "mailto:a@b.fr" })])).toEqual([{ label: "Lien", to: "mailto:a@b.fr", internal: false, newTab: false }]);
  });
});
