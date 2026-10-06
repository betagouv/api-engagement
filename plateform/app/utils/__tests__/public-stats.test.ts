import { describe, expect, it } from "vitest";
import { sortDepartments, toAnswerRows, toDepartmentPoints, toWeeklyPoints, type MetabaseCardResult } from "../public-stats";

const card = (rows: unknown[][], cols: string[] = ["a", "b"]): MetabaseCardResult => ({ data: { rows, cols: cols.map((name) => ({ name })) } });

describe("toWeeklyPoints", () => {
  it("trie les semaines par date et les formate en jj/mm/aa", () => {
    const result = toWeeklyPoints(
      card([
        ["2026-09-28T12:00:00Z", 165],
        ["2026-09-21T12:00:00Z", 287],
      ]),
    );

    expect(result).toEqual([
      { name: "21/09/26", value: 287 },
      { name: "28/09/26", value: 165 },
    ]);
  });
});

describe("toDepartmentPoints", () => {
  it("lit le code, le nom et le nombre (3e colonne)", () => {
    const result = toDepartmentPoints(
      card([
        ["75", "Paris", 25],
        ["-", "Non renseigné", "16"],
      ]),
    );

    expect(result).toEqual([
      { code: "75", nom: "Paris", value: 25 },
      { code: "-", nom: "Non renseigné", value: 16 },
    ]);
  });
});

describe("sortDepartments", () => {
  it("trie par numéro, 2A/2B entre 19 et 21, DOM après, non renseigné en dernier, sans muter l'entrée", () => {
    const input = ["-", "974", "2B", "75", "01", "21", "2A", "19"].map((code) => ({ code, nom: code, value: 1 }));

    expect(sortDepartments(input).map((d) => d.code)).toEqual(["01", "19", "2A", "2B", "21", "75", "974", "-"]);
    expect(input[0].code).toBe("-");
  });
});

describe("toAnswerRows", () => {
  it("associe chaque réponse à sa question et ignore les cards en erreur", () => {
    const result = toAnswerRows([
      ["Âge", card([["18-20 ans", 5, 0.1]])],
      ["Région", null],
      ["Rythme souhaité", card([["Sport", "2", 0.2]])],
    ]);

    expect(result).toEqual([
      { question: "Âge", answer: "18-20 ans", value: 5 },
      { question: "Rythme souhaité", answer: "Sport", value: 2 },
    ]);
  });
});
