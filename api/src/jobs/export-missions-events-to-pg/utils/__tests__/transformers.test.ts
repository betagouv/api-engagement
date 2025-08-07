import { MissionHistoryEventType } from "@prisma/client";
import { Schema } from "mongoose";
import { describe, expect, it } from "vitest";
import { PUBLISHER_IDS } from "../../../../config";
import { MissionEvent as MongoMissionEvent } from "../../../../types";
import { transformMongoMissionEventToPg } from "../transformers";

// Transform ID to fake Mongo ObjectId
const randomObjectId = (id: string) =>
  ({
    toString: () => id,
  }) as unknown as Schema.Types.ObjectId;

describe("transformMongoMissionEventToPg", () => {
  const baseMissionEvent: MongoMissionEvent = {
    _id: randomObjectId("event-123"),
    type: "create",
    missionId: randomObjectId("mission-123"),
    changes: null,
    fields: [],
    createdAt: new Date("2023-01-15"),
    lastExportedToPgAt: null,
  };

  it("should return null if missionEvent is null", () => {
    const result = transformMongoMissionEventToPg(null as unknown as MongoMissionEvent, "mission-123");
    expect(result).toBeNull();
  });

  it("should return null if missionId is null", () => {
    const result = transformMongoMissionEventToPg(baseMissionEvent, "");
    expect(result).toBeNull();
  });

  it("should transform a create event", () => {
    const createEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "create",
    };

    const result = transformMongoMissionEventToPg(createEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.Created);
    expect(result?.[0].mission_id).toBe("mission-123");
    expect(result?.[0].date).toEqual(new Date("2023-01-15"));
    expect(result?.[0].changes).toBeNull();
  });

  it("should transform a delete event", () => {
    const deleteEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "delete",
    };

    const result = transformMongoMissionEventToPg(deleteEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.Deleted);
    expect(result?.[0].mission_id).toBe("mission-123");
    expect(result?.[0].date).toEqual(new Date("2023-01-15"));
    expect(result?.[0].changes).toBeNull();
  });

  it("should transform an update event with startAt change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "update",
      changes: {
        startAt: {
          previous: new Date("2023-01-01"),
          current: new Date("2023-02-01"),
        },
      },
      fields: ["startAt"],
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedStartDate);
    expect(result?.[0].changes).toEqual({
      start_at: {
        previous: new Date("2023-01-01"),
        current: new Date("2023-02-01"),
      },
    });
  });

  it("should transform an update event with endAt change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "update",
      changes: {
        endAt: {
          previous: new Date("2023-03-01"),
          current: new Date("2023-04-01"),
        },
      },
      fields: ["endAt"],
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedEndDate);
    expect(result?.[0].changes).toEqual({
      end_at: {
        previous: new Date("2023-03-01"),
        current: new Date("2023-04-01"),
      },
    });
  });

  it("should transform an update event with description change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "update",
      changes: {
        description: {
          previous: "Old description",
          current: "New description",
        },
      },
      fields: ["description"],
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedDescription);
    expect(result?.[0].changes).toEqual({
      description: {
        previous: "Old description",
        current: "New description",
      },
    });
  });

  it("should transform an update event with descriptionHtml change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "update",
      changes: {
        descriptionHtml: {
          previous: "<p>Old description</p>",
          current: "<p>New description</p>",
        },
      },
      fields: ["descriptionHtml"],
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedDescription);
    expect(result?.[0].changes).toEqual({
      description_html: {
        previous: "<p>Old description</p>",
        current: "<p>New description</p>",
      },
    });
  });

  it("should transform an update event with domain change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "update",
      changes: {
        domain: {
          previous: "Old domain",
          current: "New domain",
        },
      },
      fields: ["domain"],
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedActivityDomain);
    expect(result?.[0].changes).toEqual({
      domain: {
        previous: "Old domain",
        current: "New domain",
      },
    });
  });

  it("should transform an update event with places change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "update",
      changes: {
        places: {
          previous: 5,
          current: 10,
        },
      },
      fields: ["places"],
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedPlaces);
    expect(result?.[0].changes).toEqual({
      places: {
        previous: 5,
        current: 10,
      },
    });
  });

  it("should transform an update event with JVA moderation status change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "update",
      changes: {
        [`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`]: {
          previous: "PENDING",
          current: "ACCEPTED",
        },
      },
      fields: [`moderation_${PUBLISHER_IDS.JEVEUXAIDER}_status`],
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedJVAModerationStatus);
    expect(result?.[0].changes).toEqual({
      jva_moderation_status: {
        previous: "PENDING",
        current: "ACCEPTED",
      },
    });
  });

  it("should transform an update event with status change", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "update",
      changes: {
        statusCode: {
          previous: "PENDING",
          current: "ACCEPTED",
        },
        status: {
          previous: "PENDING",
          current: "ACCEPTED",
        },
      },
      fields: ["statusCode"],
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedApiEngModerationStatus);
    expect(result?.[0].changes).toEqual({
      status: {
        previous: "PENDING",
        current: "ACCEPTED",
      },
    });
  });

  it("should transform an update event with multiple changes", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "update",
      changes: {
        startAt: {
          previous: new Date("2023-01-01"),
          current: new Date("2023-02-01"),
        },
        description: {
          previous: "Old description",
          current: "New description",
        },
        places: {
          previous: 5,
          current: 10,
        },
      },
      fields: ["startAt", "description", "places"],
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(3);
    expect(result?.map((e) => e.type)).toContain(MissionHistoryEventType.UpdatedStartDate);
    expect(result?.map((e) => e.type)).toContain(MissionHistoryEventType.UpdatedDescription);
    expect(result?.map((e) => e.type)).toContain(MissionHistoryEventType.UpdatedPlaces);
  });

  it("should transform an update event with other changes", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "update",
      changes: {
        title: {
          previous: "Old title",
          current: "New title",
        },
        activity: {
          previous: "Old activity",
          current: "New activity",
        },
      },
      fields: ["title", "activity"],
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).not.toBeNull();
    expect(result?.length).toBe(1);
    expect(result?.[0].type).toBe(MissionHistoryEventType.UpdatedOther);
    expect(result?.[0].changes).toEqual({
      title: {
        previous: "Old title",
        current: "New title",
      },
      activity: {
        previous: "Old activity",
        current: "New activity",
      },
    });
  });

  it("should return empty array for update event with no changes", () => {
    const updateEvent: MongoMissionEvent = {
      ...baseMissionEvent,
      type: "update",
      changes: null,
      fields: [],
    };

    const result = transformMongoMissionEventToPg(updateEvent, "mission-123");

    expect(result).toEqual([]);
  });
});
