import { describe, expect, it } from "vitest";
import type { QuizAnswers } from "~/types/quiz";
import { and, anyScreenHasAnswer, evalCondition, not, numericRange, or, screenAnswer } from "../conditions";

const answers = (overrides: Partial<QuizAnswers> = {}): QuizAnswers => overrides as QuizAnswers;

describe("evalCondition", () => {
  describe("screen_answer", () => {
    it("retourne true si l'option est sélectionnée", () => {
      const a = answers({ age: { type: "options", taxonomy: "age", option_ids: ["18_25"] } });
      expect(evalCondition(screenAnswer("age", "18_25"), a)).toBe(true);
    });

    it("retourne false si l'option n'est pas sélectionnée", () => {
      const a = answers({ age: { type: "options", taxonomy: "age", option_ids: ["26_30"] } });
      expect(evalCondition(screenAnswer("age", "18_25"), a)).toBe(false);
    });

    it("retourne false si la réponse est absente", () => {
      expect(evalCondition(screenAnswer("age", "18_25"), answers())).toBe(false);
    });

    it("retourne false si le type de réponse n'est pas options", () => {
      const a = answers({ age: { type: "numeric", value: 25 } });
      expect(evalCondition(screenAnswer("age", "18_25"), a)).toBe(false);
    });
  });

  describe("any_screen_has_answer", () => {
    it("retourne true si au moins un screen a l'option", () => {
      const a = answers({
        age: { type: "options", taxonomy: "age", option_ids: ["18_25"] },
        handicap: { type: "options", taxonomy: "handicap", option_ids: ["oui"] },
      });
      expect(evalCondition(anyScreenHasAnswer(["age", "handicap"], "oui"), a)).toBe(true);
    });

    it("retourne false si aucun screen n'a l'option", () => {
      const a = answers({ age: { type: "options", taxonomy: "age", option_ids: ["18_25"] } });
      expect(evalCondition(anyScreenHasAnswer(["age", "handicap"], "oui"), a)).toBe(false);
    });
  });

  describe("numeric_range", () => {
    it("retourne true si la valeur est dans la plage", () => {
      const a = answers({ age: { type: "numeric", value: 28 } });
      expect(evalCondition(numericRange("age", 26, 30), a)).toBe(true);
    });

    it("retourne false si la valeur est en dessous du min", () => {
      const a = answers({ age: { type: "numeric", value: 25 } });
      expect(evalCondition(numericRange("age", 26, 30), a)).toBe(false);
    });

    it("retourne false si la valeur est au dessus du max", () => {
      const a = answers({ age: { type: "numeric", value: 31 } });
      expect(evalCondition(numericRange("age", 26, 30), a)).toBe(false);
    });

    it("fonctionne sans min (borne ouverte inférieure)", () => {
      const a = answers({ age: { type: "numeric", value: 10 } });
      expect(evalCondition(numericRange("age", undefined, 30), a)).toBe(true);
    });

    it("fonctionne sans max (borne ouverte supérieure)", () => {
      const a = answers({ age: { type: "numeric", value: 50 } });
      expect(evalCondition(numericRange("age", 26), a)).toBe(true);
    });

    it("retourne false si le type de réponse n'est pas numeric", () => {
      const a = answers({ age: { type: "options", taxonomy: "age", option_ids: ["26_30"] } });
      expect(evalCondition(numericRange("age", 26, 30), a)).toBe(false);
    });

    it("retourne false si la réponse est absente", () => {
      expect(evalCondition(numericRange("age", 26, 30), answers())).toBe(false);
    });
  });

  describe("and", () => {
    it("retourne true si toutes les conditions sont vraies", () => {
      const a = answers({
        age: { type: "numeric", value: 28 },
        handicap: { type: "options", taxonomy: "handicap", option_ids: ["oui"] },
      });
      expect(evalCondition(and(numericRange("age", 26, 30), screenAnswer("handicap", "oui")), a)).toBe(true);
    });

    it("retourne false si une condition est fausse", () => {
      const a = answers({
        age: { type: "numeric", value: 28 },
        handicap: { type: "options", taxonomy: "handicap", option_ids: ["non"] },
      });
      expect(evalCondition(and(numericRange("age", 26, 30), screenAnswer("handicap", "oui")), a)).toBe(false);
    });
  });

  describe("or", () => {
    it("retourne true si au moins une condition est vraie", () => {
      const a = answers({ motivation: { type: "options", taxonomy: "motivation", option_ids: ["me_sentir_utile"] } });
      expect(evalCondition(or(screenAnswer("motivation", "me_sentir_utile"), screenAnswer("motivation", "reprendre_confiance")), a)).toBe(true);
    });

    it("retourne false si aucune condition n'est vraie", () => {
      const a = answers({ motivation: { type: "options", taxonomy: "motivation", option_ids: ["autre"] } });
      expect(evalCondition(or(screenAnswer("motivation", "me_sentir_utile"), screenAnswer("motivation", "reprendre_confiance")), a)).toBe(false);
    });
  });

  describe("not", () => {
    it("inverse une condition vraie", () => {
      const a = answers({ age: { type: "options", taxonomy: "age", option_ids: ["18_25"] } });
      expect(evalCondition(not(screenAnswer("age", "18_25")), a)).toBe(false);
    });

    it("inverse une condition fausse", () => {
      expect(evalCondition(not(screenAnswer("age", "18_25")), answers())).toBe(true);
    });
  });

  describe("composition", () => {
    it("évalue des conditions imbriquées (and + or + not)", () => {
      const a = answers({
        age: { type: "numeric", value: 28 },
        motivation: { type: "options", taxonomy: "motivation", option_ids: ["me_sentir_utile"] },
        statut: { type: "options", taxonomy: "statut", option_ids: ["etudiant"] },
      });
      const condition = and(numericRange("age", 18, 30), or(screenAnswer("motivation", "me_sentir_utile"), screenAnswer("motivation", "reprendre_confiance")), not(screenAnswer("statut", "retraite")));
      expect(evalCondition(condition, a)).toBe(true);
    });
  });
});
