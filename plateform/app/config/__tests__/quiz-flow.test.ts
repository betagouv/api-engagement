import { describe, expect, it } from "vitest";
import { QUIZ_FLOW_REGISTRY, QUIZ_FLOW_VERSION, type StepDef, type StepId } from "~/config/quiz-flow";

// Steps dont le component rend une liste d'options : sans `options` déclarées dans le flow,
// la question s'afficherait vide sans erreur de compilation.
const STEPS_WITH_OPTIONS: StepId[] = ["handicap", "mobilite", "motivation_recherche", "rythme", "domaine_engagement", "activite", "equipe", "interaction", "autonomie", "imprevu"];

const optionsOf = (flow: StepDef[], stepId: StepId) => flow.find((step) => step.id === stepId)?.options ?? [];

describe("parcours q3", () => {
  const stepIds = QUIZ_FLOW_REGISTRY.q3.map((step) => step.id);

  it("est la version active du parcours", () => {
    expect(QUIZ_FLOW_VERSION).toBe("q3");
  });

  it("enchaîne les steps dans l'ordre attendu, sans interaction ni imprevu et autonomie en dernier", () => {
    expect(stepIds).toEqual(["age", "handicap", "localisation", "mobilite", "motivation_recherche", "rythme", "domaine_engagement", "activite", "equipe", "autonomie"]);
  });

  it("retire les réponses que q2 proposait encore, sans toucher au parcours q2", () => {
    expect(optionsOf(QUIZ_FLOW_REGISTRY.q2, "motivation_recherche")).toContain("motivation_recherche.horaires_flexibles");
    expect(optionsOf(QUIZ_FLOW_REGISTRY.q3, "motivation_recherche")).not.toContain("motivation_recherche.horaires_flexibles");
    expect(optionsOf(QUIZ_FLOW_REGISTRY.q2, "equipe")).toContain("equipe.autonomie");
    expect(optionsOf(QUIZ_FLOW_REGISTRY.q3, "equipe")).not.toContain("equipe.autonomie");
  });

  it("conserve interaction et imprevu dans q2 pour permettre un rollback", () => {
    expect(QUIZ_FLOW_REGISTRY.q2.map((step) => step.id)).toEqual(expect.arrayContaining(["interaction", "imprevu"]));
  });
});

describe("registre des parcours", () => {
  it("déclare les options de tous les steps qui en rendent une liste", () => {
    for (const [version, flow] of Object.entries(QUIZ_FLOW_REGISTRY)) {
      for (const step of flow) {
        if (!STEPS_WITH_OPTIONS.includes(step.id)) continue;
        expect(step.options ?? [], `${version} / ${step.id}`).not.toHaveLength(0);
      }
    }
  });
});
