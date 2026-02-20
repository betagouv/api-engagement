import { describe, expect, it } from "vitest";
import { getModerationEvents } from "../mission-moderation-status";
import type { MissionModerationRecord } from "../../types/mission-moderation-status";
import type { PublisherOrganization } from "../../db/core";

const baseMission = (): MissionModerationRecord => ({
  id: "mod-1",
  missionId: "mission-1",
  status: "PENDING",
  comment: null,
  note: null,
  title: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  missionClientId: "client-1",
  missionTitle: "Mission test",
  missionDescription: "Description de test",
  missionApplicationUrl: "https://example.com/apply",
  missionStartAt: null,
  missionEndAt: null,
  missionPostedAt: null,
  missionCity: "Paris",
  missionDepartmentCode: "75",
  missionDepartmentName: "Paris",
  missionPostalCode: "75001",
  missionPublisherId: "publisher-1",
  missionPublisherName: "Publisher test",
  missionDomain: null,
  missionPublisherOrganizationId: null,
  missionOrganizationName: null,
  missionOrganizationClientId: null,
  missionOrganizationSiren: null,
  missionOrganizationRNA: null,
  missionOrganizationSirenVerified: null,
  missionOrganizationRNAVerified: null,
});

describe("getModerationEvents", () => {
  describe("status changes", () => {
    it("should create one event when status changes", () => {
      const previous = baseMission();
      const updated = { ...previous, status: "ACCEPTED" as const };

      const events = getModerationEvents(previous, updated, null);

      expect(events).toHaveLength(1);
      expect(events[0].initialStatus).toBe("PENDING");
      expect(events[0].newStatus).toBe("ACCEPTED");
      expect(events[0].missionId).toBe("mission-1");
    });

    it("should include comment change in the status event when both change together", () => {
      const previous = baseMission();
      const updated = { ...previous, status: "REFUSED" as const, comment: "CONTENT_INSUFFICIENT" };

      const events = getModerationEvents(previous, updated, null);

      expect(events).toHaveLength(1);
      expect(events[0].newStatus).toBe("REFUSED");
      expect(events[0].newComment).toBe("CONTENT_INSUFFICIENT");
      expect(events[0].initialComment).toBeNull();
    });

    it("should create one event for comment change when status is unchanged", () => {
      const previous = { ...baseMission(), status: "REFUSED" as const, comment: "MISSION_DATE_NOT_COMPATIBLE" };
      const updated = { ...previous, comment: "CONTENT_INSUFFICIENT" };

      const events = getModerationEvents(previous, updated, null);

      expect(events).toHaveLength(1);
      expect(events[0].initialComment).toBe("MISSION_DATE_NOT_COMPATIBLE");
      expect(events[0].newComment).toBe("CONTENT_INSUFFICIENT");
      expect(events[0].initialStatus).toBeNull();
      expect(events[0].newStatus).toBeNull();
    });

    it("should return no event when nothing changes", () => {
      const mission = baseMission();
      const events = getModerationEvents(mission, { ...mission }, null);
      expect(events).toHaveLength(0);
    });
  });

  describe("title changes", () => {
    it("should create one event for title change", () => {
      const previous = baseMission();
      const updated = { ...previous, title: "Nouveau titre" };

      const events = getModerationEvents(previous, updated, null);

      expect(events).toHaveLength(1);
      expect(events[0].initialTitle).toBeNull();
      expect(events[0].newTitle).toBe("Nouveau titre");
    });
  });

  describe("note changes", () => {
    it("should create one event for note change", () => {
      const previous = baseMission();
      const updated = { ...previous, note: "Note interne" };

      const events = getModerationEvents(previous, updated, null);

      expect(events).toHaveLength(1);
      expect(events[0].initialNote).toBeNull();
      expect(events[0].newNote).toBe("Note interne");
    });
  });

  describe("multiple field changes", () => {
    it("should create multiple events when status and title both change", () => {
      const previous = baseMission();
      const updated = { ...previous, status: "ACCEPTED" as const, title: "Nouveau titre" };

      const events = getModerationEvents(previous, updated, null);

      expect(events).toHaveLength(2);
      const statusEvent = events.find((e) => e.newStatus !== null);
      const titleEvent = events.find((e) => e.newTitle !== null);
      expect(statusEvent).toBeDefined();
      expect(titleEvent).toBeDefined();
    });

    it("should create multiple events when status, title, and note all change", () => {
      const previous = baseMission();
      const updated = { ...previous, status: "REFUSED" as const, title: "Nouveau titre", note: "Note" };

      const events = getModerationEvents(previous, updated, null);

      expect(events).toHaveLength(3);
    });
  });

  describe("organization changes", () => {
    it("should create one event for SIREN verification change", () => {
      const previous = baseMission();
      const updated = { ...previous };
      const organizationUpdated = {
        id: "org-1",
        organizationSirenVerified: "123456789",
        organizationRNAVerified: null,
      } as unknown as PublisherOrganization;

      const events = getModerationEvents(previous, updated, organizationUpdated);

      expect(events).toHaveLength(1);
      expect(events[0].initialSiren).toBeNull();
      expect(events[0].newSiren).toBe("123456789");
    });

    it("should create one event for RNA verification change", () => {
      const previous = baseMission();
      const updated = { ...previous };
      const organizationUpdated = {
        id: "org-1",
        organizationSirenVerified: null,
        organizationRNAVerified: "W123456789",
      } as unknown as PublisherOrganization;

      const events = getModerationEvents(previous, updated, organizationUpdated);

      expect(events).toHaveLength(1);
      expect(events[0].initialRNA).toBeNull();
      expect(events[0].newRNA).toBe("W123456789");
    });

    it("should create two events when both SIREN and RNA change", () => {
      const previous = baseMission();
      const updated = { ...previous };
      const organizationUpdated = {
        id: "org-1",
        organizationSirenVerified: "123456789",
        organizationRNAVerified: "W123456789",
      } as unknown as PublisherOrganization;

      const events = getModerationEvents(previous, updated, organizationUpdated);

      expect(events).toHaveLength(2);
    });

    it("should not create an event when org values are unchanged", () => {
      const previous = { ...baseMission(), missionOrganizationSirenVerified: "123456789", missionOrganizationRNAVerified: "W123456789" };
      const updated = { ...previous };
      const organizationUpdated = {
        id: "org-1",
        organizationSirenVerified: "123456789",
        organizationRNAVerified: "W123456789",
      } as unknown as PublisherOrganization;

      const events = getModerationEvents(previous, updated, organizationUpdated);

      expect(events).toHaveLength(0);
    });
  });

  describe("event structure", () => {
    it("should always populate all nullable fields with null when not set", () => {
      const previous = baseMission();
      const updated = { ...previous, status: "ACCEPTED" as const };

      const events = getModerationEvents(previous, updated, null);

      expect(events[0]).toEqual(
        expect.objectContaining({
          missionId: "mission-1",
          initialStatus: "PENDING",
          newStatus: "ACCEPTED",
          initialComment: null,
          newComment: null,
          initialNote: null,
          newNote: null,
          initialTitle: null,
          newTitle: null,
          initialSiren: null,
          newSiren: null,
          initialRNA: null,
          newRNA: null,
        })
      );
    });
  });
});
