import { describe, expect, it } from "vitest";
import { AddressItem, MissionRecord } from "../../types";
import { getMissionChanges } from "../mission";

describe("getMissionChanges", () => {
  const createBaseMission = (): MissionRecord =>
    ({
      publisherId: "test-publisher",
      title: "Test title",
      description: "Test description",
    }) as MissionRecord;

  it("should return null when missions are identical", () => {
    const mission1 = createBaseMission();
    const mission2 = createBaseMission();

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toBeNull();
  });

  it("should detect string field changes", () => {
    const mission1 = createBaseMission();
    const mission2 = { ...createBaseMission(), title: "Updated Title" };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      title: {
        previous: "Test Mission",
        current: "Updated Title",
      },
    });
  });

  it("should detect multiple string field changes", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      title: "Updated Title",
      description: "Updated description",
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      title: {
        previous: "Test Mission",
        current: "Updated Title",
      },
      description: {
        previous: "Test description",
        current: "Updated description",
      },
    });
  });

  it("should detect date field changes", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      startAt: new Date("2023-03-01"),
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      startAt: {
        previous: new Date("2023-02-01"),
        current: new Date("2023-03-01"),
      },
    });
  });

  it("should detect array field changes", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      tags: ["tag1", "tag3"],
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      tags: {
        previous: ["tag1", "tag2"],
        current: ["tag1", "tag3"],
      },
    });
  });

  it("should detect when arrays have same elements but different order", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      tags: ["tag2", "tag1"], // Same elements, different order
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toBeNull(); // Should be null because arrays are equivalent when sorted
  });

  it("should detect address changes when length differs", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      addresses: [
        ...mission1.addresses,
        {
          street: "456 Another St",
          postalCode: "75002",
          departmentName: "Paris",
          departmentCode: "75",
          city: "Paris",
          region: "Île-de-France",
          country: "France",
          location: {
            lat: 48.8566,
            lon: 2.3522,
          },
          geolocStatus: "ENRICHED_BY_API",
        } as AddressItem,
      ],
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      addresses: {
        previous: mission1.addresses,
        current: mission2.addresses,
      },
    });
  });

  it("should detect address content changes", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      addresses: [
        {
          ...mission1.addresses[0],
          street: "456 Different St",
        },
      ],
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      addresses: {
        previous: mission1.addresses,
        current: mission2.addresses,
      },
    });
  });

  it("should not detect address content changes when order is different", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      addresses: [mission1.addresses[1], mission1.addresses[0]],
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toBeNull();
  });

  it("should handle undefined and null values", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      endAt: null,
      metadata: "",
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      endAt: {
        previous: new Date("2023-03-01"),
        current: null,
      },
      metadata: {
        previous: "test metadata",
        current: "",
      },
    });
  });

  it("should handle date strings and Date objects equivalently", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      startAt: "2023-02-01" as any, // Same date as string
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toBeNull(); // Should be null because dates are equivalent
  });
});
