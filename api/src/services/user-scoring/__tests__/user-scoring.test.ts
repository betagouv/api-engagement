import { beforeEach, describe, expect, it, vi } from "vitest";

import { userScoringRepository } from "@/repositories/user-scoring";
import { userScoringService } from "@/services/user-scoring";

vi.mock("@/repositories/user-scoring", () => ({
  userScoringRepository: {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
  },
}));

const createMock = vi.mocked(userScoringRepository.create);

type PersistedValue = { taxonomyKey: string; valueKey: string; score: number };

const persistedValues = (): PersistedValue[] => {
  const arg = createMock.mock.calls[0][0];
  return arg.values as PersistedValue[];
};

const persistedKeys = (): string[] => {
  return persistedValues().map((value) => `${value.taxonomyKey}.${value.valueKey}`);
};

describe("userScoringService.create — filtrage des réponses neutres", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue({ id: "user-scoring-1" } as Awaited<ReturnType<typeof userScoringRepository.create>>);
  });

  it("ne persiste pas la valeur « je ne sais pas » d'un multi-choix, mais garde les vraies réponses", async () => {
    await userScoringService.create({
      missionAlertEnabled: false,
      answers: [
        { taxonomy: "rythme", value: "plusieurs_jours_semaine" },
        { taxonomy: "rythme", value: "je_ne_sais_pas" },
      ],
    });

    expect(persistedKeys()).toContain("rythme.plusieurs_jours_semaine");
    expect(persistedKeys()).not.toContain("rythme.je_ne_sais_pas");
  });

  it("retire complètement une taxonomie répondue uniquement « peu importe »", async () => {
    await userScoringService.create({
      missionAlertEnabled: false,
      answers: [
        { taxonomy: "domaine_engagement", value: "sport" },
        { taxonomy: "equipe", value: "peu_importe" },
        { taxonomy: "interaction", value: "peu_importe" },
      ],
    });

    expect(persistedKeys()).toContain("domaine_engagement.sport");
    expect(persistedKeys()).not.toContain("equipe.peu_importe");
    expect(persistedKeys()).not.toContain("interaction.peu_importe");
  });

  it("conserve les valeurs enrichable:false porteuses de signal (indemnisation)", async () => {
    await userScoringService.create({
      missionAlertEnabled: false,
      answers: [
        { taxonomy: "motivation_recherche", value: "indemnisation" },
        { taxonomy: "motivation_recherche", value: "autre" },
      ],
    });

    expect(persistedKeys()).toContain("motivation_recherche.indemnisation");
    expect(persistedKeys()).toContain("dispositif.service_civique");
  });

  it("accepte un payload entièrement neutre sans géo (scoring sans valeur, pas de 400)", async () => {
    await expect(
      userScoringService.create({
        missionAlertEnabled: false,
        answers: [
          { taxonomy: "equipe", value: "peu_importe" },
          { taxonomy: "rythme", value: "je_ne_sais_pas" },
        ],
      })
    ).resolves.toEqual({ id: "user-scoring-1" });

    const arg = createMock.mock.calls[0][0];
    expect(arg.values).toEqual([]);
    expect(arg.geo).toBeUndefined();
  });

  it("crée quand même la géolocalisation quand toutes les réponses taxonomiques sont neutres", async () => {
    await userScoringService.create({
      missionAlertEnabled: false,
      answers: [
        { taxonomy: "autonomie", value: "je_ne_sais_pas" },
        { taxonomy: "location", params: { lat: 48.85, lon: 2.35 } },
      ],
    });

    const arg = createMock.mock.calls[0][0];
    expect(arg.values).toEqual([]);
    expect(arg.geo).toMatchObject({ lat: 48.85, lon: 2.35 });
  });
});

describe("userScoringService.create — dispositifs déduits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue({ id: "user-scoring-1" } as Awaited<ReturnType<typeof userScoringRepository.create>>);
  });

  it.each([16, 17, 18, 25])("ajoute le Service Civique pour un utilisateur de %i ans", async (age) => {
    await userScoringService.create({
      missionAlertEnabled: false,
      answers: [{ taxonomy: "tranche_age", params: { age } }],
    });

    expect(persistedKeys()).toContain("dispositif.service_civique");
  });

  it("n'ajoute pas le Service Civique après 25 ans", async () => {
    await userScoringService.create({
      missionAlertEnabled: false,
      answers: [{ taxonomy: "tranche_age", params: { age: 26 } }],
    });

    expect(persistedKeys()).not.toContain("dispositif.service_civique");
  });

  it("ne duplique pas une valeur Service Civique déjà présente", async () => {
    await userScoringService.create({
      missionAlertEnabled: false,
      answers: [
        { taxonomy: "tranche_age", params: { age: 17 } },
        { taxonomy: "dispositif", value: "service_civique" },
      ],
    });

    expect(persistedKeys().filter((key) => key === "dispositif.service_civique")).toHaveLength(1);
  });

  it("garde un score de 1 lorsque plusieurs règles convergent vers le même dispositif", async () => {
    await userScoringService.create({
      missionAlertEnabled: false,
      answers: [
        { taxonomy: "tranche_age", params: { age: 17 } },
        { taxonomy: "motivation_recherche", value: "premiere_experience" },
      ],
    });

    expect(persistedValues()).toEqual(
      expect.arrayContaining([
        { taxonomyKey: "dispositif", valueKey: "service_civique", score: 1 },
        { taxonomyKey: "dispositif", valueKey: "benevolat", score: 1 },
      ])
    );
  });

  it("garde un score de 1 pour une affinité explicitement fournie", async () => {
    await userScoringService.create({
      missionAlertEnabled: false,
      answers: [
        { taxonomy: "tranche_age", params: { age: 17 } },
        { taxonomy: "motivation_recherche", value: "premiere_experience" },
        { taxonomy: "dispositif", value: "service_civique" },
      ],
    });

    expect(persistedValues()).toContainEqual({ taxonomyKey: "dispositif", valueKey: "service_civique", score: 1 });
  });

  it("conserve les signaux thématiques et ajoute les affinités du domaine sécurité", async () => {
    await userScoringService.create({
      missionAlertEnabled: false,
      answers: [
        { taxonomy: "domaine_engagement", value: "securite_secours" },
        { taxonomy: "activite", value: "secourir_proteger" },
      ],
    });

    expect(persistedKeys()).toEqual([
      "domaine_engagement.securite_secours",
      "activite.secourir_proteger",
      "dispositif.sapeurs_pompiers",
      "dispositif.reserve_gendarmerie",
      "dispositif.reserve_police_nationale",
    ]);
  });
});
