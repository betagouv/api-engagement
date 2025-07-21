import { describe, expect, it } from "vitest";
import { missionsAreEqual } from "../mission";

const baseMission = {
  title: "Ma mission",
  description: "Description de ma mission",
  addresses: [
    {
      street: "1 rue de Paris",
      city: "Paris",
      geoPoint: { type: "Point", coordinates: [2.3, 48.8] },
    },
  ],
  tags: ["écologie", "solidarité"],
  requirements: ["compétence 1", "compétence 2"],
  statusCommentHistoric: [],
};

describe("missionsAreEqual", () => {
  it("Returns true if all fields are identical", () => {
    const a = { ...baseMission };
    const b = { ...baseMission };
    expect(missionsAreEqual(a, b)).toBe(true);
  });

  it("Ignores non-fields properties", () => {
    const a = { ...baseMission, notAField: 123 };
    const b = { ...baseMission, notAField: 456 };
    expect(missionsAreEqual(a, b)).toBe(true);
  });

  it("Treats [] and undefined as equal for arrays", () => {
    const a = { ...baseMission, tags: undefined, requirements: [] };
    const b = { ...baseMission, tags: [], requirements: undefined };
    expect(missionsAreEqual(a, b)).toBe(true);
  });

  it("Ignores _id in addresses and nested geoPoint", () => {
    const a = {
      ...baseMission,
      addresses: [
        {
          street: "1 rue de Paris",
          city: "Paris",
          geoPoint: { type: "Point", coordinates: [2.3, 48.8], _id: "monId" },
          _id: "monAutreId",
        },
      ],
    };
    const b = {
      ...baseMission,
      addresses: [
        {
          street: "1 rue de Paris",
          city: "Paris",
          geoPoint: { type: "Point", coordinates: [2.3, 48.8] },
        },
      ],
    };
    expect(missionsAreEqual(a, b)).toBe(true);
  });

  it("Returns false if a field is different", () => {
    const a = { ...baseMission, title: "A" };
    const b = { ...baseMission, title: "B" };
    expect(missionsAreEqual(a, b)).toBe(false);
  });

  it("Returns false if a nested field is different", () => {
    const a = { ...baseMission, addresses: [{ ...baseMission.addresses[0], street: "A" }] };
    const b = { ...baseMission, addresses: [{ ...baseMission.addresses[0], street: "B" }] };
    expect(missionsAreEqual(a, b)).toBe(false);
  });
});
