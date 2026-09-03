import { describe, expect, it } from "vitest";
import type { MissionMatchItem } from "@engagement/dto";
import { buildMissionApplicationHref, buildMissionMatchTags, formatCompensation, formatMissionType, formatStartDate, matchResultToBrowseMission } from "../mission";

describe("formatStartDate", () => {
  it("retourne null si startAt et duration sont tous les deux null", () => {
    expect(formatStartDate(null, null)).toBeNull();
  });

  it("retourne seulement la durée si startAt est null", () => {
    expect(formatStartDate(null, 6)).toBe("6 mois");
  });

  it("retourne seulement la date si duration est null", () => {
    expect(formatStartDate("2025-09-01T00:00:00.000Z", null)).toBe("À partir du 1 septembre");
  });

  it("combine durée et date", () => {
    expect(formatStartDate("2025-09-01T00:00:00.000Z", 3)).toBe("3 mois à partir du 1 septembre");
  });
});

describe("formatCompensation", () => {
  it("retourne null si amount est null", () => {
    expect(formatCompensation({ amount: null, amountMax: null, unit: null, type: null })).toBeNull();
  });

  it("formate un montant simple", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: null })).toBe("1000€");
  });

  it("formate une plage de montants", () => {
    expect(formatCompensation({ amount: 1000, amountMax: 1500, unit: null, type: null })).toBe("Entre 1000 et 1500€");
    expect(formatCompensation({ amount: 600, amountMax: 800, unit: "month", type: null })).toBe("Entre 600 et 800€ par mois");
  });

  it('affiche "Jusqu\'à" quand le minimum est 0 et un maximum est défini', () => {
    expect(formatCompensation({ amount: 0, amountMax: 1500, unit: null, type: null })).toBe("Jusqu'à 1500€");
    expect(formatCompensation({ amount: 0, amountMax: 800, unit: "month", type: null })).toBe("Jusqu'à 800€ par mois");
  });

  it("ignore le type par défaut", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: "net" })).toBe("1000€");
  });

  it("inclut le type (brut/net) avec withType", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: "net" }, { withType: true })).toBe("1000€ net");
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: null, type: "gross" }, { withType: true })).toBe("1000€ brut");
  });

  it("inclut l'unité", () => {
    expect(formatCompensation({ amount: 500, amountMax: null, unit: "month", type: null })).toBe("500€ par mois");
    expect(formatCompensation({ amount: 12, amountMax: null, unit: "hour", type: null })).toBe("12€ par heure");
  });

  it("combine montant, type et unité avec withType", () => {
    expect(formatCompensation({ amount: 1000, amountMax: null, unit: "month", type: "net" }, { withType: true })).toBe("1000€ net par mois");
  });

  it("préserve les unités inconnues telles quelles", () => {
    expect(formatCompensation({ amount: 100, amountMax: null, unit: "custom_unit", type: null })).toBe("100€ par custom_unit");
  });

  it("formate l'unité en compact", () => {
    expect(formatCompensation({ amount: 620, amountMax: null, unit: "month", type: null }, { compact: true })).toBe("620€/mois");
    expect(formatCompensation({ amount: 620, amountMax: null, unit: null, type: null }, { compact: true })).toBe("620€");
  });
});

describe("formatMissionType", () => {
  it('retourne "Mission" si le type est null', () => {
    expect(formatMissionType(null)).toBe("Mission");
  });

  it("retourne le label correspondant", () => {
    expect(formatMissionType("benevolat")).toBe("Mission de bénévolat");
    expect(formatMissionType("volontariat_service_civique")).toBe("Mission de Service Civique");
    expect(formatMissionType("emploi")).toBe("Emploi");
    expect(formatMissionType("stage")).toBe("Stage");
  });

  it('retourne "Mission" pour un type inconnu', () => {
    expect(formatMissionType("type_inconnu")).toBe("Mission");
  });
});

describe("buildMissionApplicationHref", () => {
  it("ajoute le user_scoring_id à l'URL trackée", () => {
    const href = buildMissionApplicationHref("https://api.example.com/r/mission/publisher?tags=featured", "cc37f4b5-a145-43e7-9f9b-05f6c5635341");

    const params = new URL(href).searchParams;
    expect(params.get("tags")).toBe("featured");
    expect(params.get("user_scoring_id")).toBe("cc37f4b5-a145-43e7-9f9b-05f6c5635341");
  });

  it("conserve l'URL inchangée sans user_scoring_id", () => {
    expect(buildMissionApplicationHref("https://api.example.com/r/mission/publisher", undefined)).toBe("https://api.example.com/r/mission/publisher");
  });
});

describe("buildMissionMatchTags", () => {
  const buildItem = (missionCardTagKeys: string[], city: string | null = null): MissionMatchItem => ({
    mission: {
      id: "mission",
      title: "Mission",
      remote: null,
      schedule: null,
      domain: null,
      domainOriginal: null,
      organizationName: null,
      publisherId: null,
      publisherName: null,
      media: { photo: null, domainLogo: null, organizationLogo: null, publisherLogo: null },
      location: { city, closestLat: null, closestLon: null, closestAddress: null, addressId: null, distanceKm: null },
      compensation: null,
      applicationUrl: "https://example.com",
    },
    match: {
      missionScoringId: "mission-scoring",
      totalScore: 0.8,
      taxonomyScore: 0.9,
      geoScore: null,
      taxonomyScores: {},
      values: [],
      missionCardTagKeys,
    },
  });

  it("résout les clés de taxonomie en libellés, dans l'ordre renvoyé par l'API", () => {
    const item = buildItem(["equipe.petit_groupe", "imprevu.adaptation_rapide"]);

    expect(buildMissionMatchTags(item)).toEqual(["Une équipe de moins de 10 bénévoles", "Un environnement dynamique"]);
  });

  it("résout la clé « city » avec la ville de la mission", () => {
    expect(buildMissionMatchTags(buildItem(["city", "equipe.petit_groupe"], "Grenoble"))).toEqual(["Grenoble", "Une équipe de moins de 10 bénévoles"]);
  });

  it("ignore la clé « city » quand la mission n'a pas de ville", () => {
    expect(buildMissionMatchTags(buildItem(["city"]))).toEqual([]);
  });

  it("ignore les clés inconnues et les valeurs de taxonomie sans tag", () => {
    expect(buildMissionMatchTags(buildItem(["inconnu", "equipe.valeur_inexistante", "statut.lyceen"]))).toEqual([]);
  });

  it("déduplique les libellés identiques", () => {
    expect(buildMissionMatchTags(buildItem(["motivation_recherche.remote", "motivation_recherche.remote"]))).toEqual(["À distance"]);
  });

  it("limite le nombre de tags à 6", () => {
    const item = buildItem(
      [
        "motivation_recherche.remote",
        "motivation_recherche.premiere_experience",
        "motivation_recherche.agir_pour_une_cause",
        "city",
        "equipe.petit_groupe",
        "imprevu.adaptation_rapide",
        "interaction.interaction_collective",
      ],
      "Grenoble",
    );

    expect(buildMissionMatchTags(item)).toEqual([
      "À distance",
      "Idéal pour débuter",
      "Une mission qui a du sens",
      "Grenoble",
      "Une équipe de moins de 10 bénévoles",
      "Un environnement dynamique",
    ]);
  });

  it("retourne une liste vide quand l'API ne renvoie pas encore les clés de tags", () => {
    const item = buildItem([]);
    delete item.match.missionCardTagKeys;

    expect(buildMissionMatchTags(item)).toEqual([]);
  });
});

describe("matchResultToBrowseMission", () => {
  it("conserve la valeur remote local", () => {
    const item: MissionMatchItem = {
      mission: {
        id: "mission-local",
        title: "Mission près de chez moi",
        remote: "local",
        schedule: "Quelques jours par mois",
        domain: "solidarite",
        domainOriginal: null,
        organizationName: "Organisation",
        publisherId: "publisher",
        publisherName: "Publisher",
        media: {
          photo: null,
          domainLogo: null,
          organizationLogo: null,
          publisherLogo: null,
        },
        location: {
          city: null,
          closestLat: null,
          closestLon: null,
          closestAddress: null,
          addressId: null,
          distanceKm: null,
        },
        compensation: null,
        applicationUrl: "https://example.com",
      },
      match: {
        missionScoringId: "mission-scoring",
        totalScore: 0.8,
        taxonomyScore: 0.9,
        geoScore: 0.7,
        taxonomyScores: {},
        values: [],
      },
    };

    expect(matchResultToBrowseMission(item).remote).toBe("local");
  });
});
