import { describe, expect, it } from "vitest";
import type { StepDef, StepId } from "~/config/quiz-flow";
import type { QuizAnswers } from "~/types/quiz";
import { screenAnswer } from "~/utils/conditions";
import { buildPayload, refreshSteps } from "../quiz";

const step = (id: StepId, condition?: StepDef["condition"]): StepDef => ({ id, route: `/quiz/${id}`, condition });

describe("refreshSteps", () => {
  const flow: StepDef[] = [step("age"), step("handicap", screenAnswer("age", "26_30")), step("statut"), step("localisation")];

  it("inclut tous les steps sans condition ou dont la condition est vraie", () => {
    const answers: QuizAnswers = { age: { type: "options", taxonomy: "age", option_ids: ["26_30"] } };
    const { steps } = refreshSteps(flow, "age", answers);
    expect(steps.map((s) => s.id)).toEqual(["age", "handicap", "statut", "localisation"]);
  });

  it("exclut les steps dont la condition est fausse", () => {
    const answers: QuizAnswers = { age: { type: "options", taxonomy: "age", option_ids: ["18_25"] } };
    const { steps } = refreshSteps(flow, "age", answers);
    expect(steps.map((s) => s.id)).toEqual(["age", "statut", "localisation"]);
  });

  it("retourne le step courant, le précédent et le suivant corrects", () => {
    const answers: QuizAnswers = {};
    const { current, prev, next } = refreshSteps(flow, "statut", answers);
    expect(current?.id).toBe("statut");
    expect(prev?.id).toBe("age");
    expect(next?.id).toBe("localisation");
  });

  it("retourne prev null pour le premier step", () => {
    const { prev } = refreshSteps(flow, "age", {});
    expect(prev).toBeNull();
  });

  it("retourne next null pour le dernier step", () => {
    const { next } = refreshSteps(flow, "localisation", {});
    expect(next).toBeNull();
  });

  it("retourne current null si le stepId n'est pas dans le flow filtré", () => {
    const answers: QuizAnswers = { age: { type: "options", taxonomy: "age", option_ids: ["18_25"] } };
    const { current } = refreshSteps(flow, "handicap", answers);
    expect(current).toBeNull();
  });
});

describe("buildPayload", () => {
  it("convertit les réponses options en entrées taxonomy/value (une par option_id)", () => {
    const answers: QuizAnswers = {
      motivation: { type: "options", taxonomy: "engagement_intent", option_ids: ["me_sentir_utile", "reprendre_confiance"] },
    };
    expect(buildPayload(answers)).toEqual({
      answers: [
        { taxonomy: "engagement_intent", value: "me_sentir_utile" },
        { taxonomy: "engagement_intent", value: "reprendre_confiance" },
      ],
    });
  });

  it("convertit les réponses params en entrée taxonomy/params", () => {
    const answers: QuizAnswers = {
      localisation: { type: "params", taxonomy: "location", params: { lat: 48.8566, lon: 2.3522 } },
    };
    expect(buildPayload(answers)).toEqual({
      answers: [{ taxonomy: "location", params: { lat: 48.8566, lon: 2.3522 } }],
    });
  });

  it("ignore les réponses de type numeric et text", () => {
    const answers: QuizAnswers = {
      age: { type: "numeric", value: 28 },
    };
    expect(buildPayload(answers)).toEqual({ answers: [] });
  });

  it("retourne un payload vide si aucune réponse", () => {
    expect(buildPayload({})).toEqual({ answers: [] });
  });

  it("combine plusieurs types de réponses", () => {
    const answers: QuizAnswers = {
      motivation: { type: "options", taxonomy: "engagement_intent", option_ids: ["me_sentir_utile"] },
      localisation: { type: "params", taxonomy: "location", params: { lat: 1, lon: 2 } },
      age: { type: "numeric", value: 20 },
    };
    const { answers: result } = buildPayload(answers);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ taxonomy: "engagement_intent", value: "me_sentir_utile" });
    expect(result).toContainEqual({ taxonomy: "location", params: { lat: 1, lon: 2 } });
  });
});
