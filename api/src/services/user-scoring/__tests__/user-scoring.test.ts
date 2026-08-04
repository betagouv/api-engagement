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

const persistedKeys = (): string[] => {
  const arg = createMock.mock.calls[0][0];
  return (arg.values as PersistedValue[]).map((value) => `${value.taxonomyKey}.${value.valueKey}`);
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

    expect(persistedKeys()).toEqual(["rythme.plusieurs_jours_semaine"]);
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

    expect(persistedKeys()).toEqual(["domaine_engagement.sport"]);
  });

  it("conserve les valeurs enrichable:false porteuses de signal (indemnisation)", async () => {
    await userScoringService.create({
      missionAlertEnabled: false,
      answers: [
        { taxonomy: "motivation_recherche", value: "indemnisation" },
        { taxonomy: "motivation_recherche", value: "autre" },
      ],
    });

    expect(persistedKeys()).toEqual(["motivation_recherche.indemnisation"]);
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
