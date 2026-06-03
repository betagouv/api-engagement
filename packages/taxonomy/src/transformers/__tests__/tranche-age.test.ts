import { describe, expect, it } from "vitest";
import { resolveTrancheAgeValues } from "../tranche-age";

describe("resolveTrancheAgeValues", () => {
  it("classe les moins de 16 ans", () => {
    expect(resolveTrancheAgeValues({ age: 15 })).toEqual(["moins_18_ans"]);
  });

  it("ajoute le bucket caché 16-17 ans", () => {
    expect(resolveTrancheAgeValues({ age: 16 })).toEqual(["moins_18_ans", "entre_16_17_ans"]);
  });

  it("classe les 18-25 ans", () => {
    expect(resolveTrancheAgeValues({ age: 18 })).toEqual(["entre_18_25_ans"]);
  });

  it("classe les 25-30 ans", () => {
    expect(resolveTrancheAgeValues({ age: 30 })).toEqual(["entre_25_30_ans"]);
  });

  it("classe les 30-45 ans", () => {
    expect(resolveTrancheAgeValues({ age: 45 })).toEqual(["entre_30_45_ans"]);
  });

  it("ajoute le bucket caché 46-66 ans sous 67 ans", () => {
    expect(resolveTrancheAgeValues({ age: 66 })).toEqual(["entre_46_67_ans", "entre_46_66_ans"]);
  });

  it("n'ajoute pas le bucket caché à 67 ans pile", () => {
    expect(resolveTrancheAgeValues({ age: 67 })).toEqual(["entre_46_67_ans"]);
  });

  it("classe les 68-72 ans", () => {
    expect(resolveTrancheAgeValues({ age: 72 })).toEqual(["entre_68_72_ans"]);
  });

  it("classe les plus de 72 ans", () => {
    expect(resolveTrancheAgeValues({ age: 73 })).toEqual(["plus_72_ans"]);
  });

  it("ajoute moins_31_ans_handicap pour les moins de 31 ans en situation de handicap", () => {
    expect(resolveTrancheAgeValues({ age: 25, handicap: true })).toEqual(["entre_18_25_ans", "moins_31_ans_handicap"]);
  });

  it("n'ajoute pas le bucket handicap à 31 ans et plus", () => {
    expect(resolveTrancheAgeValues({ age: 31, handicap: true })).toEqual(["entre_30_45_ans"]);
  });

  it("lève une erreur si l'âge n'est pas un entier", () => {
    expect(() => resolveTrancheAgeValues({ age: 25.5 })).toThrow(/integer between 0 and 120/);
  });

  it("lève une erreur si l'âge est hors bornes", () => {
    expect(() => resolveTrancheAgeValues({ age: 121 })).toThrow(/integer between 0 and 120/);
  });

  it("lève une erreur si handicap n'est pas un booléen", () => {
    expect(() => resolveTrancheAgeValues({ age: 25, handicap: "oui" })).toThrow(/must be a boolean/);
  });

  it("lève une erreur si params n'est pas un objet", () => {
    expect(() => resolveTrancheAgeValues(25)).toThrow(/must be an object/);
  });
});
