import { describe, expect, it } from "vitest";

import { getUserScoringRuleKeys, getUserScoringRuleValues } from "@/services/user-scoring/scoring-rules";

describe("getUserScoringRuleKeys", () => {
  it.each(["moins_18_ans", "entre_18_25_ans"])("déduit le Service Civique pour tranche_age.%s", (valueKey) => {
    expect(getUserScoringRuleKeys([{ taxonomyKey: "tranche_age", valueKey }])).toEqual(["dispositif.service_civique"]);
  });

  it("ne déduit rien en l'absence de règle", () => {
    expect(getUserScoringRuleKeys([{ taxonomyKey: "tranche_age", valueKey: "entre_25_30_ans" }])).toEqual([]);
  });

  it("ne duplique pas un dispositif produit par plusieurs valeurs", () => {
    expect(
      getUserScoringRuleKeys([
        { taxonomyKey: "tranche_age", valueKey: "moins_18_ans" },
        { taxonomyKey: "motivation_recherche", valueKey: "premiere_experience" },
      ])
    ).toEqual(["dispositif.service_civique", "dispositif.benevolat"]);
  });

  it.each([
    {
      taxonomyKey: "motivation_recherche",
      valueKey: "indemnisation",
      expected: ["dispositif.service_civique", "dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
    },
    {
      taxonomyKey: "motivation_recherche",
      valueKey: "securite_pays",
      expected: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
    },
    {
      taxonomyKey: "rythme",
      valueKey: "temps_plein_plusieurs_mois",
      expected: ["dispositif.service_civique"],
    },
    {
      taxonomyKey: "domaine_engagement",
      valueKey: "sante_bien_etre",
      expected: ["dispositif.sapeurs_pompiers"],
    },
    {
      taxonomyKey: "domaine_engagement",
      valueKey: "securite_secours",
      expected: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
    },
    {
      taxonomyKey: "domaine_engagement",
      valueKey: "sport",
      expected: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
    },
    {
      taxonomyKey: "domaine_engagement",
      valueKey: "citoyennete",
      expected: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
    },
    {
      taxonomyKey: "equipe",
      valueKey: "grand_collectif",
      expected: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
    },
    {
      taxonomyKey: "autonomie",
      valueKey: "accompagnement_initial",
      expected: ["dispositif.sapeurs_pompiers", "dispositif.reserve_gendarmerie", "dispositif.reserve_police_nationale", "dispositif.reserve_armees"],
    },
    {
      taxonomyKey: "activite",
      valueKey: "aider_accompagner",
      expected: ["dispositif.sapeurs_pompiers"],
    },
  ])("déduit les dispositifs configurés pour $taxonomyKey.$valueKey", ({ taxonomyKey, valueKey, expected }) => {
    expect(getUserScoringRuleKeys([{ taxonomyKey, valueKey }])).toEqual(expected);
  });
});

describe("getUserScoringRuleValues", () => {
  it("compte le nombre de règles qui déduisent chaque dispositif", () => {
    expect(
      getUserScoringRuleValues([
        { taxonomyKey: "tranche_age", valueKey: "moins_18_ans" },
        { taxonomyKey: "motivation_recherche", valueKey: "premiere_experience" },
      ])
    ).toEqual([
      { key: "dispositif.service_civique", score: 2 },
      { key: "dispositif.benevolat", score: 1 },
    ]);
  });

  it("cumule plusieurs signaux convergeant vers les mêmes dispositifs", () => {
    expect(
      getUserScoringRuleValues([
        { taxonomyKey: "tranche_age", valueKey: "entre_18_25_ans" },
        { taxonomyKey: "motivation_recherche", valueKey: "decouverte_metier" },
        { taxonomyKey: "rythme", valueKey: "quelques_jours_annee" },
      ])
    ).toEqual([
      { key: "dispositif.service_civique", score: 1 },
      { key: "dispositif.sapeurs_pompiers", score: 2 },
      { key: "dispositif.reserve_gendarmerie", score: 2 },
      { key: "dispositif.reserve_police_nationale", score: 2 },
      { key: "dispositif.reserve_armees", score: 2 },
    ]);
  });

  it("déduit les affinités prévues pour le domaine sécurité sans en ajouter pour l'activité secourir seule", () => {
    expect(
      getUserScoringRuleValues([
        { taxonomyKey: "domaine_engagement", valueKey: "securite_secours" },
        { taxonomyKey: "activite", valueKey: "secourir_proteger" },
      ])
    ).toEqual([
      { key: "dispositif.sapeurs_pompiers", score: 1 },
      { key: "dispositif.reserve_gendarmerie", score: 1 },
      { key: "dispositif.reserve_police_nationale", score: 1 },
      { key: "dispositif.reserve_armees", score: 1 },
    ]);

    expect(getUserScoringRuleValues([{ taxonomyKey: "activite", valueKey: "secourir_proteger" }])).toEqual([]);
  });
});
