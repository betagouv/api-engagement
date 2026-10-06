import { describe, expect, it } from "vitest";
import { QUIZ_FLOW_REGISTRY, QUIZ_FLOW_VERSION, type StepDef, type StepId } from "~/config/quiz-flow";

// Steps dont le component rend une liste d'options : sans `options` déclarées dans le flow,
// la question s'afficherait vide sans erreur de compilation.
const STEPS_WITH_OPTIONS: StepId[] = ["handicap", "mobilite", "motivation_recherche", "rythme", "domaine_engagement", "activite", "equipe", "autonomie"];

const optionsOf = (flow: StepDef[], stepId: StepId) => flow.find((step) => step.id === stepId)?.options ?? [];

describe("parcours q4", () => {
  const stepIds = QUIZ_FLOW_REGISTRY.q4.map((step) => step.id);

  it("est la version active du parcours", () => {
    expect(QUIZ_FLOW_VERSION).toBe("q4");
  });

  it("enchaîne les steps dans l'ordre attendu, sans equipe et avec l'email en dernier", () => {
    expect(stepIds).toEqual(["age", "handicap", "localisation", "mobilite", "motivation_recherche", "rythme", "domaine_engagement", "activite", "autonomie", "email"]);
  });

  it("conserve equipe et n'a pas d'email dans q3 pour permettre un rollback", () => {
    const q3Ids = QUIZ_FLOW_REGISTRY.q3.map((step) => step.id);
    expect(q3Ids).toContain("equipe");
    expect(q3Ids).not.toContain("email");
  });

  it("propose la réponse Parcoursup", () => {
    expect(optionsOf(QUIZ_FLOW_REGISTRY.q4, "motivation_recherche")).toContain("motivation_recherche.parcoursup");
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
