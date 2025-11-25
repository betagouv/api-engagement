import { describe, expect, it } from "vitest";
import type { Mission, UserRecord } from "../../types";
import { moderationEventService } from "../moderation-event";

const buildId = (value: string) =>
  ({
    toString: () => value,
  }) as { toString(): string };

describe("moderationEventService.buildModerationEventPayload", () => {
  const moderatorId = "moderator-123";
  const user = {
    id: "user-1",
    firstname: "Alice",
    lastname: "Doe",
  } as unknown as UserRecord;

  it("logs status changes with base metadata", () => {
    const previous = {
      _id: buildId("mission-1"),
      title: "Original Title",
      [`moderation_${moderatorId}_status`]: "PENDING",
      [`moderation_${moderatorId}_comment`]: "No change",
      [`moderation_${moderatorId}_note`]: "No change",
      [`moderation_${moderatorId}_title`]: "Custom Title",
      organizationSirenVerified: "SIREN-1",
      organizationRNAVerified: "RNA-1",
    } as unknown as Mission;
    const update = {
      _id: previous._id,
      title: previous.title,
      [`moderation_${moderatorId}_status`]: "ACCEPTED",
      [`moderation_${moderatorId}_comment`]: "No change",
      [`moderation_${moderatorId}_note`]: "No change",
      [`moderation_${moderatorId}_title`]: "Custom Title",
      organizationSirenVerified: "SIREN-1",
      organizationRNAVerified: "RNA-1",
    } as unknown as Mission;

    const payload = moderationEventService.buildModerationEventPayload(previous, update, user, moderatorId);

    expect(payload).toEqual({
      moderatorId,
      missionId: "mission-1",
      userId: "user-1",
      userName: "Alice Doe",
      initialStatus: "PENDING",
      newStatus: "ACCEPTED",
    });
  });

  it("captures comment changes when a moderator adds a comment", () => {
    const previous = {
      _id: buildId("mission-2"),
      title: "Mission Title",
      [`moderation_${moderatorId}_comment`]: null,
      organizationSirenVerified: undefined,
      organizationRNAVerified: undefined,
    } as unknown as Mission;
    const update = {
      _id: previous._id,
      title: previous.title,
      [`moderation_${moderatorId}_comment`]: "New comment from moderator",
      organizationSirenVerified: undefined,
      organizationRNAVerified: undefined,
    } as unknown as Mission;

    const payload = moderationEventService.buildModerationEventPayload(previous, update, user, moderatorId);

    expect(payload).toEqual({
      moderatorId,
      missionId: "mission-2",
      userId: "user-1",
      userName: "Alice Doe",
      initialComment: null,
      newComment: "New comment from moderator",
    });
  });

  it("uses the mission title as the initial title when no previous moderator title exists", () => {
    const previous = {
      _id: buildId("mission-3"),
      title: "Public Mission Title",
      organizationSirenVerified: undefined,
      organizationRNAVerified: undefined,
    } as unknown as Mission;
    const update = {
      _id: previous._id,
      title: previous.title,
      [`moderation_${moderatorId}_title`]: "New Moderator Title",
      organizationSirenVerified: undefined,
      organizationRNAVerified: undefined,
    } as unknown as Mission;

    const payload = moderationEventService.buildModerationEventPayload(previous, update, user, moderatorId);

    expect(payload).toEqual({
      moderatorId,
      missionId: "mission-3",
      userId: "user-1",
      userName: "Alice Doe",
      initialTitle: "Public Mission Title",
      newTitle: "New Moderator Title",
    });
  });

  it("records siren and RNA changes when identifiers are updated", () => {
    const previous = {
      _id: buildId("mission-4"),
      title: "Mission Title",
      organizationSirenVerified: "SIREN-OLD",
      organizationRNAVerified: undefined,
    } as unknown as Mission;
    const update = {
      _id: previous._id,
      title: previous.title,
      organizationSirenVerified: "SIREN-NEW",
      organizationRNAVerified: "RNA-NEW",
    } as unknown as Mission;

    const payload = moderationEventService.buildModerationEventPayload(previous, update, user, moderatorId);

    expect(payload).toEqual({
      moderatorId,
      missionId: "mission-4",
      userId: "user-1",
      userName: "Alice Doe",
      initialSiren: "SIREN-OLD",
      newSiren: "SIREN-NEW",
      initialRNA: null,
      newRNA: "RNA-NEW",
    });
  });
});
