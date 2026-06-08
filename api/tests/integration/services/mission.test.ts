import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import { asyncTaskBus } from "@/services/async-task";
import { missionService } from "@/services/mission";
import { createTestMission } from "../../fixtures";

describe("missionService mutation effects", () => {
  it("crée un mission_event create et publie l'enrichissement à la création", async () => {
    const mission = await createTestMission();

    const event = await prisma.missionEvent.findFirst({ where: { missionId: mission.id, type: "create" } });

    expect(event).toBeDefined();
    expect(event?.changes).toBeNull();
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({ type: "mission.enrichment", payload: { missionId: mission.id } });
  });

  it("ne crée pas d'event et ne publie pas d'enrichissement si le patch ne change rien", async () => {
    const mission = await createTestMission({ places: 10 });
    vi.clearAllMocks();

    await missionService.update(mission.id, { places: 10 });

    const events = await prisma.missionEvent.findMany({ where: { missionId: mission.id, type: "update" } });
    expect(events).toHaveLength(0);
    expect(asyncTaskBus.publish).not.toHaveBeenCalledWith(expect.objectContaining({ type: "mission.enrichment" }));
  });

  it("crée un event update et publie l'enrichissement si un champ prompt change", async () => {
    const mission = await createTestMission({ title: "Titre initial" });
    vi.clearAllMocks();

    await missionService.update(mission.id, { title: "Titre modifié" });

    const event = await prisma.missionEvent.findFirst({ where: { missionId: mission.id, type: "update" } });
    expect(event?.changes).toMatchObject({ title: { previous: "Titre initial", current: "Titre modifié" } });
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({ type: "mission.enrichment", payload: { missionId: mission.id } });
  });

  it("crée un event update sans enrichissement si seuls des champs hors-prompt changent", async () => {
    const startAt = new Date("2026-01-01T00:00:00.000Z");
    const mission = await createTestMission({ places: 10, startAt });
    vi.clearAllMocks();

    await missionService.update(mission.id, { places: 12, startAt: new Date("2026-01-02T00:00:00.000Z") });

    const event = await prisma.missionEvent.findFirst({ where: { missionId: mission.id, type: "update" } });
    expect(event?.changes).toMatchObject({
      places: { previous: 10, current: 12 },
    });
    expect(asyncTaskBus.publish).not.toHaveBeenCalledWith(expect.objectContaining({ type: "mission.enrichment" }));
  });

  it("crée un event delete et publie l'enrichissement quand deletedAt est renseigné", async () => {
    const mission = await createTestMission({ deletedAt: null });
    const deletedAt = new Date("2026-06-01T00:00:00.000Z");
    vi.clearAllMocks();

    await missionService.update(mission.id, { deletedAt });

    const event = await prisma.missionEvent.findFirst({ where: { missionId: mission.id, type: "delete" } });
    expect(event?.changes).toMatchObject({ deletedAt: { previous: null, current: deletedAt.toISOString() } });
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({ type: "mission.enrichment", payload: { missionId: mission.id } });
  });

  it("publie l'enrichissement sans event quand seul le contexte d'enrichissement change", async () => {
    const mission = await createTestMission();
    vi.clearAllMocks();

    await missionService.handleEnrichmentContextChanged(mission.id);

    const events = await prisma.missionEvent.findMany({ where: { missionId: mission.id, type: "update" } });
    expect(events).toHaveLength(0);
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({ type: "mission.enrichment", payload: { missionId: mission.id } });
  });
});
