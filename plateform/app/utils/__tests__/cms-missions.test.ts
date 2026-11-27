import { describe, expect, it } from "vitest";

import { buildCarouselFilters, resolveCmsButton } from "~/utils/cms-missions";

const slots = [
  { dispositif: "benevolat", domaineEngagement: "sport" },
  { dispositif: "reserve_gendarmerie", domaineEngagement: null },
];

describe("buildCarouselFilters", () => {
  it("applique la tranche d'âge aux missions mises en avant et au complément aléatoire", () => {
    expect(buildCarouselFilters({ slots, fillWithRandom: true, trancheAge: "moins_18_ans" }, 3)).toEqual([
      { dispositif: "benevolat", domaine_engagement: "sport", tranche_age: "moins_18_ans", pageSize: 1 },
      { dispositif: "reserve_gendarmerie", tranche_age: "moins_18_ans", pageSize: 1 },
      { tranche_age: "moins_18_ans", pageSize: 10, page: 3 },
    ]);
  });

  it("ne filtre pas sur l'âge sans tranche choisie, et n'ajoute pas de complément s'il est désactivé", () => {
    expect(buildCarouselFilters({ slots: [slots[1]], fillWithRandom: false, trancheAge: null }, 1)).toEqual([{ dispositif: "reserve_gendarmerie", pageSize: 1 }]);
  });
});

describe("resolveCmsButton", () => {
  const fallback = { to: "/quiz/age", label: "Trouver ma mission" };

  it("prend le bouton du bloc quand le libellé et le lien sont renseignés", () => {
    expect(resolveCmsButton({ label: "Voir toutes les missions", url: "/missions" }, fallback)).toEqual({ to: "/missions", label: "Voir toutes les missions" });
  });

  it("garde le bouton par défaut s'il manque l'un des deux", () => {
    expect(resolveCmsButton({ label: "Voir", url: null }, fallback)).toEqual(fallback);
    expect(resolveCmsButton({ label: "", url: "/missions" }, fallback)).toEqual(fallback);
    expect(resolveCmsButton(undefined, fallback)).toEqual(fallback);
  });
});
