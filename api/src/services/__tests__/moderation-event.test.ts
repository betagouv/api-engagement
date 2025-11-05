import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { Mission, User } from "../../types";
import type { ModerationEventRecord } from "../../types/moderation-event";
import { moderationEventService } from "../moderation-event";

const buildId = (value: string) =>
  ({
    toString: () => value,
  }) as { toString(): string };

describe("moderationEventService.logModeration", () => {
  const moderatorId = "moderator-123";
  const user = {
    _id: buildId("user-1"),
    firstname: "Alice",
    lastname: "Doe",
  } as unknown as User;

  let createEventSpy: MockInstance<typeof moderationEventService.createModerationEvent>;

  beforeEach(() => {
    createEventSpy = vi.spyOn(moderationEventService, "createModerationEvent");
    createEventSpy.mockResolvedValue({} as unknown as ModerationEventRecord);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs status changes with base metadata", async () => {
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

    await moderationEventService.logModeration(previous, update, user, moderatorId);

    expect(createEventSpy).toHaveBeenCalledTimes(1);
    expect(createEventSpy).toHaveBeenCalledWith({
      moderatorId,
      missionId: "mission-1",
      userId: "user-1",
      userName: "Alice Doe",
      initialStatus: "PENDING",
      newStatus: "ACCEPTED",
    });
  });

  it("captures comment changes when a moderator adds a comment", async () => {
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

    await moderationEventService.logModeration(previous, update, user, moderatorId);

    expect(createEventSpy).toHaveBeenCalledTimes(1);
    expect(createEventSpy).toHaveBeenCalledWith({
      moderatorId,
      missionId: "mission-2",
      userId: "user-1",
      userName: "Alice Doe",
      initialComment: null,
      newComment: "New comment from moderator",
    });
  });

  it("uses the mission title as the initial title when no previous moderator title exists", async () => {
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

    await moderationEventService.logModeration(previous, update, user, moderatorId);

    expect(createEventSpy).toHaveBeenCalledTimes(1);
    expect(createEventSpy).toHaveBeenCalledWith({
      moderatorId,
      missionId: "mission-3",
      userId: "user-1",
      userName: "Alice Doe",
      initialTitle: "Public Mission Title",
      newTitle: "New Moderator Title",
    });
  });

  it("records siren and RNA changes when identifiers are updated", async () => {
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

    await moderationEventService.logModeration(previous, update, user, moderatorId);

    expect(createEventSpy).toHaveBeenCalledTimes(1);
    expect(createEventSpy).toHaveBeenCalledWith({
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
