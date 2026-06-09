import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/db/postgres";
import { asyncTaskBus } from "@/services/async-task";
import { missionService } from "@/services/mission";
import { createTestMission } from "../../fixtures";

describe("missionService mutation effects", () => {
  it("creates a create mission_event and publishes enrichment on creation", async () => {
    const mission = await createTestMission();

    const event = await prisma.missionEvent.findFirst({ where: { missionId: mission.id, type: "create" } });

    expect(event).toBeDefined();
    expect(event?.changes).toBeNull();
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({ type: "mission.enrichment", payload: { missionId: mission.id } });
  });

  it("does not create an event or publish enrichment when the patch changes nothing", async () => {
    const mission = await createTestMission({ places: 10 });
    vi.clearAllMocks();

    await missionService.update(mission.id, { places: 10 });

    const events = await prisma.missionEvent.findMany({ where: { missionId: mission.id, type: "update" } });
    expect(events).toHaveLength(0);
    expect(asyncTaskBus.publish).not.toHaveBeenCalledWith(expect.objectContaining({ type: "mission.enrichment" }));
  });

  it("creates an update event and publishes enrichment when a prompt field changes", async () => {
    const mission = await createTestMission({ title: "Titre initial" });
    vi.clearAllMocks();

    await missionService.update(mission.id, { title: "Titre modifié" });

    const event = await prisma.missionEvent.findFirst({ where: { missionId: mission.id, type: "update" } });
    expect(event?.changes).toMatchObject({ title: { previous: "Titre initial", current: "Titre modifié" } });
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({ type: "mission.enrichment", payload: { missionId: mission.id } });
  });

  it("publishes enrichment when tasks change", async () => {
    const mission = await createTestMission({ tasks: ["Ancienne tâche"] });
    vi.clearAllMocks();

    await missionService.update(mission.id, { tasks: ["Nouvelle tâche"] });

    const event = await prisma.missionEvent.findFirst({ where: { missionId: mission.id, type: "update" } });
    expect(event?.changes).toMatchObject({ tasks: { previous: ["Ancienne tâche"], current: ["Nouvelle tâche"] } });
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({ type: "mission.enrichment", payload: { missionId: mission.id } });
  });

  it("creates an update event without enrichment when only non-prompt fields change", async () => {
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

  it("creates a delete event and publishes enrichment when deletedAt is set", async () => {
    const mission = await createTestMission({ deletedAt: null });
    const deletedAt = new Date("2026-06-01T00:00:00.000Z");
    vi.clearAllMocks();

    await missionService.update(mission.id, { deletedAt });

    const event = await prisma.missionEvent.findFirst({ where: { missionId: mission.id, type: "delete" } });
    expect(event?.changes).toMatchObject({ deletedAt: { previous: null, current: deletedAt.toISOString() } });
    expect(asyncTaskBus.publish).toHaveBeenCalledWith({ type: "mission.enrichment", payload: { missionId: mission.id } });
  });
});
