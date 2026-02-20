import { describe, expect, it } from "vitest";

import { PUBLISHER_IDS } from "../../../../src/config";
import { prismaCore } from "../../../../src/db/postgres";
import { ModerationHandler } from "../../../../src/jobs/moderation/handler";
import { createTestMission, createTestPublisher } from "../../../fixtures";

/**
 * Moderation job integration tests
 * Tests automatic JVA moderation rules applied by the recurring job.
 *
 * Important: createTestMission() always creates a MissionModerationStatus with
 * publisherId = PUBLISHER_IDS.JEVEUXAIDER and status = "PENDING" by default.
 * We use moderationStatus overrides to pre-seed different states.
 */
describe("Moderation job (integration test)", () => {
  const handler = new ModerationHandler();

  // Helper: create the JVA publisher with a partner publisher
  const setupJva = async () => {
    const partner = await createTestPublisher();
    const jva = await createTestPublisher({
      id: PUBLISHER_IDS.JEVEUXAIDER,
      moderator: true,
      publishers: [{ diffuseurPublisherId: partner.id }],
    });
    return { jva, partner };
  };

  // Helper: create a mission that passes all JVA rules (factory auto-creates PENDING status for JVA)
  const createValidMission = async (publisherId: string, overrides: Record<string, any> = {}) => {
    const future = new Date();
    future.setMonth(future.getMonth() + 3);
    const farFuture = new Date();
    farFuture.setMonth(farFuture.getMonth() + 6);

    return createTestMission({
      publisherId,
      statusCode: "ACCEPTED",
      description: "A".repeat(350),
      city: "Paris",
      startAt: future,
      endAt: farFuture,
      ...overrides,
    });
  };

  describe("findMissions() filtering", () => {
    it("should only process missions with statusCode=ACCEPTED (not REFUSED)", { timeout: 15000 }, async () => {
      const { partner } = await setupJva();

      // REFUSED mission → factory still creates a PENDING moderation status, but findMissions
      // filters on statusCode, so this mission is excluded
      const refusedMission = await createTestMission({ publisherId: partner.id, statusCode: "REFUSED" });
      const acceptedMission = await createValidMission(partner.id);

      // Temporarily remove the moderation status created by the factory for the accepted mission
      // so we can observe the job picking it up as "no prior status"
      await prismaCore.missionModerationStatus.deleteMany({ where: { missionId: acceptedMission.id } });
      await prismaCore.missionModerationStatus.deleteMany({ where: { missionId: refusedMission.id } });

      await handler.handle();

      // Only the ACCEPTED mission should have gotten a moderation status from the job
      const statuses = await prismaCore.missionModerationStatus.findMany({ where: { publisherId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(statuses).toHaveLength(1);
      expect(statuses[0].missionId).toBe(acceptedMission.id);
    });

    it("should exclude deleted missions", async () => {
      const { partner } = await setupJva();

      const deletedMission = await createTestMission({ publisherId: partner.id, statusCode: "ACCEPTED", deleted: true });
      await prismaCore.missionModerationStatus.deleteMany({ where: { missionId: deletedMission.id } });

      await handler.handle();

      const statuses = await prismaCore.missionModerationStatus.findMany({ where: { publisherId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(statuses).toHaveLength(0);
    });

    it("should process missions that have no moderation status yet", async () => {
      const { partner } = await setupJva();
      const mission = await createValidMission(partner.id);

      // Remove the status created by the factory to simulate a "new" mission
      await prismaCore.missionModerationStatus.deleteMany({ where: { missionId: mission.id } });

      await handler.handle();

      const statuses = await prismaCore.missionModerationStatus.findMany({ where: { publisherId: PUBLISHER_IDS.JEVEUXAIDER, missionId: mission.id } });
      expect(statuses).toHaveLength(1);
    });

    it("should process missions with an existing PENDING moderation status", async () => {
      const { partner } = await setupJva();
      // Factory creates PENDING status automatically → mission is eligible
      const mission = await createValidMission(partner.id, { description: "A".repeat(10) }); // triggers a rule change

      const result = await handler.handle();

      expect(result.success).toBe(true);
      const status = await prismaCore.missionModerationStatus.findFirst({ where: { missionId: mission.id, publisherId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(status?.status).toBe("REFUSED");
    });

    it("should not process missions with ACCEPTED moderation status", async () => {
      const { partner } = await setupJva();
      const mission = await createValidMission(partner.id);

      // Override the factory-created PENDING status to ACCEPTED
      await prismaCore.missionModerationStatus.updateMany({
        where: { missionId: mission.id, publisherId: PUBLISHER_IDS.JEVEUXAIDER },
        data: { status: "ACCEPTED" },
      });

      await handler.handle();

      // Status should remain ACCEPTED
      const status = await prismaCore.missionModerationStatus.findFirst({ where: { missionId: mission.id, publisherId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(status?.status).toBe("ACCEPTED");
    });

    it("should not process missions from publishers not partnered with JVA", async () => {
      await setupJva();
      const unrelatedPublisher = await createTestPublisher();
      const mission = await createValidMission(unrelatedPublisher.id);

      // Remove the JVA moderation status created by the factory
      await prismaCore.missionModerationStatus.deleteMany({ where: { missionId: mission.id } });

      await handler.handle();

      const statuses = await prismaCore.missionModerationStatus.findMany({ where: { publisherId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(statuses).toHaveLength(0);
    });
  });

  describe("automatic refusal rules", () => {
    it("should refuse a mission created more than 6 months ago", async () => {
      const { partner } = await setupJva();
      const mission = await createValidMission(partner.id);

      // Backdate the mission creation (factory createdAt support)
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
      await prismaCore.mission.update({ where: { id: mission.id }, data: { createdAt: sevenMonthsAgo } });

      await handler.handle();

      const status = await prismaCore.missionModerationStatus.findFirst({ where: { missionId: mission.id, publisherId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(status?.status).toBe("REFUSED");
      expect(status?.comment).toBe("MISSION_CREATION_DATE_TOO_OLD");
    });

    it("should refuse a mission with start in less than 7 days and end in less than 21 days", async () => {
      const { partner } = await setupJva();

      const startAt = new Date();
      startAt.setDate(startAt.getDate() + 3);
      const endAt = new Date();
      endAt.setDate(endAt.getDate() + 10);

      const mission = await createValidMission(partner.id, { startAt, endAt });

      await handler.handle();

      const status = await prismaCore.missionModerationStatus.findFirst({ where: { missionId: mission.id, publisherId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(status?.status).toBe("REFUSED");
      expect(status?.comment).toBe("MISSION_DATE_NOT_COMPATIBLE");
    });

    it("should not refuse a mission with start in less than 7 days when end is beyond 21 days", async () => {
      const { partner } = await setupJva();

      const startAt = new Date();
      startAt.setDate(startAt.getDate() + 3);
      const endAt = new Date();
      endAt.setDate(endAt.getDate() + 30);

      const mission = await createValidMission(partner.id, { startAt, endAt });

      await handler.handle();

      const status = await prismaCore.missionModerationStatus.findFirst({ where: { missionId: mission.id, publisherId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(status?.status).toBe("PENDING");
    });

    it("should refuse a mission with a description shorter than 300 characters", async () => {
      const { partner } = await setupJva();
      const mission = await createValidMission(partner.id, { description: "Trop courte" });

      await handler.handle();

      const status = await prismaCore.missionModerationStatus.findFirst({ where: { missionId: mission.id, publisherId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(status?.status).toBe("REFUSED");
      expect(status?.comment).toBe("CONTENT_INSUFFICIENT");
    });

    it("should keep PENDING for a valid mission that passes all rules (no change)", async () => {
      const { partner } = await setupJva();
      const mission = await createValidMission(partner.id);

      await handler.handle();

      const status = await prismaCore.missionModerationStatus.findFirst({ where: { missionId: mission.id, publisherId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(status?.status).toBe("PENDING");
      expect(status?.comment).toBeNull();
    });

    it("should apply the creation date rule before the description rule (rule priority)", async () => {
      const { partner } = await setupJva();

      // Mission old + short description: should be refused for date (first rule evaluated)
      const mission = await createValidMission(partner.id, { description: "Courte" });
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
      await prismaCore.mission.update({ where: { id: mission.id }, data: { createdAt: sevenMonthsAgo } });

      await handler.handle();

      const status = await prismaCore.missionModerationStatus.findFirst({ where: { missionId: mission.id, publisherId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(status?.status).toBe("REFUSED");
      expect(status?.comment).toBe("MISSION_CREATION_DATE_TOO_OLD");
    });
  });

  describe("audit trail (ModerationEvent)", () => {
    it("should create an event when a mission transitions from PENDING to REFUSED", async () => {
      const { partner } = await setupJva();
      // Short description → will trigger REFUSED (change from factory-created PENDING)
      const mission = await createValidMission(partner.id, { description: "Trop courte" });

      await handler.handle();

      const events = await prismaCore.moderationEvent.findMany({ where: { moderatorId: PUBLISHER_IDS.JEVEUXAIDER, missionId: mission.id } });
      expect(events).toHaveLength(1);
      expect(events[0].initialStatus).toBe("PENDING");
      expect(events[0].newStatus).toBe("REFUSED");
      expect(events[0].userName).toBe("Modération automatique");
    });

    it("should create a refusal event with a note containing mission details", async () => {
      const { partner } = await setupJva();
      const mission = await createValidMission(partner.id, { description: "Trop courte" });

      await handler.handle();

      const event = await prismaCore.moderationEvent.findFirst({ where: { moderatorId: PUBLISHER_IDS.JEVEUXAIDER, missionId: mission.id } });
      expect(event?.newStatus).toBe("REFUSED");
      expect(event?.newComment).toBe("CONTENT_INSUFFICIENT");
      expect(event?.newNote).toContain("Data de la mission refusée");
    });

    it("should not create an event when PENDING status is unchanged (no rule triggered)", async () => {
      const { partner } = await setupJva();
      // Valid mission → factory creates PENDING → job computes PENDING → no change → no event
      const mission = await createValidMission(partner.id);

      await handler.handle();

      const events = await prismaCore.moderationEvent.findMany({ where: { moderatorId: PUBLISHER_IDS.JEVEUXAIDER, missionId: mission.id } });
      expect(events).toHaveLength(0);
    });

    it("should create events for multiple refused missions in one run", async () => {
      const { partner } = await setupJva();
      const mission1 = await createValidMission(partner.id, { description: "Courte 1" });
      const mission2 = await createValidMission(partner.id, { description: "Courte 2" });

      await handler.handle();

      const events = await prismaCore.moderationEvent.findMany({ where: { moderatorId: PUBLISHER_IDS.JEVEUXAIDER } });
      expect(events).toHaveLength(2);
      const missionIds = events.map((e) => e.missionId);
      expect(missionIds).toContain(mission1.id);
      expect(missionIds).toContain(mission2.id);
    });
  });

  describe("job result statistics", () => {
    it("should return success=true with no missions message when nothing to process", async () => {
      await setupJva();

      const result = await handler.handle();

      expect(result.success).toBe(true);
      expect(result.message).toContain("No missions found");
    });

    it("should return accurate refused and pending counts", async () => {
      const { partner } = await setupJva();

      // 2 missions that pass all rules → PENDING (no change from factory state, so pending = 0 in stats)
      // 2 missions with short descriptions → REFUSED (change from PENDING → REFUSED)
      await createValidMission(partner.id);
      await createValidMission(partner.id);
      const refused1 = await createValidMission(partner.id, { description: "Courte" });
      const refused2 = await createValidMission(partner.id, { description: "Courte aussi" });

      const result = await handler.handle();

      expect(result.success).toBe(true);
      expect(result.moderators).toHaveLength(1);
      // refused = 2 (these changed status)
      expect(result.moderators![0].refused).toBe(2);
      // created vs updated: both were PENDING already (factory), now updated to REFUSED
      expect(result.moderators![0].updated).toBe(2);
      // events = 2 (one per refused mission that changed)
      expect(result.moderators![0].events).toBe(2);

      // Verify in DB
      const status1 = await prismaCore.missionModerationStatus.findFirst({ where: { missionId: refused1.id } });
      const status2 = await prismaCore.missionModerationStatus.findFirst({ where: { missionId: refused2.id } });
      expect(status1?.status).toBe("REFUSED");
      expect(status2?.status).toBe("REFUSED");
    });
  });
});
