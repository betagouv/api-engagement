import { describe, expect, it } from "vitest";

import { diffFilterAnswers } from "~/utils/results-filters";

describe("diffFilterAnswers", () => {
  it("ne renvoie rien quand rien ne change", () => {
    expect(diffFilterAnswers({ rythme: ["rythme.velo"] }, { rythme: ["rythme.velo"] })).toEqual([]);
  });

  it("ignore l'ordre des option_ids", () => {
    const baseline = { domaine_engagement: ["a", "b"] };
    const current = { domaine_engagement: ["b", "a"] };
    expect(diffFilterAnswers(baseline, current)).toEqual([]);
  });

  it("détecte un ajout (previous omis quand le filtre était vide)", () => {
    const changes = diffFilterAnswers({}, { equipe: ["equipe.autonomie"] });
    expect(changes).toEqual([{ stepId: "equipe", previous: undefined, new: "equipe.autonomie" }]);
  });

  it("remonte une chaîne pour une seule valeur, un tableau pour plusieurs", () => {
    const changes = diffFilterAnswers({ domaine_engagement: ["a"] }, { domaine_engagement: ["a", "c"] });
    expect(changes).toEqual([{ stepId: "domaine_engagement", previous: "a", new: ["a", "c"] }]);
  });

  it("remonte `[]` quand un filtre est vidé", () => {
    const changes = diffFilterAnswers({ mobilite: ["mobilite.velo"] }, { mobilite: [] });
    expect(changes).toEqual([{ stepId: "mobilite", previous: "mobilite.velo", new: [] }]);
  });

  it("renvoie un changement par filtre modifié", () => {
    const changes = diffFilterAnswers({ rythme: ["r1"], equipe: ["equipe.autonomie"] }, { rythme: ["r2"], equipe: ["equipe.petit_groupe"] });
    expect(changes.map((c) => c.stepId)).toEqual(["rythme", "equipe"]);
  });
});
