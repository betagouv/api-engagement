import { getMissionCardTag } from "@engagement/taxonomy";
import { describe, expect, it } from "vitest";

import { buildMissionBrowseTags, buildMissionMatchTags, formatCompensation, type MissionCardInfo } from "../mission-card";

describe("formatCompensation", () => {
  it("retourne null si amount est null", () => {
    expect(formatCompensation({ amount: null, amountMax: null, unit: null, type: null })).toBeNull();
  });

  it("formate un montant simple", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: null })).toBe("1000\u00a0€");
  });

  it("formate une plage de montants", () => {
    expect(formatCompensation({ amount: 1000, amountMax: 1500, unit: null, type: null })).toBe("Entre 1000\u00a0€ et 1500\u00a0€");
    expect(formatCompensation({ amount: 600, amountMax: 800, unit: "month", type: null })).toBe("Entre 600\u00a0€ et 800\u00a0€ par mois");
  });

  it('affiche "Jusqu\'à" quand le minimum est 0 et un maximum est défini', () => {
    expect(formatCompensation({ amount: 0, amountMax: 1500, unit: null, type: null })).toBe("Jusqu'à 1500\u00a0€");
    expect(formatCompensation({ amount: 0, amountMax: 800, unit: "month", type: null })).toBe("Jusqu'à 800\u00a0€ par mois");
  });

  it("ignore le type par défaut", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: "net" })).toBe("1000\u00a0€");
  });

  it("inclut le type (brut/net) avec withType", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: "net" }, { withType: true })).toBe("1000\u00a0€ net");
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: "gross" }, { withType: true })).toBe("1000\u00a0€ brut");
  });

  it("inclut l'unité", () => {
    expect(formatCompensation({ amount: 500, amountMax: null, unit: "month", type: null })).toBe("500\u00a0€ par mois");
    expect(formatCompensation({ amount: 12, amountMax: null, unit: "hour", type: null })).toBe("12\u00a0€ par heure");
  });

  it("combine montant, type et unité avec withType", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: "month", type: "net" }, { withType: true })).toBe("1000\u00a0€ net par mois");
  });

  it("préserve les unités inconnues telles quelles", () => {
    expect(formatCompensation({ amount: 100, amountMax: null, unit: "custom_unit", type: null })).toBe("100\u00a0€ par custom_unit");
  });

  it("formate l'unité en compact", () => {
    expect(formatCompensation({ amount: 620, amountMax: null, unit: "month", type: null }, { compact: true })).toBe("620\u00a0€/mois");
    expect(formatCompensation({ amount: 620, amountMax: null, unit: null, type: null }, { compact: true })).toBe("620\u00a0€");
  });
});

describe("buildMissionBrowseTags", () => {
  it("retourne le lieu, le rythme et l'indemnité", () => {
    expect(
      buildMissionBrowseTags({ remote: null, city: "Eybens", schedule: "24 h à 30 h par semaine", compensation: { amount: 74, amountMax: 119, unit: "day", type: null } })
    ).toEqual(["Eybens", "24 h à 30 h par semaine", "Entre 74\u00a0€ et 119\u00a0€ par jour"]);
  });

  it("remplace la ville pour les missions à distance ou près de chez soi", () => {
    expect(buildMissionBrowseTags({ remote: "full", city: "Eybens", schedule: null, compensation: null })).toEqual(["À distance"]);
    expect(buildMissionBrowseTags({ remote: "local", city: "Eybens", schedule: null, compensation: null })).toEqual(["Près de chez moi"]);
  });
});

describe("buildMissionMatchTags", () => {
  const buildItem = (values: [string, string][], match: { taxonomyScores?: Record<string, number>; geoScore?: number | null } = {}, city: string | null = null) => ({
    match: {
      taxonomyScores: match.taxonomyScores ?? {},
      values: values.map(([taxonomyKey, taxonomyValueKey]) => ({ taxonomyKey, taxonomyValueKey })),
      geoScore: match.geoScore ?? null,
    },
    mission: { remote: null, city, schedule: null, compensation: null } as MissionCardInfo,
  });

  it("retourne les tags des valeurs demandées et portées par la mission, par score décroissant", () => {
    const item = buildItem(
      [
        ["imprevu", "adaptation_rapide"],
        ["equipe", "petit_groupe"],
      ],
      { taxonomyScores: { imprevu: 0.5, equipe: 1 } }
    );

    expect(buildMissionMatchTags(item.match, item.mission, new Set(["imprevu.adaptation_rapide", "equipe.petit_groupe"]), getMissionCardTag)).toEqual([
      "Une équipe de moins de 10 bénévoles",
      "Ça bouge beaucoup",
    ]);
  });

  it("ignore les valeurs non demandées par l'utilisateur et les taxonomies sans score", () => {
    const item = buildItem(
      [
        ["equipe", "grand_collectif"],
        ["interaction", "interaction_collective"],
      ],
      { taxonomyScores: { equipe: 1, interaction: 0 } }
    );

    expect(buildMissionMatchTags(item.match, item.mission, new Set(["equipe.petit_groupe", "interaction.interaction_collective"]), getMissionCardTag)).toEqual([]);
  });

  it("ajoute la ville quand le score géo est haut, ordonnée par score", () => {
    const item = buildItem([["imprevu", "cadre_previsible"]], { taxonomyScores: { imprevu: 0.5 }, geoScore: 0.98 }, "Grenoble");

    expect(buildMissionMatchTags(item.match, item.mission, new Set(["imprevu.cadre_previsible"]), getMissionCardTag)).toEqual(["Grenoble", "Un cadre stable"]);
  });

  it("n'ajoute pas la ville comme tag de matching quand le score géo est bas ou que la mission n'en a pas", () => {
    // Score géo bas : la ville n'est plus un tag de matching, mais elle revient via les tags standards.
    const farItem = buildItem([], { geoScore: 0.4 }, "Grenoble");
    const itemWithoutCity = buildItem([], { geoScore: 0.98 });
    expect(buildMissionMatchTags(farItem.match, farItem.mission, new Set(), getMissionCardTag)).toEqual(["Grenoble"]);
    expect(buildMissionMatchTags(itemWithoutCity.match, itemWithoutCity.mission, new Set(), getMissionCardTag)).toEqual([]);
  });

  it("complète avec les tags standards quand le matching produit moins de 5 tags", () => {
    const item = buildItem([["equipe", "petit_groupe"]], { taxonomyScores: { equipe: 1 } });
    item.mission.remote = "full";
    item.mission.schedule = "Quelques heures par semaine";
    item.mission.compensation = { amount: 600, amountMax: null, unit: "month", type: "net" };

    expect(buildMissionMatchTags(item.match, item.mission, new Set(["equipe.petit_groupe"]), getMissionCardTag)).toEqual([
      "Une équipe de moins de 10 bénévoles",
      "À distance",
      "Quelques heures par semaine",
      "600\u00a0€ par mois",
    ]);
  });

  it("ne complète pas quand le matching produit déjà 5 tags", () => {
    const item = buildItem(
      [
        ["motivation_recherche", "remote"],
        ["motivation_recherche", "premiere_experience"],
        ["motivation_recherche", "agir_pour_une_cause"],
        ["equipe", "petit_groupe"],
        ["imprevu", "adaptation_rapide"],
      ],
      { taxonomyScores: { motivation_recherche: 1, equipe: 0.9, imprevu: 0.8 } }
    );
    item.mission.schedule = "Quelques heures par semaine";
    const userValueKeys = new Set([
      "motivation_recherche.remote",
      "motivation_recherche.premiere_experience",
      "motivation_recherche.agir_pour_une_cause",
      "equipe.petit_groupe",
      "imprevu.adaptation_rapide",
    ]);

    expect(buildMissionMatchTags(item.match, item.mission, userValueKeys, getMissionCardTag)).toEqual([
      "À distance",
      "Idéale pour débuter",
      "Utile à une cause",
      "Une équipe de moins de 10 bénévoles",
      "Ça bouge beaucoup",
    ]);
  });

  it("ignore les valeurs de taxonomie sans tag de carte", () => {
    const item = buildItem([["statut", "lyceen"]], { taxonomyScores: { statut: 1 } });

    expect(buildMissionMatchTags(item.match, item.mission, new Set(["statut.lyceen"]), getMissionCardTag)).toEqual([]);
  });

  it("limite le nombre de tags à 6", () => {
    const item = buildItem(
      [
        ["motivation_recherche", "remote"],
        ["motivation_recherche", "premiere_experience"],
        ["motivation_recherche", "agir_pour_une_cause"],
        ["equipe", "petit_groupe"],
        ["imprevu", "adaptation_rapide"],
        ["interaction", "interaction_collective"],
      ],
      { taxonomyScores: { motivation_recherche: 1, equipe: 0.9, imprevu: 0.8, interaction: 0.7 }, geoScore: 0.98 },
      "Grenoble"
    );
    const userValueKeys = new Set([
      "motivation_recherche.remote",
      "motivation_recherche.premiere_experience",
      "motivation_recherche.agir_pour_une_cause",
      "equipe.petit_groupe",
      "imprevu.adaptation_rapide",
      "interaction.interaction_collective",
    ]);

    expect(buildMissionMatchTags(item.match, item.mission, userValueKeys, getMissionCardTag)).toEqual([
      "À distance",
      "Idéale pour débuter",
      "Utile à une cause",
      "Grenoble",
      "Une équipe de moins de 10 bénévoles",
      "Ça bouge beaucoup",
    ]);
  });
});
