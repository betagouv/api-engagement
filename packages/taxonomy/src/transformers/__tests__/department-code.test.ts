import { describe, expect, it } from "vitest";
import { resolveDepartmentCodeValues } from "../department-code";

describe("resolveDepartmentCodeValues", () => {
  it("résout un code unique passé en chaîne", () => {
    expect(resolveDepartmentCodeValues({ code: "75" })).toEqual(["75"]);
  });

  it("résout un tableau de codes", () => {
    expect(resolveDepartmentCodeValues({ codes: ["75", "13"] })).toEqual(["75", "13"]);
  });

  it("retire le préfixe FR- et met en majuscules", () => {
    expect(resolveDepartmentCodeValues({ code: "fr-2a" })).toEqual(["2A"]);
  });

  it("trim les espaces", () => {
    expect(resolveDepartmentCodeValues({ code: "  75  " })).toEqual(["75"]);
  });

  it("lève une erreur pour un code inconnu", () => {
    expect(() => resolveDepartmentCodeValues({ code: "999" })).toThrow(/Unknown departmentCode/);
  });

  it("lève une erreur si params n'est pas un objet", () => {
    expect(() => resolveDepartmentCodeValues("75")).toThrow(/must be an object/);
  });

  it("lève une erreur si la liste de codes est vide", () => {
    expect(() => resolveDepartmentCodeValues({ codes: [] })).toThrow(/string or an array of strings/);
  });

  it("lève une erreur si un élément n'est pas une chaîne", () => {
    expect(() => resolveDepartmentCodeValues({ codes: ["75", 13] })).toThrow(/string or an array of strings/);
  });
});
