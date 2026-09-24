import { describe, expect, it } from "vitest";

import { buildScTitle, stripHtml, truncate } from "@/jobs/leboncoin/utils";

describe("buildScTitle", () => {
  it("laisse le titre intact quand il fait 82 caractères ou moins", () => {
    expect(buildScTitle("Aider les personnes âgées")).toBe("Service Civique - Aider les personnes âgées");
  });

  it("réduit les espaces multiples et trim", () => {
    expect(buildScTitle("  Aider   les   jeunes  ")).toBe("Service Civique - Aider les jeunes");
  });

  it("tronque au dernier espace avant 81 et ajoute … (exemple de la spec, 98 caractères)", () => {
    const title = "Accompagner les personnes âgées isolées dans leurs démarches administratives et leurs sorties culturelles";
    const result = buildScTitle(title);
    expect(result).toBe("Service Civique - Accompagner les personnes âgées isolées dans leurs démarches administratives et…");
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.endsWith("…")).toBe(true);
    expect(result.endsWith(" …")).toBe(false);
  });

  it("retire la ponctuation finale avant le …", () => {
    const title = "Accompagner les personnes âgées isolées dans leurs démarches administratives, et faire des sorties";
    expect(buildScTitle(title).endsWith(",…")).toBe(false);
  });

  it("coupe sèchement un mot unique très long sans espace", () => {
    const title = "A".repeat(120);
    const result = buildScTitle(title);
    expect(result).toBe(`Service Civique - ${"A".repeat(81)}…`);
  });
});

describe("stripHtml", () => {
  it("retire les balises HTML", () => {
    expect(stripHtml("<h2>Titre</h2><p>Texte</p>")).toContain("Titre");
    expect(stripHtml("<h2>Titre</h2><p>Texte</p>")).not.toContain("<");
  });

  it("retourne une chaîne vide pour null/undefined", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
  });
});

describe("truncate", () => {
  it("tronque à la longueur max", () => {
    expect(truncate("abcdef", 3)).toBe("abc");
    expect(truncate("abc", 10)).toBe("abc");
  });
});
